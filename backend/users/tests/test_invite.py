import uuid

from django.urls import reverse

from common.utils.tests import TestCaseUtils
from gifts.choices import GiftStatus
from gifts.models import GiftNotification
from model_bakery import baker
from pokemon.models import PokemonSpecies
from rest_framework.test import APIClient, APITestCase
from social.choices import FriendshipStatus
from social.models import Friendship

from ..models import User
from ..services.invite import (
    INVITE_CODE_LENGTH,
    apply_invite,
    find_inviter,
    generate_invite_code,
    generate_unique_invite_code,
    normalize_invite_code,
)


def _nickname() -> str:
    return f"u{uuid.uuid4().hex[:10]}"


def _ensure_species() -> PokemonSpecies:
    """Make sure at least one species exists so the gift can be sent."""
    species = PokemonSpecies.objects.first()
    if species is not None:
        return species
    return baker.make(
        PokemonSpecies,
        pokedex_id=1,
        name="bulbasaur",
        type_1="grass",
        base_hp=45,
        base_attack=49,
        base_defense=49,
        base_sp_attack=65,
        base_sp_defense=65,
        base_speed=45,
    )


class InviteCodeUtilsTest(TestCaseUtils):
    def test_generate_invite_code_uses_safe_alphabet(self):
        code = generate_invite_code()
        self.assertEqual(len(code), INVITE_CODE_LENGTH)
        forbidden = set("0O1IL")
        self.assertEqual(set(code) & forbidden, set())

    def test_generate_unique_invite_code_returns_unique_value(self):
        code = generate_unique_invite_code()
        self.assertFalse(User.objects.filter(invite_code=code).exists())

    def test_normalize_invite_code_uppercases_and_strips(self):
        self.assertEqual(normalize_invite_code("  abc23  "), "ABC23")
        self.assertEqual(normalize_invite_code(None), "")

    def test_create_user_auto_generates_invite_code(self):
        user = User.objects.create_user(
            email=f"{_nickname()}@test.com",
            password="12345678",
            nickname=_nickname(),
        )
        self.assertTrue(user.invite_code)
        self.assertEqual(len(user.invite_code), INVITE_CODE_LENGTH)
        # Test user from TestCaseUtils setUp also has one.
        self.assertTrue(self.user.invite_code)

    def test_find_inviter_is_case_insensitive(self):
        inviter = User.objects.create_user(
            email=f"{_nickname()}@test.com",
            password="12345678",
            nickname=_nickname(),
        )
        self.assertEqual(find_inviter(inviter.invite_code.lower()), inviter)
        self.assertEqual(find_inviter(f"  {inviter.invite_code}  "), inviter)
        self.assertIsNone(find_inviter(""))
        self.assertIsNone(find_inviter(None))
        self.assertIsNone(find_inviter("NOTREAL12"))


class ApplyInviteServiceTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        _ensure_species()
        self.inviter = self.user
        self.invitee = User.objects.create_user(
            email=f"{_nickname()}@test.com",
            password="12345678",
            nickname=_nickname(),
        )

    def test_apply_invite_links_user_and_sends_gift(self):
        result = apply_invite(self.invitee, self.inviter.invite_code)

        self.assertEqual(result, self.inviter)
        self.invitee.refresh_from_db()
        self.assertEqual(self.invitee.invited_by_id, self.inviter.pk)

        # Friendship created in ACCEPTED status.
        friendship = Friendship.objects.filter(
            from_user=self.invitee, to_user=self.inviter,
        ).first()
        self.assertIsNotNone(friendship)
        self.assertEqual(friendship.status, FriendshipStatus.ACCEPTED)

        # Gift was sent to the inviter on behalf of the invitee.
        gift = GiftNotification.objects.filter(
            sender=self.invitee, recipient=self.inviter,
        ).first()
        self.assertIsNotNone(gift)
        self.assertEqual(gift.status, GiftStatus.PENDING)
        self.assertEqual(gift.species_options.count(), 1)

    def test_apply_invite_is_idempotent(self):
        apply_invite(self.invitee, self.inviter.invite_code)
        apply_invite(self.invitee, self.inviter.invite_code)

        self.assertEqual(
            GiftNotification.objects.filter(recipient=self.inviter).count(), 1,
        )
        self.assertEqual(
            Friendship.objects.filter(
                from_user=self.invitee, to_user=self.inviter,
            ).count(),
            1,
        )

    def test_apply_invite_rejects_self_referral(self):
        result = apply_invite(self.inviter, self.inviter.invite_code)
        self.assertIsNone(result)
        self.assertIsNone(self.inviter.invited_by)
        self.assertFalse(
            GiftNotification.objects.filter(recipient=self.inviter).exists(),
        )

    def test_apply_invite_ignores_unknown_code(self):
        result = apply_invite(self.invitee, "NOPE9999")
        self.assertIsNone(result)
        self.invitee.refresh_from_db()
        self.assertIsNone(self.invitee.invited_by_id)

    def test_apply_invite_does_not_override_existing_blocked_friendship(self):
        Friendship.objects.create(
            from_user=self.inviter,
            to_user=self.invitee,
            status=FriendshipStatus.BLOCKED,
        )
        apply_invite(self.invitee, self.inviter.invite_code)

        friendship = Friendship.objects.get(
            from_user=self.inviter, to_user=self.invitee,
        )
        self.assertEqual(friendship.status, FriendshipStatus.BLOCKED)


