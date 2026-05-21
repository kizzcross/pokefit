import json
from dataclasses import dataclass
from enum import Enum
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

from django.db import transaction

from pokemon.choices import PokemonType
from pokemon.models import PokemonEV, PokemonIV, PokemonSpecies, UserPokemon
from pokemon.services.rarity import compute_rarity_from_base_stats
from pokemon.services.sprites import extract_pixel_sprite_url

DEFAULT_REQUEST_TIMEOUT = 10
POKEAPI_POKEMON_URL = "https://pokeapi.co/api/v2/pokemon/{pokedex_id}"

STAT_FIELD_MAP = {
    "hp": "base_hp",
    "attack": "base_attack",
    "defense": "base_defense",
    "special-attack": "base_sp_attack",
    "special-defense": "base_sp_defense",
    "speed": "base_speed",
}

VALID_POKEMON_TYPES = {choice.value for choice in PokemonType}


class ImportStatus(Enum):
    CREATED = "created"
    UPDATED = "updated"
    FAILED = "failed"


@dataclass(frozen=True)
class ImportSpeciesResult:
    pokedex_id: int
    status: ImportStatus
    name: str | None = None
    error: str | None = None


def fetch_pokeapi_json(url: str, *, timeout: int = DEFAULT_REQUEST_TIMEOUT) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": "pokefit-importer/1.0"})
    opener = build_opener(ProxyHandler({}))
    with opener.open(request, timeout=timeout) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def _normalize_type(type_name: str) -> str:
    normalized = type_name.strip().lower()
    if normalized not in VALID_POKEMON_TYPES:
        raise ValueError(f"Unsupported Pokémon type: {type_name}")
    return normalized


def _extract_base_stats(pokemon_payload: dict[str, Any]) -> dict[str, int]:
    base_stats: dict[str, int] = {}
    for stat_entry in pokemon_payload.get("stats", []):
        stat_name = stat_entry.get("stat", {}).get("name")
        field_name = STAT_FIELD_MAP.get(stat_name)
        if field_name:
            base_stats[field_name] = int(stat_entry["base_stat"])
    missing_stats = set(STAT_FIELD_MAP.values()) - set(base_stats)
    if missing_stats:
        raise ValueError(f"Missing base stats: {', '.join(sorted(missing_stats))}")
    return base_stats


def parse_pokeapi_species_data(
    pokemon_payload: dict[str, Any],
    species_payload: dict[str, Any],
) -> dict[str, Any]:
    """Map PokéAPI pokemon + species payloads to PokemonSpecies field values."""
    types = [_normalize_type(entry["type"]["name"]) for entry in pokemon_payload.get("types", [])]
    type_1 = types[0] if types else PokemonType.NORMAL
    type_2 = types[1] if len(types) > 1 else ""

    pokedex_id = int(pokemon_payload["id"])
    base_stats = _extract_base_stats(pokemon_payload)
    evolution_chain = species_payload.get("evolution_chain") or {}

    return {
        "pokedex_id": pokedex_id,
        "name": str(pokemon_payload["name"]).replace("-", " ").title(),
        "type_1": type_1,
        "type_2": type_2,
        "sprite_url": extract_pixel_sprite_url(pokemon_payload, pokedex_id),
        "official_artwork_url": "",
        "evolution_chain_url": evolution_chain.get("url") or "",
        "rarity": compute_rarity_from_base_stats(**base_stats),
        **base_stats,
    }


def clear_pokemon_catalog() -> dict[str, int]:
    """Remove all user Pokémon and species (full catalog reset)."""
    with transaction.atomic():
        iv_count, _ = PokemonIV.objects.all().delete()
        ev_count, _ = PokemonEV.objects.all().delete()
        user_count, _ = UserPokemon.objects.all().delete()
        species_count, _ = PokemonSpecies.objects.all().delete()
    return {
        "species": species_count,
        "user_pokemon": user_count,
        "ivs": iv_count,
        "evs": ev_count,
    }


def import_pokemon_species(
    pokedex_id: int,
    *,
    timeout: int = DEFAULT_REQUEST_TIMEOUT,
) -> ImportSpeciesResult:
    try:
        pokemon_payload = fetch_pokeapi_json(
            POKEAPI_POKEMON_URL.format(pokedex_id=pokedex_id),
            timeout=timeout,
        )
        species_url = pokemon_payload.get("species", {}).get("url")
        if not species_url:
            raise ValueError("Pokémon payload is missing species URL.")

        species_payload = fetch_pokeapi_json(species_url, timeout=timeout)
        species_data = parse_pokeapi_species_data(pokemon_payload, species_payload)

        with transaction.atomic():
            lookup_id = species_data.pop("pokedex_id")
            species, created = PokemonSpecies.objects.update_or_create(
                pokedex_id=lookup_id,
                defaults=species_data,
            )

        status = ImportStatus.CREATED if created else ImportStatus.UPDATED
        return ImportSpeciesResult(
            pokedex_id=species.pokedex_id,
            status=status,
            name=species.name,
        )
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
        return ImportSpeciesResult(
            pokedex_id=pokedex_id,
            status=ImportStatus.FAILED,
            error=str(exc),
        )
