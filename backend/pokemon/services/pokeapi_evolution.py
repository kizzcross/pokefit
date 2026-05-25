"""Import evolution chains from PokéAPI into EvolutionChain / EvolutionRule."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from django.db import transaction

from pokemon.models import EvolutionChain, EvolutionRule, PokemonSpecies
from pokemon.services.pokeapi_import import fetch_pokeapi_json


POKEAPI_POKEMON_URL = "https://pokeapi.co/api/v2/pokemon/{pokedex_id}/"
CHAIN_ID_RE = re.compile(r"/evolution-chain/(\d+)/?")
SPECIES_ID_RE = re.compile(r"/pokemon-species/(\d+)/?")


# PokéAPI slugs that differ from seed_gen1 / import_pokemon display names.
POKEAPI_SLUG_ALIASES: dict[str, str] = {
    "nidoran-f": "Nidoran♀",
    "nidoran-m": "Nidoran♂",
    "farfetchd": "Farfetch'd",
    "mr-mime": "Mr. Mime",
}


def species_name_from_api_slug(api_slug: str) -> str:
    """Resolve PokemonSpecies.name from a PokéAPI species slug."""
    slug = str(api_slug).strip().lower()
    if slug in POKEAPI_SLUG_ALIASES:
        return POKEAPI_SLUG_ALIASES[slug]
    return slug.replace("-", " ").title()


@dataclass(frozen=True)
class EvolutionRuleDraft:
    from_name: str
    to_name: str
    from_pokeapi_id: int | None
    to_pokeapi_id: int | None
    trigger: str
    min_level: int | None
    min_affection: int | None
    item_slug: str
    enabled: bool
    priority: int


def _pokeapi_id_from_url(url: str, pattern: re.Pattern[str]) -> int | None:
    match = pattern.search(url or "")
    if not match:
        return None
    return int(match.group(1))


def _species_pokeapi_id(species_dict: dict[str, Any] | None) -> int | None:
    """Extract the species pokedex_id from a chain node's `species.url`."""
    if not species_dict:
        return None
    return _pokeapi_id_from_url(species_dict.get("url") or "", SPECIES_ID_RE)


def _parse_evolution_detail_fields(
    detail: dict[str, Any],
) -> tuple[str, int | None, int | None, str, bool]:
    """Return (trigger, min_level, min_affection, item_slug, enabled)."""
    trigger = (detail.get("trigger") or {}).get("name") or ""
    min_level = detail.get("min_level")
    min_happiness = detail.get("min_happiness")
    item = detail.get("item") or {}
    item_slug = (item.get("name") or "") if isinstance(item, dict) else ""

    parsed_level = int(min_level) if min_level is not None else None
    parsed_affection = int(min_happiness) if min_happiness is not None else None

    if trigger == "level-up" and parsed_level is not None:
        return (trigger, parsed_level, None, "", True)
    if trigger == "level-up" and parsed_affection is not None:
        return (trigger, None, parsed_affection, "", True)
    return (trigger or "other", parsed_level, parsed_affection, item_slug, False)


def _walk_chain(
    node: dict[str, Any],
    *,
    drafts: list[EvolutionRuleDraft],
    priority_counter: list[int],
) -> None:
    from_species = node.get("species") or {}
    from_slug = from_species.get("name")
    if not from_slug:
        return
    from_name = species_name_from_api_slug(from_slug)
    from_id = _species_pokeapi_id(from_species)

    for child in node.get("evolves_to") or []:
        to_species = child.get("species") or {}
        to_slug = to_species.get("name")
        if not to_slug:
            continue
        to_name = species_name_from_api_slug(to_slug)
        to_id = _species_pokeapi_id(to_species)
        details = child.get("evolution_details") or []
        if not details:
            priority_counter[0] += 1
            drafts.append(
                EvolutionRuleDraft(
                    from_name=from_name,
                    to_name=to_name,
                    from_pokeapi_id=from_id,
                    to_pokeapi_id=to_id,
                    trigger="unknown",
                    min_level=None,
                    min_affection=None,
                    item_slug="",
                    enabled=False,
                    priority=priority_counter[0],
                )
            )
        else:
            for detail in details:
                priority_counter[0] += 1
                trigger, min_level, min_affection, item_slug, enabled = (
                    _parse_evolution_detail_fields(detail)
                )
                drafts.append(
                    EvolutionRuleDraft(
                        from_name=from_name,
                        to_name=to_name,
                        from_pokeapi_id=from_id,
                        to_pokeapi_id=to_id,
                        trigger=trigger,
                        min_level=min_level,
                        min_affection=min_affection,
                        item_slug=item_slug,
                        enabled=enabled,
                        priority=priority_counter[0],
                    )
                )
        _walk_chain(child, drafts=drafts, priority_counter=priority_counter)


