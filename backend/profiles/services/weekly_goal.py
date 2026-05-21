from __future__ import annotations

from datetime import date, timedelta

from django.utils import timezone

from profiles.models import UserProfile, WeeklyGoal, WeeklyGoalReward
from workouts.choices import WorkoutStatus
from workouts.models import Workout


class WeeklyGoalAlreadySetError(Exception):
    pass


def get_or_create_profile(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def current_week_bounds(for_date: date | None = None) -> tuple[date, date, int, int]:
    """Semana ISO (segunda a domingo)."""
    day = for_date or timezone.localdate()
    iso_year, iso_week, _ = day.isocalendar()
    monday = day - timedelta(days=day.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday, iso_year, iso_week


def get_active_weekly_goal(user) -> WeeklyGoal | None:
    _, _, iso_year, iso_week = current_week_bounds()
    return WeeklyGoal.objects.filter(user=user, iso_year=iso_year, iso_week=iso_week).first()


def count_finished_workouts_in_week(user, *, week_start: date, week_end: date) -> int:
    return (
        Workout.objects.filter(
            user=user,
            status=WorkoutStatus.FINISHED,
            ended_at__isnull=False,
            ended_at__date__gte=week_start,
            ended_at__date__lte=week_end,
        )
        .distinct()
        .count()
    )


def save_weekly_goal(user, target: int) -> WeeklyGoal:
    week_start, week_end, iso_year, iso_week = current_week_bounds()
    if WeeklyGoal.objects.filter(user=user, iso_year=iso_year, iso_week=iso_week).exists():
        raise WeeklyGoalAlreadySetError("Você já definiu a meta desta semana.")

    goal = WeeklyGoal.objects.create(
        user=user,
        iso_year=iso_year,
        iso_week=iso_week,
        target=target,
    )
    profile = get_or_create_profile(user)
    profile.weekly_frequency = target
    profile.save(update_fields=["weekly_frequency", "modified"])
    return goal


def build_weekly_goal_status(user) -> dict:
    profile = get_or_create_profile(user)
    week_start, week_end, iso_year, iso_week = current_week_bounds()
    active_goal = get_active_weekly_goal(user)
    current = count_finished_workouts_in_week(user, week_start=week_start, week_end=week_end)
    reward = WeeklyGoalReward.objects.filter(
        user=user,
        iso_year=iso_year,
        iso_week=iso_week,
    ).first()

    has_active_goal = active_goal is not None
    target = active_goal.target if active_goal else None
    hp_max = target or 0
    hp_current = min(current, hp_max) if has_active_goal else 0
    progress_percent = min(100, round((current / target) * 100)) if target else 0
    goal_met = has_active_goal and current >= target

    return {
        "has_active_goal": has_active_goal,
        "target": target,
        "suggested_target": profile.weekly_frequency,
        "current": current,
        "hp_current": hp_current,
        "hp_max": hp_max,
        "week_start": week_start,
        "week_end": week_end,
        "iso_year": iso_year,
        "iso_week": iso_week,
        "progress_percent": progress_percent,
        "goal_met": goal_met,
        "reward_claimed": reward is not None,
        "reward_workout_id": reward.workout_id if reward else None,
        "pending_legendary_encounter": goal_met and reward is None,
        "goal_locked": has_active_goal,
    }


def should_grant_weekly_goal_encounter(user, workout: Workout) -> bool:
    active_goal = get_active_weekly_goal(user)
    if not active_goal:
        return False

    week_start, week_end, iso_year, iso_week = current_week_bounds()
    if WeeklyGoalReward.objects.filter(user=user, iso_year=iso_year, iso_week=iso_week).exists():
        return False

    current = count_finished_workouts_in_week(user, week_start=week_start, week_end=week_end)
    return current >= active_goal.target


def record_weekly_goal_reward(user, workout: Workout) -> WeeklyGoalReward:
    _, _, iso_year, iso_week = current_week_bounds()
    reward, _ = WeeklyGoalReward.objects.update_or_create(
        user=user,
        iso_year=iso_year,
        iso_week=iso_week,
        defaults={"workout": workout},
    )
    return reward
