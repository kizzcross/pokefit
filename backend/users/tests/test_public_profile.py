import uuid

from django.urls import reverse

from model_bakery import baker
from pokemon.models import PokemonSpecies, UserPokemon
from rest_framework.test import APIClient, APITestCase
from social.choices import FriendshipStatus
from social.models import Friendship

from ..models import User


def _nickname() -> str:
    return f"u{uuid.uuid4().hex[:10]}"


def _make_user(**kwargs) -> User:
    return User.objects.create_user(
        email=kwargs.pop("email", f"{_nickname()}@test.com"),
        password=kwargs.pop("password", "12345678"),
        nickname=kwargs.pop("nickname", _nickname()),
        **kwargs,
    )


def _make_species(pokedex_id: int, name: str) -> PokemonSpecies:
    return baker.make(
        PokemonSpecies,
        pokedex_id=pokedex_id,
        name=name,
        type_1="normal",
        base_hp=50,
        base_attack=50,
        base_defense=50,
        base_sp_attack=50,
        base_sp_defense=50,
        base_speed=50,
    )


def _befriend(user_a, user_b):
    Friendship.objects.create(
        from_user=user_a, to_user=user_b, status=FriendshipStatus.ACCEPTED,
    )


class PublicProfileEndpointsTest(APITestCase):
    def setUp(self):
        self.viewer = _make_user(nickname="viewer1")
        self.target = _make_user(nickname="target1")
        self.stranger = _make_user(nickname="stranger1")
        _befriend(self.viewer, self.target)
        # Give target a couple of friends + pokemon.
        self.target_friend = _make_user(nickname="targetbud")
        _befriend(self.target, self.target_friend)

        self.species = _make_species(25, "pikachu")
        self.species_2 = _make_species(133, "eevee")
        baker.make(
            UserPokemon,
            user=self.target,
            species=self.species,
            captured_at="2024-01-01T00:00:00Z",
            active_team_slot=1,
        )
        baker.make(
            UserPokemon,
            user=self.target,
            species=self.species_2,
            captured_at="2024-02-01T00:00:00Z",
        )

        self.client = APIClient()
        self.client.force_authenticate(self.viewer)

    def test_profile_endpoint_returns_counts_for_friend(self):
        response = self.client.get(reverse("user-user-profile", args=[self.target.pk]))
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data["user"]["id"], self.target.pk)
        self.assertEqual(data["user"]["nickname"], "target1")
        self.assertNotIn("email", data["user"])
        self.assertFalse(data["is_self"])
        self.assertTrue(data["is_friend"])
        self.assertEqual(data["friend_count"], 2)  # viewer + target_friend
        self.assertEqual(data["pokemon_count"], 2)
        self.assertEqual(data["team_count"], 1)

    def test_profile_endpoint_returns_self_payload_with_email(self):
        self.client.force_authenticate(self.target)
        response = self.client.get(reverse("user-user-profile", args=[self.target.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_self"])
        self.assertIn("email", response.data["user"])
        self.assertEqual(response.data["user"]["email"], self.target.email)

    def test_profile_endpoint_403_for_stranger(self):
        response = self.client.get(reverse("user-user-profile", args=[self.stranger.pk]))
        self.assertEqual(response.status_code, 403)

    def test_friends_endpoint_returns_target_friends(self):
        response = self.client.get(reverse("user-user-friends", args=[self.target.pk]))
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.data}
        self.assertEqual(ids, {self.viewer.pk, self.target_friend.pk})

    def test_friends_endpoint_403_for_stranger(self):
        response = self.client.get(reverse("user-user-friends", args=[self.stranger.pk]))
        self.assertEqual(response.status_code, 403)

    def test_pokemon_endpoint_returns_target_collection(self):
        response = self.client.get(reverse("user-user-pokemon", args=[self.target.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        species_names = {row["species"]["name"] for row in response.data["results"]}
        self.assertEqual(species_names, {"pikachu", "eevee"})

    def test_pokemon_endpoint_403_for_stranger(self):
        response = self.client.get(reverse("user-user-pokemon", args=[self.stranger.pk]))
        self.assertEqual(response.status_code, 403)

    def test_team_endpoint_returns_only_active_slots(self):
        response = self.client.get(reverse("user-user-team", args=[self.target.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["species"]["name"], "pikachu")

    def test_team_endpoint_403_for_stranger(self):
        response = self.client.get(reverse("user-user-team", args=[self.stranger.pk]))
        self.assertEqual(response.status_code, 403)

    def test_endpoints_404_for_unknown_user(self):
        response = self.client.get(reverse("user-user-profile", args=[99999]))
        self.assertEqual(response.status_code, 403)

    def test_blocked_user_cannot_view_profile(self):
        Friendship.objects.filter(
            from_user=self.viewer, to_user=self.target,
        ).delete()
        Friendship.objects.create(
            from_user=self.target,
            to_user=self.viewer,
            status=FriendshipStatus.BLOCKED,
        )
        response = self.client.get(reverse("user-user-profile", args=[self.target.pk]))
        self.assertEqual(response.status_code, 403)
