from django.contrib.auth import get_user_model
from django.utils import timezone

from common.utils.tests import TestCaseUtils
from model_bakery import baker
from rest_framework.test import APIClient

from workouts.choices import WorkoutStatus
from workouts.models import (
    WORKOUT_REACTION_EMOJIS,
    Workout,
    WorkoutComment,
    WorkoutReaction,
)
from workouts.services.interactions import (
    InteractionError,
    create_comment,
    reactions_summary,
    toggle_reaction,
    unseen_interactions_count,
)


User = get_user_model()


def _make_workout(user):
    return baker.make(
        Workout,
        user=user,
        status=WorkoutStatus.FINISHED,
        ended_at=timezone.now(),
    )


class WorkoutInteractionServiceTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        self.owner = baker.make(User, email="owner@test.com", nickname="owner_tc")
        self.workout = _make_workout(self.owner)

    def test_toggle_reaction_adds_then_removes(self):
        active = toggle_reaction(self.workout, self.user, "🔥")
        self.assertTrue(active)
        self.assertEqual(
            WorkoutReaction.objects.filter(workout=self.workout, user=self.user).count(),
            1,
        )

        active = toggle_reaction(self.workout, self.user, "🔥")
        self.assertFalse(active)
        self.assertEqual(
            WorkoutReaction.objects.filter(workout=self.workout, user=self.user).count(),
            0,
        )

    def test_react_with_different_emoji_replaces_previous(self):
        toggle_reaction(self.workout, self.user, "🔥")
        toggle_reaction(self.workout, self.user, "💪")
        reactions = WorkoutReaction.objects.filter(workout=self.workout, user=self.user)
        self.assertEqual(reactions.count(), 1)
        self.assertEqual(reactions.first().emoji, "💪")

    def test_toggle_rejects_unknown_emoji(self):
        with self.assertRaises(InteractionError):
            toggle_reaction(self.workout, self.user, "🍕")

    def test_reactions_summary_counts_each_emoji(self):
        other = baker.make(User, email="other@test.com", nickname="other_tc")
        third = baker.make(User, email="third@test.com", nickname="third_tc")
        toggle_reaction(self.workout, self.user, "🔥")
        toggle_reaction(self.workout, other, "🔥")
        toggle_reaction(self.workout, third, "💪")

        summary = reactions_summary(self.workout, self.user)
        self.assertEqual(summary["counts"]["🔥"], 2)
        self.assertEqual(summary["counts"]["💪"], 1)
        self.assertEqual(summary["total"], 3)
        self.assertEqual(summary["my_reactions"], ["🔥"])
        # Supported emojis without reactions still report zero.
        self.assertEqual(summary["counts"]["👏"], 0)

    def test_create_comment_rejects_empty(self):
        with self.assertRaises(InteractionError):
            create_comment(self.workout, self.user, "   ")

    def test_create_comment_strips_whitespace(self):
        comment = create_comment(self.workout, self.user, "  bom treino!  ")
        self.assertEqual(comment.body, "bom treino!")

    def test_unseen_counts_only_external_interactions(self):
        other = baker.make(User, email="o2@test.com", nickname="o2_tc")
        my_workout = _make_workout(self.user)
        toggle_reaction(my_workout, other, "🔥")
        toggle_reaction(my_workout, self.user, "💪")
        create_comment(my_workout, other, "muito bom!")
        # My own reactions/comments should not count.
        self.assertEqual(unseen_interactions_count(self.user), 2)


