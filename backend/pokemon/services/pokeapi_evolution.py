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


def _parse_evolution_detail(detail: dict[str, Any], priority: int) -> EvolutionRuleDraft | None:
    trigger = (detail.get("trigger") or {}).get("name") or ""
    min_level = detail.get("min_level")
    min_happiness = detail.get("min_happiness")
    item = detail.get("item") or {}
    item_slug = (item.get("name") or "") if isinstance(item, dict) else ""

    if trigger == "level-up" and min_level is not None:
        return EvolutionRuleDraft(
            from_name="",
            to_name="",
            trigger=trigger,
            min_level=int(min_level),
            min_affection=None,
            item_slug="",
            enabled=True,
            priority=priority,
        )
    if trigger == "level-up" and min_happiness is not None:
        return EvolutionRuleDraft(
            from_name="",
            to_name="",
            trigger=trigger,
            min_level=None,
            min_affection=int(min_happiness),
            item_slug="",
            enabled=True,
            priority=priority,
        )
    return EvolutionRuleDraft(
        from_name="",
        to_name="",
        trigger=trigger or "other",
        min_level=int(min_level) if min_level is not None else None,
        min_affection=int(min_happiness) if min_happiness is not None else None,
        item_slug=item_slug,
        enabled=False,
        priority=priority,
    )


def _walk_chain(
    node: dict[str, Any],
    *,
    drafts: list[EvolutionRuleDraft],
    priority_counter: list[int],
) -> None:
    from_slug = (node.get("species") or {}).get("name")
    if not from_slug:
        return
    from_name = species_name_from_api_slug(from_slug)

    for child in node.get("evolves_to") or []:
        to_slug = (child.get("species") or {}).get("name")
        if not to_slug:
            continue
        to_name = species_name_from_api_slug(to_slug)
        details = child.get("evolution_details") or []
        if not details:
            priority_counter[0] += 1
            drafts.append(
                EvolutionRuleDraft(
                    from_name=from_name,
                    to_name=to_name,
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
                parsed = _parse_evolution_detail(detail, priority_counter[0])
                if parsed:
                    drafts.append(
                        EvolutionRuleDraft(
                            from_name=from_name,
                            to_name=to_name,
                            trigger=parsed.trigger,
                            min_level=parsed.min_level,
                            min_affection=parsed.min_affection,
                            item_slug=parsed.item_slug,
                            enabled=parsed.enabled,
                            priority=parsed.priority,
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
    names = {name for draft in drafts for name in (draft.from_name, draft.to_name)}
    species_by_name = {s.name: s for s in PokemonSpecies.objects.filter(name__in=names)}

    synced = 0
    skipped = 0
    for draft in drafts:
        from_species = species_by_name.get(draft.from_name)
        to_species = species_by_name.get(draft.to_name)
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
        PokemonSpecies.objects.filter(pk=from_species.pk).update(evolution_chain=chain)
        PokemonSpecies.objects.filter(pk=to_species.pk).update(evolution_chain=chain)

    return chain, synced, skipped
