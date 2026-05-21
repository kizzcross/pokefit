import uuid

from django.urls import reverse

from common.utils.tests import TestCaseUtils
from model_bakery import baker
from rest_framework.test import APITestCase

from ..models import User


def _nickname() -> str:
    return f"u{uuid.uuid4().hex[:10]}"


class UserViewSetTest(TestCaseUtils, APITestCase):
    def test_list_users(self):
        for _ in range(5):
            baker.make(User, nickname=_nickname(), _fill_optional=True)

        response = self.auth_client.get(reverse("user-list"))

        self.assertResponse200(response)
        # Note: One user is already created in the setUp method of TestCaseUtils
        self.assertEqual(response.data.get("count"), 6)
        self.assertEqual(len(response.data.get("results")), 6)

    def test_create_user(self):
        data = {
            "email": f"testuser-{_nickname()}@test.com",
            "nickname": _nickname(),
            "password": "12345678",
        }

        response = self.auth_client.post(reverse("user-list"), data=data)

        self.assertResponse201(response)
        user = User.objects.get(id=response.data["id"])
        self.assertEqual(user.email, data["email"])

    def test_retrieve_user(self):
        user = baker.make(User, nickname=_nickname(), _fill_optional=True)

        response = self.auth_client.get(reverse("user-detail", args=[user.id]))

        self.assertResponse200(response)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["email"], user.email)

    def test_put_update_user(self):
        user = baker.make(User, email="testuser@test.com", nickname="testuser01", _fill_optional=True)
        data = {
            "email": "user@test.com",
            "nickname": "usertest01",
            "password": "87654321",
        }

        response = self.auth_client.put(
            reverse("user-detail", args=[user.id]), data=data
        )

        self.assertResponse200(response)
        user.refresh_from_db()
        self.assertEqual(user.email, data["email"])

    def test_patch_update_user(self):
        user = baker.make(User, email="testuser@test.com", nickname="testuser02", _fill_optional=True)
        data = {
            "email": "user@test.com",
            "nickname": "usertest02",
        }

        response = self.auth_client.patch(
            reverse("user-detail", args=[user.id]), data=data
        )

        self.assertResponse200(response)
        user.refresh_from_db()
        self.assertEqual(user.email, data["email"])

    def test_delete_user(self):
        user = baker.make(User, nickname=_nickname(), _fill_optional=True)

        response = self.auth_client.delete(reverse("user-detail", args=[user.id]))

        self.assertResponse204(response)
        self.assertFalse(User.objects.filter(id=user.id).exists())

    def test_patch_me_updates_nickname(self):
        old_nick = _nickname()
        new_nick = _nickname()
        self.user.nickname = old_nick
        self.user.save(update_fields=["nickname"])

        response = self.auth_client.patch(
            reverse("user-me"),
            data={"nickname": new_nick},
        )

        self.assertResponse200(response)
        self.assertEqual(response.data["nickname"], new_nick)
        self.user.refresh_from_db()
        self.assertEqual(self.user.nickname, new_nick)

    def test_patch_me_rejects_taken_nickname(self):
        taken = _nickname()
        baker.make(User, nickname=taken, _fill_optional=True)

        response = self.auth_client.patch(
            reverse("user-me"),
            data={"nickname": taken},
        )

        self.assertResponse400(response)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.nickname, taken)

    def test_gift_recipients_staff_can_search(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        target = baker.make(
            User,
            email="player@test.com",
            nickname="playerone",
            is_active=True,
            _fill_optional=True,
        )

        response = self.auth_client.get(
            reverse("user-gift-recipients"),
            data={"q": "player"},
        )

        self.assertResponse200(response)
        ids = [row["id"] for row in response.data]
        self.assertIn(target.id, ids)

    def test_gift_recipients_includes_self(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])

        response = self.auth_client.get(
            reverse("user-gift-recipients"),
            data={"q": self.user.nickname[:4]},
        )

        self.assertResponse200(response)
        ids = [row["id"] for row in response.data]
        self.assertIn(self.user.id, ids)

    def test_gift_recipients_superuser_without_staff_can_search(self):
        self.user.is_superuser = True
        self.user.is_staff = False
        self.user.save(update_fields=["is_superuser", "is_staff"])
        target = baker.make(
            User,
            email="gifted@test.com",
            nickname="giftedone",
            is_active=True,
            _fill_optional=True,
        )

        response = self.auth_client.get(
            reverse("user-gift-recipients"),
            data={"q": "gifted"},
        )

        self.assertResponse200(response)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], target.id)

    def test_gift_recipients_forbidden_for_regular_user(self):
        other = baker.make(User, nickname=_nickname(), is_active=True, _fill_optional=True)

        response = self.auth_client.get(
            reverse("user-gift-recipients"),
            data={"q": other.nickname[:4]},
        )

        self.assertResponse403(response)