class WorkoutInteractionsAPITest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        self.owner = baker.make(User, email="o@test.com", nickname="ot_tc")
        self.owner.set_password("123456")
        self.owner.save()
        self.workout = _make_workout(self.owner)

        self.owner_client = APIClient()
        self.owner_client.login(email=self.owner.email, password="123456")

    def _url(self, suffix):
        return f"/api/workouts/{self.workout.pk}/{suffix}"

    def test_unauthenticated_cannot_interact(self):
        client = APIClient()
        response = client.get(self._url("interactions/"))
        self.assertEqual(response.status_code, 403)

    def test_get_interactions_returns_supported_emojis(self):
        response = self.auth_client.get(self._url("interactions/"))
        self.assertResponse200(response)
        data = response.json()
        self.assertEqual(data["supported_emojis"], WORKOUT_REACTION_EMOJIS)
        self.assertEqual(data["reactions"]["total"], 0)
        self.assertEqual(data["comments"], [])

    def test_react_toggle_persists(self):
        response = self.auth_client.post(
            self._url("react/"),
            {"emoji": "🔥"},
            format="json",
        )
        self.assertResponse200(response)
        data = response.json()
        self.assertEqual(data["reactions"]["counts"]["🔥"], 1)
        self.assertIn("🔥", data["reactions"]["my_reactions"])

        # Toggling again removes.
        response = self.auth_client.post(
            self._url("react/"),
            {"emoji": "🔥"},
            format="json",
        )
        self.assertResponse200(response)
        self.assertEqual(response.json()["reactions"]["counts"]["🔥"], 0)

    def test_react_rejects_invalid_emoji(self):
        response = self.auth_client.post(
            self._url("react/"),
            {"emoji": "🍕"},
            format="json",
        )
        self.assertResponse400(response)

    def test_post_comment_creates(self):
        response = self.auth_client.post(
            self._url("comments/"),
            {"body": "que treino top!"},
            format="json",
        )
        self.assertResponse201(response)
        data = response.json()
        self.assertEqual(data["body"], "que treino top!")
        self.assertEqual(data["user_id"], self.user.id)
        self.assertEqual(WorkoutComment.objects.filter(workout=self.workout).count(), 1)

    def test_post_comment_rejects_empty(self):
        response = self.auth_client.post(
            self._url("comments/"),
            {"body": "   "},
            format="json",
        )
        self.assertResponse400(response)

    def test_delete_comment_only_author_or_owner_or_staff(self):
        comment = create_comment(self.workout, self.user, "meu comentário")

        stranger = baker.make(User, email="s@test.com", nickname="s_tc")
        stranger.set_password("123456")
        stranger.save()
        stranger_client = APIClient()
        stranger_client.login(email=stranger.email, password="123456")

        response = stranger_client.delete(self._url(f"comments/{comment.pk}/"))
        self.assertResponse403(response)
        self.assertTrue(WorkoutComment.objects.filter(pk=comment.pk).exists())

        # Author can delete.
        response = self.auth_client.delete(self._url(f"comments/{comment.pk}/"))
        self.assertResponse204(response)
        self.assertFalse(WorkoutComment.objects.filter(pk=comment.pk).exists())

    def test_owner_can_delete_anyone_comment(self):
        comment = create_comment(self.workout, self.user, "comentário do outro")

        response = self.owner_client.delete(self._url(f"comments/{comment.pk}/"))
        self.assertResponse204(response)

    def test_interactions_notifications_count_and_mark_seen(self):
        my_workout = _make_workout(self.user)
        baker.make(WorkoutReaction, workout=my_workout, user=self.owner, emoji="🔥")
        baker.make(WorkoutComment, workout=my_workout, user=self.owner, body="parabens")

        response = self.auth_client.get("/api/workouts/interactions-notifications/")
        self.assertResponse200(response)
        self.assertEqual(response.json()["count"], 2)

        response = self.auth_client.post(
            "/api/workouts/interactions-notifications/mark-seen/",
            format="json",
        )
        self.assertResponse200(response)
        self.assertEqual(response.json()["count"], 0)

        # Subsequent reads also report zero.
        response = self.auth_client.get("/api/workouts/interactions-notifications/")
        self.assertEqual(response.json()["count"], 0)

    def test_interactions_works_on_other_users_workouts(self):
        """Any logged-in user can react/comment, not only the owner."""
        # self.user is NOT the workout's owner here (owner is self.owner).
        response = self.auth_client.post(
            self._url("react/"),
            {"emoji": "👏"},
            format="json",
        )
        self.assertResponse200(response)
        self.assertEqual(
            WorkoutReaction.objects.filter(workout=self.workout, user=self.user).count(),
            1,
        )

    def test_draft_workouts_cannot_be_interacted(self):
        draft = baker.make(Workout, user=self.owner, status=WorkoutStatus.DRAFT)
        response = self.auth_client.get(f"/api/workouts/{draft.pk}/interactions/")
        self.assertResponse404(response)
