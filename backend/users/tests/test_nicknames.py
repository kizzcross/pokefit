from django.contrib.auth import get_user_model
from django.test import TestCase

from users.nicknames import normalize_nickname, resolve_user_by_identifier

User = get_user_model()


class NicknameTests(TestCase):
    def test_normalize_rejects_invalid(self):
        with self.assertRaises(ValueError):
            normalize_nickname("ab")
        with self.assertRaises(ValueError):
            normalize_nickname("1abc")

    def test_resolve_by_email_or_nickname(self):
        user = User.objects.create_user(
            email="nick@test.com",
            password="pass12345",
            nickname="nick_tester",
        )
        by_email = resolve_user_by_identifier("nick@test.com")
        by_nick = resolve_user_by_identifier("nick_tester")
        self.assertEqual(by_email.pk, user.pk)
        self.assertEqual(by_nick.pk, user.pk)

    def test_missing_nickname_raises(self):
        with self.assertRaises(ValueError):
            resolve_user_by_identifier("no_such_nick_xyz")
