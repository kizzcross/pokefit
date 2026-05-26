"""Reactions and comments on workouts."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count

from workouts.models import (
    WORKOUT_COMMENT_MAX_LENGTH,
    WORKOUT_REACTION_EMOJIS,
    Workout,
    WorkoutComment,
    WorkoutReaction,
)


if TYPE_CHECKING:
    from django.db.models import QuerySet

User = get_user_model()


class InteractionError(Exception):
    """Raised when an interaction cannot be applied (e.g. invalid emoji)."""


def is_valid_emoji(emoji: str) -> bool:
    return emoji in WORKOUT_REACTION_EMOJIS


@transaction.atomic
def toggle_reaction(workout: Workout, user, emoji: str) -> bool:
    """Set the user's reaction on a workout. Each user can only have ONE
    active reaction per workout, so:
      - tapping the same emoji removes it (returns False)
      - tapping a different emoji replaces the previous one (returns True)
      - tapping with no previous reaction creates one (returns True)
    """

    if not is_valid_emoji(emoji):
        raise InteractionError(f"emoji '{emoji}' não suportado")

    existing = WorkoutReaction.objects.filter(workout=workout, user=user).first()
    if existing is not None:
        if existing.emoji == emoji:
            existing.delete()
            return False
        existing.emoji = emoji
        existing.save(update_fields=["emoji", "modified"])
        return True
    try:
        WorkoutReaction.objects.create(workout=workout, user=user, emoji=emoji)
    except IntegrityError:
        # Race: another concurrent toggle already created it; treat as active.
        return True
    return True


def reactions_summary(workout: Workout, viewer) -> dict:
    """Return aggregated counts plus the viewer's selected emojis."""

    counts_qs = (
        WorkoutReaction.objects.filter(workout=workout)
        .values("emoji")
        .annotate(count=Count("id"))
    )
    counts: dict[str, int] = {row["emoji"]: row["count"] for row in counts_qs}
    # Always include the supported emojis so the UI can render zero-count slots.
    for emoji in WORKOUT_REACTION_EMOJIS:
        counts.setdefault(emoji, 0)

    my_reactions: list[str] = []
    if viewer is not None and viewer.is_authenticated:
        my_reactions = list(
            WorkoutReaction.objects.filter(workout=workout, user=viewer).values_list(
                "emoji", flat=True
            )
        )

    return {
        "counts": counts,
        "my_reactions": my_reactions,
        "total": sum(counts.values()),
    }


def create_comment(workout: Workout, user, body: str) -> WorkoutComment:
    cleaned = (body or "").strip()
    if not cleaned:
        raise InteractionError("comentário vazio")
    if len(cleaned) > WORKOUT_COMMENT_MAX_LENGTH:
        raise InteractionError(
            f"comentário maior que {WORKOUT_COMMENT_MAX_LENGTH} caracteres"
        )
    return WorkoutComment.objects.create(workout=workout, user=user, body=cleaned)


def delete_comment(comment: WorkoutComment, user) -> None:
    if comment.user_id != user.id and not (
        getattr(user, "is_staff", False) or comment.workout.user_id == user.id
    ):
        raise InteractionError("sem permissão para apagar este comentário")
    comment.delete()


def list_comments(workout: Workout) -> QuerySet[WorkoutComment]:
    return WorkoutComment.objects.filter(workout=workout).select_related("user")


def unseen_interactions_count(user) -> int:
    """How many recent reactions + comments the user has not acknowledged yet."""

    workouts = Workout.objects.filter(user=user)
    last_seen = user.interactions_last_seen_at

    reactions = WorkoutReaction.objects.filter(workout__in=workouts).exclude(user=user)
    comments = WorkoutComment.objects.filter(workout__in=workouts).exclude(user=user)
    if last_seen is not None:
        reactions = reactions.filter(created__gt=last_seen)
        comments = comments.filter(created__gt=last_seen)
    return reactions.count() + comments.count()
