from django.contrib.auth import get_user_model
from django.test import TestCase

from workouts.choices import WorkoutStatus, WorkoutType
from workouts.models import Workout
from workouts.services.cardio import (
    BASELINE_PACE_SECONDS_PER_KM,
    compute_cardio_progress_score,
    get_reference_pace_seconds,
)

User = get_user_model()


class CardioProgressScoreTests(TestCase):
    def test_same_pace_as_reference_scores_around_50(self):
        pace = 330
        score = compute_cardio_progress_score(pace, pace)
        self.assertGreaterEqual(score, 48)
        self.assertLessEqual(score, 52)

    def test_faster_pace_scores_higher(self):
        reference = 360
        faster = 300
        score = compute_cardio_progress_score(faster, reference)
        self.assertGreater(score, 55)

    def test_slower_pace_scores_lower(self):
        reference = 360
        slower = 420
        score = compute_cardio_progress_score(slower, reference)
        self.assertLess(score, 45)

    def test_reference_uses_baseline_without_history(self):
        user = User.objects.create_user(email="cardio@test.com", password="x")
        self.assertEqual(
            get_reference_pace_seconds(user),
            BASELINE_PACE_SECONDS_PER_KM,
        )

    def test_reference_uses_last_cardio(self):
        user = User.objects.create_user(email="cardio2@test.com", password="x")
        Workout.objects.create(
            user=user,
            workout_type=WorkoutType.CARDIO,
            status=WorkoutStatus.FINISHED,
            cardio_pace_seconds_per_km=300,
            cardio_duration_minutes=30,
        )
        self.assertEqual(get_reference_pace_seconds(user), 300)

    def test_cardio_finish_sets_progress_from_pace(self):
        user = User.objects.create_user(email="cardio3@test.com", password="x")
        workout = Workout.objects.create(
            user=user,
            workout_type=WorkoutType.CARDIO,
            status=WorkoutStatus.DRAFT,
            cardio_pace_seconds_per_km=300,
            cardio_duration_minutes=40,
            perceived_effort=8,
        )
        workout.finish()
        workout.refresh_from_db()
        self.assertEqual(workout.status, WorkoutStatus.FINISHED)
        self.assertGreater(workout.progress_score, 50)
