from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from pokemon.models import UserPokemon
from workouts.choices import EncounterStatus, WorkoutStatus
from workouts.models import Workout


def _trained_dates(user, *, through: date | None = None) -> set[date]:
    qs = Workout.objects.filter(user=user, status=WorkoutStatus.FINISHED).exclude(ended_at__isnull=True)
    if through:
        qs = qs.filter(ended_at__date__lte=through)
    return {w.ended_at.date() for w in qs.only("ended_at")}


def compute_streaks(user, *, reference: date | None = None) -> tuple[int, int]:
    today = reference or timezone.localdate()
    dates = _trained_dates(user, through=today)
    if not dates:
        return 0, 0

    current = 0
    cursor = today
    while cursor in dates:
        current += 1
        cursor -= timedelta(days=1)

    best = _best_consecutive_run(dates)
    return current, best


def _best_consecutive_run(dates: set[date]) -> int:
    if not dates:
        return 0
    sorted_dates = sorted(dates)
    best = 1
    run = 1
    for index in range(1, len(sorted_dates)):
        if sorted_dates[index] - sorted_dates[index - 1] == timedelta(days=1):
            run += 1
            best = max(best, run)
        else:
            run = 1
    return best


def compute_month_best_streak(month_dates: set[date]) -> int:
    return _best_consecutive_run(month_dates)


def build_calendar_month(user, year: int, month: int, *, include_proof_photos: bool = True) -> dict:
    today = timezone.localdate()
    _, days_in_month = monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)

    workouts = (
        Workout.objects.filter(
            user=user,
            status=WorkoutStatus.FINISHED,
            ended_at__date__gte=month_start,
            ended_at__date__lte=month_end,
        )
        .select_related("encounter_species")
        .prefetch_related("exercises")
        .order_by("ended_at")
    )

    workout_list = list(workouts)
    captures_by_workout = {
        row["source_workout_id"]: row
        for row in UserPokemon.objects.filter(
            user=user,
            source_workout_id__in=[w.pk for w in workout_list],
        ).values("source_workout_id", "shiny")
    }

    by_date: dict[str, dict] = {}
    for workout in workout_list:
        day_key = workout.ended_at.date().isoformat()
        if day_key not in by_date:
            by_date[day_key] = {
                "date": day_key,
                "workout_count": 0,
                "has_capture": False,
                "has_shiny": False,
                "has_draft": False,
                "workouts": [],
            }
        day = by_date[day_key]
        day["workout_count"] += 1

        capture = captures_by_workout.get(workout.pk)
        if workout.encounter_status == EncounterStatus.CAPTURED or capture:
            day["has_capture"] = True
        if capture and capture.get("shiny"):
            day["has_shiny"] = True

        proof_url = None
        if include_proof_photos and workout.proof_photo:
            proof_url = workout.proof_photo.url

        species = workout.encounter_species
        day["workouts"].append(
            {
                "id": workout.pk,
                "workout_type": workout.workout_type,
                "total_volume": str(workout.total_volume),
                "perceived_effort": workout.perceived_effort,
                "proof_photo_url": proof_url,
                "proof_caption": workout.proof_caption if include_proof_photos else "",
                "encounter_status": workout.encounter_status or "",
                "encounter_species_name": species.name if species else None,
                "encounter_species_sprite": species.sprite_url if species else None,
                "encounter_species_pokedex_id": species.pokedex_id if species else None,
            }
        )

    draft_days = (
        Workout.objects.filter(
            user=user,
            status=WorkoutStatus.DRAFT,
            started_at__date__gte=month_start,
            started_at__date__lte=month_end,
        )
        .values_list("started_at__date", flat=True)
    )
    for draft_day in draft_days:
        day_key = draft_day.isoformat()
        if day_key not in by_date:
            by_date[day_key] = {
                "date": day_key,
                "workout_count": 0,
                "has_capture": False,
                "has_shiny": False,
                "has_draft": True,
                "workouts": [],
            }
        else:
            by_date[day_key]["has_draft"] = True

    days_list = []
    for day_num in range(1, days_in_month + 1):
        day_key = date(year, month, day_num).isoformat()
        if day_key in by_date:
            days_list.append(by_date[day_key])
        else:
            days_list.append(
                {
                    "date": day_key,
                    "workout_count": 0,
                    "has_capture": False,
                    "has_shiny": False,
                    "has_draft": False,
                    "workouts": [],
                }
            )

    month_dates = {d for d in _trained_dates(user) if month_start <= d <= month_end}
    streak_current, streak_best_all_time = compute_streaks(user, reference=today)
    streak_best_in_month = compute_month_best_streak(month_dates)

    return {
        "year": year,
        "month": month,
        "days_in_month": days_in_month,
        "streak_current": streak_current,
        "streak_best_all_time": streak_best_all_time,
        "streak_best_in_month": streak_best_in_month,
        "days_trained": len(month_dates),
        "days": days_list,
    }
