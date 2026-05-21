"""Cardio pace scoring and reference comparison against the user's last session."""

from __future__ import annotations

from workouts.choices import WorkoutStatus, WorkoutType
from workouts.models import Workout

# 6:00 min/km — baseline when the user has no finished cardio yet
BASELINE_PACE_SECONDS_PER_KM = 360
MIN_PACE_SECONDS_PER_KM = 120  # 2:00 / km
MAX_PACE_SECONDS_PER_KM = 1200  # 20:00 / km


def pace_seconds_from_parts(minutes: int, seconds: int) -> int:
    return minutes * 60 + seconds


def validate_pace_seconds(pace_seconds: int) -> int:
    if pace_seconds < MIN_PACE_SECONDS_PER_KM or pace_seconds > MAX_PACE_SECONDS_PER_KM:
        raise ValueError(
            f"Pace must be between {MIN_PACE_SECONDS_PER_KM // 60}:{MIN_PACE_SECONDS_PER_KM % 60:02d} "
            f"and {MAX_PACE_SECONDS_PER_KM // 60}:{MAX_PACE_SECONDS_PER_KM % 60:02d} per km."
        )
    return pace_seconds


def format_pace(pace_seconds: int) -> str:
    minutes = pace_seconds // 60
    seconds = pace_seconds % 60
    return f"{minutes}:{seconds:02d}"


def get_last_finished_cardio(user, *, exclude_workout_id: int | None = None) -> Workout | None:
    queryset = Workout.objects.filter(
        user=user,
        workout_type=WorkoutType.CARDIO,
        status=WorkoutStatus.FINISHED,
        cardio_pace_seconds_per_km__isnull=False,
    ).order_by("-ended_at")
    if exclude_workout_id is not None:
        queryset = queryset.exclude(pk=exclude_workout_id)
    return queryset.first()


def get_reference_pace_seconds(user, *, exclude_workout_id: int | None = None) -> int:
    last = get_last_finished_cardio(user, exclude_workout_id=exclude_workout_id)
    if last and last.cardio_pace_seconds_per_km:
        return last.cardio_pace_seconds_per_km
    return BASELINE_PACE_SECONDS_PER_KM


def compute_cardio_progress_score(current_pace: int, reference_pace: int) -> int:
    """
    50 = same pace as reference; faster (lower sec/km) raises score; slower lowers it.
    ~30% faster than reference → 100; ~30% slower → 0.
    """
    if reference_pace <= 0:
        reference_pace = BASELINE_PACE_SECONDS_PER_KM
    delta_seconds = reference_pace - current_pace
    pct_change = (delta_seconds / reference_pace) * 100
    score = 50 + int(pct_change * (50 / 30))
    return max(0, min(100, score))


def cardio_performance_summary(
    *,
    current_pace: int,
    reference_pace: int,
    has_previous_cardio: bool,
) -> dict:
    score = compute_cardio_progress_score(current_pace, reference_pace)
    delta_seconds = reference_pace - current_pace
    if delta_seconds > 5:
        tier = "improved"
        message = "Ritmo melhor que a referência — encontros mais raros!"
    elif delta_seconds < -5:
        tier = "slower"
        message = "Ritmo abaixo da referência — foque na constância."
    else:
        tier = "steady"
        message = "Ritmo parecido com a referência."
    return {
        "progress_score": score,
        "reference_pace_seconds_per_km": reference_pace,
        "reference_pace_display": format_pace(reference_pace),
        "current_pace_display": format_pace(current_pace),
        "has_previous_cardio": has_previous_cardio,
        "tier": tier,
        "message": message,
    }
