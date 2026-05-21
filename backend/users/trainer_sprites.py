import json
import re
from functools import lru_cache
from pathlib import Path

SHOWDOWN_TRAINER_CDN = "https://play.pokemonshowdown.com/sprites/trainers"
DEFAULT_TRAINER_SPRITE = "red"
SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,127}$", re.IGNORECASE)

_DATA_PATH = Path(__file__).resolve().parent / "data" / "trainer_sprites.json"


@lru_cache(maxsize=1)
def allowed_trainer_slugs() -> frozenset[str]:
    raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return frozenset(raw)


def trainer_sprite_url(slug: str | None) -> str | None:
    if not slug:
        return None
    return f"{SHOWDOWN_TRAINER_CDN}/{slug}.png"


def normalize_trainer_slug(value: str | None) -> str:
    slug = (value or "").strip().lower().removesuffix(".png")
    if not slug:
        return DEFAULT_TRAINER_SPRITE
    if slug not in allowed_trainer_slugs():
        raise ValueError(f"Sprite de treinador inválido: {slug}")
    if not SLUG_PATTERN.match(slug):
        raise ValueError("Identificador de sprite inválido.")
    return slug


def trainer_sprite_for_user(user) -> str:
    slug = getattr(user, "trainer_sprite", None) or ""
    slug = slug.strip().lower()
    if slug and slug in allowed_trainer_slugs():
        return slug
    return DEFAULT_TRAINER_SPRITE
