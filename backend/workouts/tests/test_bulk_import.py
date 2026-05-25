import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APIClient, APITestCase

from workouts.models import Exercise


User = get_user_model()


def _nickname() -> str:
    return f"u{uuid.uuid4().hex[:10]}"


def _make_user(*, is_staff: bool = False) -> User:
    return User.objects.create_user(
        email=f"{_nickname()}@test.com",
        password="12345678",
        nickname=_nickname(),
        is_staff=is_staff,
    )


SAMPLE_EXERCISE = {
    "name": "Test Squat",
    "slug": "test-squat",
    "description": "Sample description",
    "instructions": "Sample instructions",
    "muscle_group": "legs",
    "difficulty": "beginner",
    "equipment": "Peso corporal",
    "is_active": True,
}


class ExerciseBulkImportTest(APITestCase):
    def setUp(self):
        self.staff = _make_user(is_staff=True)
        self.regular = _make_user(is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.url = reverse("exercise-bulk-import")

    def test_staff_can_import_list_of_exercises(self):
        payload = [
            SAMPLE_EXERCISE,
            {**SAMPLE_EXERCISE, "name": "Test Bench", "slug": "test-bench", "muscle_group": "chest"},
        ]
        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["created"], 2)
        self.assertEqual(response.data["summary"]["updated"], 0)
        self.assertEqual(response.data["summary"]["total"], 2)
        self.assertFalse(response.data["dry_run"])
        self.assertTrue(Exercise.objects.filter(slug="test-squat").exists())
        self.assertTrue(Exercise.objects.filter(slug="test-bench").exists())

    def test_import_updates_existing_when_create_only_false(self):
        # First import creates
        self.client.post(self.url, data=[SAMPLE_EXERCISE], format="json")
        # Second import with same slug but new description
        modified = {**SAMPLE_EXERCISE, "description": "Updated description"}
        response = self.client.post(self.url, data=[modified], format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["updated"], 1)
        self.assertEqual(response.data["summary"]["created"], 0)
        exercise = Exercise.objects.get(slug="test-squat")
        self.assertEqual(exercise.description, "Updated description")

    def test_import_with_create_only_skips_existing(self):
        self.client.post(self.url, data=[SAMPLE_EXERCISE], format="json")
        payload = {"exercises": [SAMPLE_EXERCISE], "create_only": True}
        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["skipped"], 1)
        self.assertEqual(response.data["summary"]["created"], 0)

    def test_dry_run_does_not_persist(self):
        payload = {"exercises": [SAMPLE_EXERCISE], "dry_run": True}
        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["dry_run"])
        self.assertEqual(response.data["summary"]["created"], 1)
        self.assertFalse(Exercise.objects.filter(slug="test-squat").exists())

    def test_invalid_muscle_group_returns_failure_per_item(self):
        payload = [{**SAMPLE_EXERCISE, "muscle_group": "invalid"}]
        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["failed"], 1)
        self.assertIn("muscle_group", response.data["results"][0]["reason"])

    def test_missing_required_field_returns_failure_per_item(self):
        bad_entry = {k: v for k, v in SAMPLE_EXERCISE.items() if k != "muscle_group"}
        response = self.client.post(self.url, data=[bad_entry], format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["failed"], 1)
        self.assertIn("muscle_group", response.data["results"][0]["reason"])

    def test_empty_list_returns_400(self):
        response = self.client.post(self.url, data=[], format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("vazia", response.data["detail"].lower())

    def test_too_many_items_returns_400(self):
        big_payload = [
            {**SAMPLE_EXERCISE, "name": f"Test {i}", "slug": f"test-{i}"}
            for i in range(501)
        ]
        response = self.client.post(self.url, data=big_payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("máximo", response.data["detail"].lower())

    def test_regular_user_cannot_import(self):
        self.client.force_authenticate(self.regular)
        response = self.client.post(self.url, data=[SAMPLE_EXERCISE], format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Exercise.objects.filter(slug="test-squat").exists())

    def test_unauthenticated_cannot_import(self):
        self.client.force_authenticate(None)
        response = self.client.post(self.url, data=[SAMPLE_EXERCISE], format="json")
        self.assertEqual(response.status_code, 403)

    def test_object_payload_with_exercises_key_works(self):
        payload = {"exercises": [SAMPLE_EXERCISE]}
        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["created"], 1)

    def test_invalid_payload_type_returns_400(self):
        response = self.client.post(self.url, data="not a list or object", format="json")
        self.assertEqual(response.status_code, 400)
