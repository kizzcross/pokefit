"""Pixel sprite URLs from the PokeAPI/sprites GitHub repo (not pokeapi.co media)."""

from __future__ import annotations

from typing import Any

SPRITES_CDN_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites"

# Retro sheets that exist on the sprites repo (firered-leafgreen does NOT).
PIXEL_SPRITE_VERSIONS: tuple[tuple[str, str], ...] = (
    ("generation-viii", "icons"),
    ("generation-vii", "icons"),
    ("generation-v", "black-white"),
    ("generation-iii", "emerald"),
    ("generation-ii", "crystal"),
    ("generation-i", "red-blue"),
    ("generation-i", "yellow"),
)

# Broken path we used before — rewrite on read/import.
DEPRECATED_SPRITE_MARKERS = ("firered-leafgreen", "leafgreen", "firered/")


def default_pixel_sprite_url(pokedex_id: int) -> str:
    """Classic 96×96 front sprite — always present for national dex ids."""
    return f"{SPRITES_CDN_BASE}/pokemon/{pokedex_id}.png"


def versioned_pixel_sprite_url(pokedex_id: int, generation: str, game: str) -> str:
    return f"{SPRITES_CDN_BASE}/pokemon/versions/{generation}/{game}/{pokedex_id}.png"


def pixel_sprite_fallback_chain(pokedex_id: int) -> list[str]:
    urls = [
        versioned_pixel_sprite_url(pokedex_id, generation, game)
        for generation, game in PIXEL_SPRITE_VERSIONS
    ]
    urls.append(default_pixel_sprite_url(pokedex_id))
    return urls


def extract_pixel_sprite_url(pokemon_payload: dict[str, Any], pokedex_id: int) -> str:
    sprites = pokemon_payload.get("sprites") or {}
    versions = sprites.get("versions") or {}

    for generation, game in PIXEL_SPRITE_VERSIONS:
        generation_sprites = versions.get(generation) or {}
        game_sprites = generation_sprites.get(game) or {}
        pixel_url = game_sprites.get("front_default") or ""
        if pixel_url and not _is_deprecated_sprite_url(pixel_url):
            return pixel_url

    front_default = sprites.get("front_default") or ""
    if front_default and "raw.githubusercontent.com" in front_default:
        return front_default

    return default_pixel_sprite_url(pokedex_id)


def _is_deprecated_sprite_url(url: str) -> bool:
    return any(marker in url for marker in DEPRECATED_SPRITE_MARKERS)


def normalize_sprite_url(url: str | None, pokedex_id: int) -> str:
    if not url or _is_deprecated_sprite_url(url):
        return default_pixel_sprite_url(pokedex_id)
    if url.startswith("http"):
        return url
    return default_pixel_sprite_url(pokedex_id)
