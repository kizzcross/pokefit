"""Helpers for reasoning about evolution rules.

Used to enforce that a Pokémon never appears below the level at which it could
have evolved (e.g. a Dragonite below level 55).
"""

from __future__ import annotations

from pokemon.models import EvolutionRule


def get_min_capture_level(species_id: int) -> int:
    """Return the minimum legal level for a species based on evolution rules.

    Walks every incoming `level-up` rule (`to_species=species`) and recursively
    asks the same question for the pre-evolution. The species' floor is the
    max over all branches of `max(rule.min_level, floor(from_species))`.

    - Species without an incoming enabled rule with `min_level` return `1`.
    - Cycles (which shouldn't exist in canonical data but we guard anyway) are
      broken by short-circuiting visited ids.

    The result is the smallest level at which a wild encounter / gift of this
    species would be canonically possible.
    """
    return _walk(species_id, visited=set())


def _walk(species_id: int, *, visited: set[int]) -> int:
    if species_id in visited:
        return 1
    visited = visited | {species_id}

    rules = list(
        EvolutionRule.objects.filter(
            to_species_id=species_id,
            enabled=True,
            min_level__isnull=False,
        ).values("from_species_id", "min_level")
    )
    if not rules:
        return 1

    best = 1
    for rule in rules:
        candidate = int(rule["min_level"] or 1)
        parent_floor = _walk(int(rule["from_species_id"]), visited=visited)
        best = max(best, candidate, parent_floor)
    return best
