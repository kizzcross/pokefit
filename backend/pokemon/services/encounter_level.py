"""Wild encounter level from trainer progress, workout quality and species rarity."""

from __future__ import annotations

import random

from django.db.models import Avg, Max

from pokemon.choices import Rarity
from pokemon.constants import MAX_ENCOUNTER_LEVEL, MAX_POKEMON_LEVEL
from pokemon.models import PokemonSpecies, UserPokemon
from pokemon.services.evolution_rules import get_min_capture_level
from pokemon.services.progression import xp_total_for_level
from workouts.choices import WorkoutStatus
from workouts.models import Workout

TIER_MIN = 1
TIER_MAX = 40
CAP_ABOVE_TEAM = 8
WEEKLY_GOAL_LEVEL_BONUS = 5

RARITY_LEVEL_BONUS: dict[str, int] = {
    Rarity.COMMON: 0,
    Rarity.RARE: 2,
    Rarity.SUPER_RARE: 4,
    Rarity.LEGENDARY: 6,
}


def compute_trainer_tier(user) -> int:
    """Internal trainer score (1–40) from workouts and collection."""
    finished = Workout.objects.filter(user=user, status=WorkoutStatus.FINISHED).count()
    tier = finished // 3

    team_stats = UserPokemon.objects.filter(
        user=user,
        active_team_slot__isnull=False,
    ).aggregate(avg_level=Avg("level"), max_level=Max("level"))
    collection_stats = UserPokemon.objects.filter(user=user).aggregate(
        avg_level=Avg("level"),
        max_level=Max("level"),
    )

    avg_team = team_stats["avg_level"] or collection_stats["avg_level"] or 1
    max_level = collection_stats["max_level"] or 1

    tier += int(avg_team) // 2
    tier += int(max_level) // 4
    return max(TIER_MIN, min(TIER_MAX, tier))


def _encounter_level_cap(user) -> int:
    team_avg = UserPokemon.objects.filter(
        user=user,
        active_team_slot__isnull=False,
    ).aggregate(avg=Avg("level"))["avg"]
    max_level = UserPokemon.objects.filter(user=user).aggregate(m=Max("level"))["m"] or 1
    reference = int(team_avg or max_level or 1)
    return min(MAX_ENCOUNTER_LEVEL, max(reference + CAP_ABOVE_TEAM, 5))


def roll_encounter_level(workout: Workout, species: PokemonSpecies) -> int:
    tier = compute_trainer_tier(workout.user)
    base_level = 2 + tier // 2

    quality = workout.quality_score or 0
    progress = workout.progress_score or 0
    effort = workout.perceived_effort if workout.perceived_effort is not None else 5
    workout_bonus = quality // 15 + progress // 20 + effort // 2

    rarity_bonus = RARITY_LEVEL_BONUS.get(species.rarity, 0)
    weekly_bonus = WEEKLY_GOAL_LEVEL_BONUS if workout.weekly_goal_reward else 0
    jitter = random.randint(-2, 2)

    raw_level = base_level + workout_bonus + rarity_bonus + weekly_bonus + jitter
    cap = _encounter_level_cap(workout.user)
    floor = max(1, get_min_capture_level(species.pk))
    capped = min(cap, raw_level)
    return min(MAX_POKEMON_LEVEL, max(floor, capped))


def experience_for_encounter_level(level: int) -> int:
    """XP at capture: start of level + up to 30% progress toward next level."""
    level = max(1, min(MAX_POKEMON_LEVEL, level))
    base_xp = xp_total_for_level(level)
    if level >= MAX_POKEMON_LEVEL:
        return base_xp
    next_xp = xp_total_for_level(level + 1)
    span = next_xp - base_xp
    if span <= 0:
        return base_xp
    offset = random.randint(0, max(0, int(span * 0.3)))
    return base_xp + offset
