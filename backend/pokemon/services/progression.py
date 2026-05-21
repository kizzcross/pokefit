"""XP, affection, level-up and evolution for team Pokémon after workouts."""

from __future__ import annotations

from dataclasses import dataclass, field

from django.db import transaction

from pokemon.constants import AFFECTION_MAX, MAX_POKEMON_LEVEL
from pokemon.models import EvolutionRule, UserPokemon


def xp_total_for_level(level: int) -> int:
    if level <= 1:
        return 0
    return level**3


def xp_to_next_level(pokemon: UserPokemon) -> int | None:
    if pokemon.level >= MAX_POKEMON_LEVEL:
        return None
    return max(0, xp_total_for_level(pokemon.level + 1) - pokemon.experience)


def experience_progress_percent(pokemon: UserPokemon) -> int:
    if pokemon.level >= MAX_POKEMON_LEVEL:
        return 100
    current_threshold = xp_total_for_level(pokemon.level)
    next_threshold = xp_total_for_level(pokemon.level + 1)
    span = next_threshold - current_threshold
    if span <= 0:
        return 100
    progress = pokemon.experience - current_threshold
    return min(100, max(0, int(progress * 100 / span)))


def affection_progress_percent(pokemon: UserPokemon) -> int:
    return min(100, int(pokemon.affection * 100 / AFFECTION_MAX))


def xp_gain_for_workout(workout) -> int:
    from workouts.choices import WorkoutType

    exercise_count = workout.exercises.count()
    effort = workout.perceived_effort if workout.perceived_effort is not None else 5
    quality = workout.quality_score or 0
    progress = workout.progress_score or 0
    if workout.workout_type == WorkoutType.CARDIO:
        return 35 + 6 * quality // 10 + 5 * progress // 10 + 5 * effort
    return (
        40
        + 8 * exercise_count
        + 6 * quality // 10
        + 4 * progress // 10
        + 5 * effort
    )


def affection_gain_for_workout(workout) -> int:
    effort = workout.perceived_effort if workout.perceived_effort is not None else 5
    return 3 + effort // 2


@dataclass
class EvolutionPreview:
    species_name: str
    pokedex_id: int
    trigger: str
    requires_level: int | None = None
    requires_affection: int | None = None


@dataclass
class TeamPokemonGain:
    pokemon_id: int
    display_name: str
    xp_added: int
    affection_added: int
    level_before: int
    level_after: int
    evolved: bool = False
    evolved_to: EvolutionPreview | None = None


@dataclass
class WorkoutTeamRewards:
    gains: list[TeamPokemonGain] = field(default_factory=list)
    empty_team: bool = False


def _display_name(pokemon: UserPokemon) -> str:
    return pokemon.nickname or pokemon.species.name


def _next_evolution_preview(pokemon: UserPokemon) -> EvolutionPreview | None:
    rule = (
        EvolutionRule.objects.filter(
            from_species_id=pokemon.species_id,
            enabled=True,
        )
        .select_related("to_species")
        .order_by("priority", "id")
        .first()
    )
    if not rule:
        return None
    return EvolutionPreview(
        species_name=rule.to_species.name,
        pokedex_id=rule.to_species.pokedex_id,
        trigger=rule.trigger,
        requires_level=rule.min_level,
        requires_affection=rule.min_affection,
    )


def get_progress_metadata(pokemon: UserPokemon) -> dict:
    preview = _next_evolution_preview(pokemon)
    can_evolve = _eligible_evolution_rule(pokemon) is not None
    return {
        "experience_to_next_level": xp_to_next_level(pokemon),
        "experience_progress_percent": experience_progress_percent(pokemon),
        "affection_max": AFFECTION_MAX,
        "affection_progress_percent": affection_progress_percent(pokemon),
        "can_evolve": can_evolve,
        "next_evolution": preview,
    }


def _eligible_evolution_rule(pokemon: UserPokemon) -> EvolutionRule | None:
    rules = (
        EvolutionRule.objects.filter(
            from_species_id=pokemon.species_id,
            enabled=True,
        )
        .select_related("to_species")
        .order_by("priority", "id")
    )
    for rule in rules:
        if rule.min_level is not None and pokemon.level < rule.min_level:
            continue
        if rule.min_affection is not None and pokemon.affection < rule.min_affection:
            continue
        if rule.min_level is None and rule.min_affection is None:
            continue
        return rule
    return None


def _apply_level_ups(pokemon: UserPokemon) -> int:
    levels_gained = 0
    while pokemon.level < MAX_POKEMON_LEVEL and pokemon.experience >= xp_total_for_level(
        pokemon.level + 1
    ):
        pokemon.level += 1
        levels_gained += 1
    return levels_gained


def _try_evolve(pokemon: UserPokemon) -> EvolutionPreview | None:
    rule = _eligible_evolution_rule(pokemon)
    if not rule:
        return None
    pokemon.species = rule.to_species
    return EvolutionPreview(
        species_name=rule.to_species.name,
        pokedex_id=rule.to_species.pokedex_id,
        trigger=rule.trigger,
        requires_level=rule.min_level,
        requires_affection=rule.min_affection,
    )


def _reward_single_pokemon(pokemon: UserPokemon, workout, *, xp_amount: int, affection_amount: int) -> TeamPokemonGain:
    level_before = pokemon.level
    pokemon.experience += xp_amount
    _apply_level_ups(pokemon)
    pokemon.affection = min(AFFECTION_MAX, pokemon.affection + affection_amount)
    evolved_to = _try_evolve(pokemon)
    pokemon.save(
        update_fields=["experience", "level", "affection", "species", "modified"],
    )
    return TeamPokemonGain(
        pokemon_id=pokemon.pk,
        display_name=_display_name(pokemon),
        xp_added=xp_amount,
        affection_added=affection_amount,
        level_before=level_before,
        level_after=pokemon.level,
        evolved=evolved_to is not None,
        evolved_to=evolved_to,
    )


@transaction.atomic
def apply_workout_rewards(user, workout) -> WorkoutTeamRewards:
    team = list(
        UserPokemon.objects.filter(
            user=user,
            active_team_slot__isnull=False,
        )
        .select_related("species")
        .order_by("active_team_slot"),
    )
    if not team:
        return WorkoutTeamRewards(empty_team=True)

    xp_amount = xp_gain_for_workout(workout)
    affection_amount = affection_gain_for_workout(workout)
    gains = [
        _reward_single_pokemon(pokemon, workout, xp_amount=xp_amount, affection_amount=affection_amount)
        for pokemon in team
    ]
    return WorkoutTeamRewards(gains=gains, empty_team=False)
