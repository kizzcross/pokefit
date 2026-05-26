from datetime import timedelta

from django.utils import timezone

from common.utils.tests import TestCaseUtils
from model_bakery import baker

from workouts.choices import WorkoutStatus
from workouts.models import Workout
from workouts.services.timeline import build_feed_timeline_events


class TimelineFeedPaginationTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        base = timezone.now() - timedelta(hours=1)
        self.workouts = []
        for index in range(8):
            workout = baker.make(
                Workout,
                user=self.user,
                status=WorkoutStatus.FINISHED,
                ended_at=base - timedelta(minutes=index),
            )
            self.workouts.append(workout)

    def test_returns_default_page_size(self):
        payload = build_feed_timeline_events(self.user)
        # 8 workouts → 8 events, smaller than default limit 10: no next page.
        self.assertEqual(len(payload["results"]), 8)
        self.assertEqual(payload["count"], 8)
        self.assertIsNone(payload["next_cursor"])

    def test_respects_limit_and_returns_next_cursor(self):
        first = build_feed_timeline_events(self.user, limit=3)
        self.assertEqual(len(first["results"]), 3)
        self.assertIsNotNone(first["next_cursor"])
        self.assertEqual(first["next_cursor"], first["results"][-1]["at"])

    def test_before_cursor_returns_subsequent_page(self):
        first = build_feed_timeline_events(self.user, limit=3)
        cursor = first["next_cursor"]
        second = build_feed_timeline_events(self.user, limit=3, before=cursor)
        self.assertEqual(len(second["results"]), 3)
        # No overlap.
        first_ats = {e["at"] for e in first["results"]}
        second_ats = {e["at"] for e in second["results"]}
        self.assertFalse(first_ats & second_ats)
        # Strictly older than cursor.
        self.assertTrue(all(at < cursor for at in second_ats))

    def test_last_page_has_no_next_cursor(self):
        # 8 events with limit=5 → page 1 returns cursor, page 2 finishes.
        first = build_feed_timeline_events(self.user, limit=5)
        self.assertIsNotNone(first["next_cursor"])
        second = build_feed_timeline_events(
            self.user, limit=5, before=first["next_cursor"]
        )
        self.assertEqual(len(second["results"]), 3)
        self.assertIsNone(second["next_cursor"])

    def test_limit_is_clamped_to_max(self):
        payload = build_feed_timeline_events(self.user, limit=10_000)
        self.assertLessEqual(len(payload["results"]), 50)

    def test_invalid_before_is_ignored(self):
        payload = build_feed_timeline_events(self.user, limit=3, before="not-a-date")
        # parse_datetime returns None → behaves like no cursor.
        self.assertEqual(len(payload["results"]), 3)