class RegisterWithInviteTest(APITestCase):
    def setUp(self):
        _ensure_species()
        self.inviter = User.objects.create_user(
            email=f"{_nickname()}@test.com",
            password="12345678",
            nickname=_nickname(),
        )
        self.client = APIClient()

    def test_register_with_valid_invite_code(self):
        payload = {
            "email": f"{_nickname()}@test.com",
            "nickname": _nickname(),
            "password": "12345678",
            "invite_code": self.inviter.invite_code,
        }
        response = self.client.post(reverse("user-register"), data=payload)
        self.assertEqual(response.status_code, 201)

        new_user = User.objects.get(email=payload["email"])
        self.assertEqual(new_user.invited_by_id, self.inviter.pk)
        self.assertTrue(
            GiftNotification.objects.filter(
                sender=new_user, recipient=self.inviter,
            ).exists(),
        )
        self.assertTrue(
            Friendship.objects.filter(
                from_user=new_user,
                to_user=self.inviter,
                status=FriendshipStatus.ACCEPTED,
            ).exists(),
        )
        # invite_code is exposed in response so the new user can share their own.
        self.assertIn("invite_code", response.data)
        self.assertTrue(response.data["invite_code"])

    def test_register_with_unknown_invite_code_still_succeeds(self):
        payload = {
            "email": f"{_nickname()}@test.com",
            "nickname": _nickname(),
            "password": "12345678",
            "invite_code": "NOPE9999",
        }
        response = self.client.post(reverse("user-register"), data=payload)
        self.assertEqual(response.status_code, 201)
        new_user = User.objects.get(email=payload["email"])
        self.assertIsNone(new_user.invited_by_id)

    def test_register_without_invite_code_still_succeeds(self):
        payload = {
            "email": f"{_nickname()}@test.com",
            "nickname": _nickname(),
            "password": "12345678",
        }
        response = self.client.post(reverse("user-register"), data=payload)
        self.assertEqual(response.status_code, 201)
        new_user = User.objects.get(email=payload["email"])
        self.assertIsNone(new_user.invited_by_id)
        self.assertTrue(new_user.invite_code)


class InviteInfoEndpointTest(APITestCase):
    def setUp(self):
        self.inviter = User.objects.create_user(
            email=f"{_nickname()}@test.com",
            password="12345678",
            nickname=_nickname(),
        )
        self.client = APIClient()

    def test_invite_info_returns_inviter_summary(self):
        response = self.client.get(
            reverse("user-invite-info"),
            data={"code": self.inviter.invite_code},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["nickname"], self.inviter.nickname)
        self.assertEqual(response.data["id"], self.inviter.pk)
        self.assertIn("display_name", response.data)
        self.assertNotIn("email", response.data)

    def test_invite_info_404_for_unknown_code(self):
        response = self.client.get(
            reverse("user-invite-info"),
            data={"code": "NOPE9999"},
        )
        self.assertEqual(response.status_code, 404)

    def test_invite_info_404_for_blank_code(self):
        response = self.client.get(reverse("user-invite-info"))
        self.assertEqual(response.status_code, 404)