def parse_evolution_chain(payload: dict[str, Any]) -> list[EvolutionRuleDraft]:
    drafts: list[EvolutionRuleDraft] = []
    priority_counter = [0]
    _walk_chain(payload.get("chain") or {}, drafts=drafts, priority_counter=priority_counter)
    return drafts


def fetch_evolution_chain_url_for_species(species: PokemonSpecies) -> str:
    """Resolve evolution chain URL via PokéAPI (works when DB field is empty)."""
    if species.evolution_chain_url:
        return species.evolution_chain_url
    pokemon_payload = fetch_pokeapi_json(
        POKEAPI_POKEMON_URL.format(pokedex_id=species.pokedex_id)
    )
    species_url = (pokemon_payload.get("species") or {}).get("url")
    if not species_url:
        return ""
    species_payload = fetch_pokeapi_json(species_url)
    return (species_payload.get("evolution_chain") or {}).get("url") or ""


def backfill_evolution_chain_urls(*, limit: int = 0) -> dict[str, int]:
    """Fill evolution_chain_url on species missing it."""
    queryset = PokemonSpecies.objects.filter(evolution_chain_url="").order_by("pokedex_id")
    if limit:
        queryset = queryset[:limit]
    updated = 0
    failed = 0
    for species in queryset:
        try:
            url = fetch_evolution_chain_url_for_species(species)
            if url:
                species.evolution_chain_url = url
                species.save(update_fields=["evolution_chain_url", "modified"])
                updated += 1
            else:
                failed += 1
        except Exception:
            failed += 1
    scanned = updated + failed
    return {"updated": updated, "failed": failed, "scanned": scanned}


@transaction.atomic
def import_evolution_chain_from_url(chain_url: str) -> tuple[EvolutionChain, int, int]:
    payload = fetch_pokeapi_json(chain_url)
    pokeapi_id = _pokeapi_id_from_url(chain_url, CHAIN_ID_RE)
    if pokeapi_id is None:
        pokeapi_id = int(payload.get("id") or 0)

    chain, _ = EvolutionChain.objects.update_or_create(
        pokeapi_id=pokeapi_id,
        defaults={"url": chain_url},
    )

    drafts = parse_evolution_chain(payload)
    pokeapi_ids = {
        pid
        for draft in drafts
        for pid in (draft.from_pokeapi_id, draft.to_pokeapi_id)
        if pid is not None
    }
    names = {
        name
        for draft in drafts
        for name in (draft.from_name, draft.to_name)
        if name
    }

    species_by_pokeapi_id: dict[int, PokemonSpecies] = {
        s.pokedex_id: s
        for s in PokemonSpecies.objects.filter(pokedex_id__in=pokeapi_ids)
    }
    species_by_name: dict[str, PokemonSpecies] = {
        s.name: s for s in PokemonSpecies.objects.filter(name__in=names)
    }

    def _resolve(pokeapi_id: int | None, name: str) -> PokemonSpecies | None:
        if pokeapi_id is not None and pokeapi_id in species_by_pokeapi_id:
            return species_by_pokeapi_id[pokeapi_id]
        return species_by_name.get(name)

    synced = 0
    skipped = 0
    touched_species_ids: set[int] = set()
    for draft in drafts:
        from_species = _resolve(draft.from_pokeapi_id, draft.from_name)
        to_species = _resolve(draft.to_pokeapi_id, draft.to_name)
        if not from_species or not to_species:
            skipped += 1
            continue
        EvolutionRule.objects.update_or_create(
            from_species=from_species,
            to_species=to_species,
            trigger=draft.trigger,
            min_level=draft.min_level,
            min_affection=draft.min_affection,
            item_slug=draft.item_slug,
            defaults={
                "chain": chain,
                "enabled": draft.enabled,
                "priority": draft.priority,
            },
        )
        synced += 1
        touched_species_ids.add(from_species.pk)
        touched_species_ids.add(to_species.pk)

    if touched_species_ids:
        PokemonSpecies.objects.filter(pk__in=touched_species_ids).update(
            evolution_chain=chain
        )

    return chain, synced, skipped
