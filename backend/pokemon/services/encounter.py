from __future__ import annotations

import random

from pokemon.choices import Rarity
from pokemon.models import PokemonSpecies, UserPokemon
from pokemon.services.encounter_level import roll_encounter_level
from workouts.choices import EncounterStatus
from workouts.models import Workout

SHINY_CHANCE = 0.02

RARITY_BASE_WEIGHTS: dict[str, int] = {
    Rarity.COMMON: 52,
    Rarity.RARE: 28,
    Rarity.SUPER_RARE: 14,
    Rarity.LEGENDARY: 6,
}


def _effort_bonus(workout: Workout) -> int:
    quality = workout.quality_score or 0
    progress = workout.progress_score or 0
    return min(35, quality // 4 + progress // 6)


def _rarity_weights(workout: Workout) -> dict[str, int]:
    bonus = _effort_bonus(workout)
    weights = dict(RARITY_BASE_WEIGHTS)
    weights[Rarity.RARE] += bonus // 3
    weights[Rarity.SUPER_RARE] += bonus // 2
    weights[Rarity.LEGENDARY] += max(1, bonus // 4)
    return weights


def roll_species_for_workout(workout: Workout, user) -> PokemonSpecies | None:
    species_list = list(PokemonSpecies.objects.all())
    if not species_list:
        return None

    rarity_weights = _rarity_weights(workout)
    owned_ids = set(
        UserPokemon.objects.filter(user=user).values_list("species_id", flat=True)
    )

    pool_weights: list[float] = []
    for species in species_list:
        weight = float(rarity_weights.get(species.rarity, 10))
        if species.id in owned_ids:
            weight = max(1.0, weight * 0.35)
        pool_weights.append(weight)

    return random.choices(species_list, weights=pool_weights, k=1)[0]


def expire_pending_encounters(user, *, except_workout_id: int | None = None) -> None:
    queryset = Workout.objects.filter(
        user=user,
        encounter_status=EncounterStatus.PENDING,
    )
    if except_workout_id is not None:
        queryset = queryset.exclude(pk=except_workout_id)
    queryset.update(encounter_status=EncounterStatus.FLED)


def roll_weekly_goal_species(user) -> PokemonSpecies | None:
    """Encontro bônus da meta semanal: lendário ou ultra raro (super_rare)."""
    species_list = list(
        PokemonSpecies.objects.filter(rarity__in=[Rarity.LEGENDARY, Rarity.SUPER_RARE])
    )
    if not species_list:
        return None

    owned_ids = set(
        UserPokemon.objects.filter(user=user).values_list("species_id", flat=True)
    )
    pool_weights: list[float] = []
    for species in species_list:
        weight = 12.0 if species.rarity == Rarity.LEGENDARY else 8.0
        if species.id in owned_ids:
            weight = max(1.0, weight * 0.5)
        pool_weights.append(weight)

    return random.choices(species_list, weights=pool_weights, k=1)[0]


def assign_workout_encounter(workout: Workout, *, weekly_goal_bonus: bool = False) -> PokemonSpecies | None:
    expire_pending_encounters(workout.user, except_workout_id=workout.pk)
    if weekly_goal_bonus:
        species = roll_weekly_goal_species(workout.user)
    else:
        species = roll_species_for_workout(workout, workout.user)

    update_fields = ["encounter_species", "encounter_status", "encounter_level", "modified"]
    if weekly_goal_bonus:
        workout.weekly_goal_reward = True
        update_fields.append("weekly_goal_reward")

    workout.encounter_species = species
    workout.encounter_status = EncounterStatus.PENDING if species else ""
    workout.encounter_level = roll_encounter_level(workout, species) if species else None
    workout.save(update_fields=update_fields)
    return species


def roll_shiny() -> bool:
    return random.random() < SHINY_CHANCE
