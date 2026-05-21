"""Grant a Pokémon to a user without a workout encounter."""

from __future__ import annotations

import random

from django.utils import timezone

from pokemon.choices import Nature
from pokemon.constants import IV_MAX, IV_MIN
from pokemon.models import PokemonIV, PokemonSpecies, UserPokemon
from pokemon.services.encounter_level import experience_for_encounter_level


def grant_pokemon_to_user(
    user,
    species: PokemonSpecies,
    *,
    nickname: str = "",
    shiny: bool | None = None,
    level: int = 1,
    experience: int | None = None,
) -> UserPokemon:
    if shiny is None:
        from pokemon.services.encounter import roll_shiny

        shiny = roll_shiny()

    nature = random.choice(Nature.values)
    user_pokemon = UserPokemon.objects.create(
        user=user,
        species=species,
        nickname=nickname,
        nature=nature,
        shiny=shiny,
        captured_at=timezone.now(),
        source_workout=None,
    )
    PokemonIV.objects.create(
        user_pokemon=user_pokemon,
        hp=random.randint(IV_MIN, IV_MAX),
        attack=random.randint(IV_MIN, IV_MAX),
        defense=random.randint(IV_MIN, IV_MAX),
        sp_attack=random.randint(IV_MIN, IV_MAX),
        sp_defense=random.randint(IV_MIN, IV_MAX),
        speed=random.randint(IV_MIN, IV_MAX),
    )
    return user_pokemon


def grant_pokemon_from_workout_encounter(
    user,
    species: PokemonSpecies,
    workout,
    *,
    nickname: str = "",
    shiny: bool | None = None,
) -> UserPokemon:
    """Capture wild Pokémon at the workout encounter level with matching XP."""
    if shiny is None:
        from pokemon.services.encounter import roll_shiny

        shiny = roll_shiny()

    level = max(1, int(getattr(workout, "encounter_level", None) or 1))
    experience = experience_for_encounter_level(level)
    nature = random.choice(Nature.values)
    user_pokemon = UserPokemon.objects.create(
        user=user,
        species=species,
        nickname=nickname,
        nature=nature,
        shiny=shiny,
        level=level,
        experience=experience,
        captured_at=timezone.now(),
        source_workout=workout,
    )
    PokemonIV.objects.create(
        user_pokemon=user_pokemon,
        hp=random.randint(IV_MIN, IV_MAX),
        attack=random.randint(IV_MIN, IV_MAX),
        defense=random.randint(IV_MIN, IV_MAX),
        sp_attack=random.randint(IV_MIN, IV_MAX),
        sp_defense=random.randint(IV_MIN, IV_MAX),
        speed=random.randint(IV_MIN, IV_MAX),
    )
    return user_pokemon
