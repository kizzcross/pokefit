from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from enum import Enum
from html import unescape
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import ProxyHandler, Request, build_opener

from django.db import IntegrityError, transaction

from workouts.choices import ExerciseDifficulty, ExerciseMuscleGroup
from workouts.models import Exercise

DEFAULT_REQUEST_TIMEOUT = 15
WGER_API_BASE = "https://wger.de/api/v2"
WGER_PAGE_SIZE = 50
REQUEST_DELAY_SECONDS = 0.15

# wger.de language ids (see /api/v2/language/)
WGER_LANGUAGE_IDS = {
    "pt": 7,
    "en": 2,
    "de": 1,
    "es": 4,
}

# wger exercisecategory id -> internal muscle_group
WGER_CATEGORY_TO_MUSCLE_GROUP: dict[int, str] = {
    10: ExerciseMuscleGroup.CORE,  # Abs
    8: ExerciseMuscleGroup.ARMS,
    12: ExerciseMuscleGroup.BACK,
    14: ExerciseMuscleGroup.LEGS,  # Calves
    15: ExerciseMuscleGroup.CARDIO,
    11: ExerciseMuscleGroup.CHEST,
    9: ExerciseMuscleGroup.LEGS,
    13: ExerciseMuscleGroup.SHOULDERS,
}

# Gym-focused import skips cardio unless explicitly included.
WGER_CARDIO_CATEGORY_ID = 15

MUSCLE_NAME_EN_TO_GROUP: dict[str, str] = {
    "abs": ExerciseMuscleGroup.CORE,
    "quads": ExerciseMuscleGroup.LEGS,
    "glutes": ExerciseMuscleGroup.LEGS,
    "shoulders": ExerciseMuscleGroup.SHOULDERS,
    "chest": ExerciseMuscleGroup.CHEST,
    "biceps": ExerciseMuscleGroup.ARMS,
    "triceps": ExerciseMuscleGroup.ARMS,
    "lats": ExerciseMuscleGroup.BACK,
    "calves": ExerciseMuscleGroup.LEGS,
    "hamstrings": ExerciseMuscleGroup.LEGS,
}


class ImportStatus(Enum):
    CREATED = "created"
    UPDATED = "updated"
    SKIPPED = "skipped"
    FAILED = "failed"


@dataclass(frozen=True)
class ImportExerciseResult:
    wger_id: int
    status: ImportStatus
    name: str | None = None
    reason: str | None = None


def fetch_wger_json(url: str, *, timeout: int = DEFAULT_REQUEST_TIMEOUT) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": "pokefit-importer/1.0", "Accept": "application/json"})
    opener = build_opener(ProxyHandler({}))
    with opener.open(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def wger_slug(wger_id: int) -> str:
    return f"wger-{wger_id}"


def html_to_plain(text: str) -> str:
    if not text:
        return ""
    plain = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    plain = re.sub(r"</p\s*>", "\n", plain, flags=re.IGNORECASE)
    plain = re.sub(r"<li\s*>", "- ", plain, flags=re.IGNORECASE)
    plain = re.sub(r"<[^>]+>", "", plain)
    plain = unescape(plain)
    plain = re.sub(r"[ \t]+\n", "\n", plain)
    plain = re.sub(r"\n{3,}", "\n\n", plain)
    return plain.strip()


def resolve_language_id(language: str) -> int:
    code = (language or "pt").strip().lower()
    if code not in WGER_LANGUAGE_IDS:
        raise ValueError(f"Unsupported language '{language}'. Use: {', '.join(WGER_LANGUAGE_IDS)}.")
    return WGER_LANGUAGE_IDS[code]


def pick_translation(
    exercise_info: dict[str, Any],
    *,
    language_id: int,
    fallback_language_id: int = WGER_LANGUAGE_IDS["en"],
) -> dict[str, Any] | None:
    translations = exercise_info.get("translations") or []
    for preferred in (language_id, fallback_language_id):
        for entry in translations:
            if entry.get("language") == preferred and (entry.get("name") or "").strip():
                return entry
    for entry in translations:
        if (entry.get("name") or "").strip():
            return entry
    return None


def map_muscle_group(exercise_info: dict[str, Any]) -> str:
    category = exercise_info.get("category") or {}
    category_id = category.get("id")
    if category_id in WGER_CATEGORY_TO_MUSCLE_GROUP:
        return WGER_CATEGORY_TO_MUSCLE_GROUP[category_id]

    muscles = exercise_info.get("muscles") or []
    if muscles:
        name_en = (muscles[0].get("name_en") or muscles[0].get("name") or "").strip().lower()
        for key, group in MUSCLE_NAME_EN_TO_GROUP.items():
            if key in name_en:
                return group

    return ExerciseMuscleGroup.FULL_BODY


def map_equipment(exercise_info: dict[str, Any]) -> str:
    equipment_items = exercise_info.get("equipment") or []
    names = []
    for item in equipment_items:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        if "bodyweight" in name.lower():
            names.append("bodyweight")
        else:
            names.append(name)
    return ", ".join(dict.fromkeys(names))[:128]


def map_video_url(exercise_info: dict[str, Any]) -> str:
    videos = exercise_info.get("videos") or []
    for video in videos:
        url = (video.get("video") or video.get("url") or "").strip()
        if url.startswith("http"):
            return url[:512]
    return ""


def parse_wger_exercise(
    exercise_info: dict[str, Any],
    *,
    language_id: int,
) -> dict[str, Any] | None:
    translation = pick_translation(exercise_info, language_id=language_id)
    if not translation:
        return None

    name = (translation.get("name") or "").strip()
    if len(name) < 2:
        return None

    description_html = translation.get("description") or translation.get("description_source") or ""
    instructions = html_to_plain(description_html)
    short_description = instructions.replace("\n", " ").strip()[:255]

    wger_id = int(exercise_info["id"])
    return {
        "slug": wger_slug(wger_id),
        "name": name[:128],
        "description": short_description,
        "instructions": instructions,
        "muscle_group": map_muscle_group(exercise_info),
        "difficulty": ExerciseDifficulty.BEGINNER,
        "equipment": map_equipment(exercise_info),
        "video_url": map_video_url(exercise_info),
        "is_active": True,
    }


def _upsert_exercise(slug: str, data: dict[str, Any], *, wger_id: int) -> tuple[Exercise, bool]:
    try:
        return Exercise.objects.update_or_create(slug=slug, defaults=data)
    except IntegrityError:
        # name is unique — disambiguate when two wger entries share the same label.
        data = {**data, "name": f"{data['name'][:120]} ({wger_id})"[:128]}
        return Exercise.objects.update_or_create(slug=slug, defaults=data)


def import_wger_exercise(
    exercise_info: dict[str, Any],
    *,
    language_id: int,
    gym_only: bool = True,
) -> ImportExerciseResult:
    wger_id = int(exercise_info.get("id") or 0)
    try:
        category_id = (exercise_info.get("category") or {}).get("id")
        if gym_only and category_id == WGER_CARDIO_CATEGORY_ID:
            return ImportExerciseResult(
                wger_id=wger_id,
                status=ImportStatus.SKIPPED,
                reason="cardio (use --include-cardio)",
            )

        parsed = parse_wger_exercise(exercise_info, language_id=language_id)
        if not parsed:
            return ImportExerciseResult(
                wger_id=wger_id,
                status=ImportStatus.SKIPPED,
                reason="sem tradução/nome",
            )

        lookup_slug = parsed.pop("slug")
        with transaction.atomic():
            exercise, created = _upsert_exercise(lookup_slug, parsed, wger_id=wger_id)

        status = ImportStatus.CREATED if created else ImportStatus.UPDATED
        return ImportExerciseResult(wger_id=wger_id, status=status, name=exercise.name)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
        return ImportExerciseResult(
            wger_id=wger_id,
            status=ImportStatus.FAILED,
            reason=str(exc),
        )


def iter_wger_exerciseinfo(
    *,
    language_id: int,
    limit: int | None = None,
    timeout: int = DEFAULT_REQUEST_TIMEOUT,
) -> list[dict[str, Any]]:
    """Fetch exerciseinfo pages from wger (single language filter on API)."""
    collected: list[dict[str, Any]] = []
    offset = 0

    while True:
        if limit is not None and len(collected) >= limit:
            return collected[:limit]

        page_limit = WGER_PAGE_SIZE
        if limit is not None:
            page_limit = min(WGER_PAGE_SIZE, limit - len(collected))

        query = urlencode({"language": language_id, "limit": page_limit, "offset": offset})
        url = f"{WGER_API_BASE}/exerciseinfo/?{query}"
        payload = fetch_wger_json(url, timeout=timeout)
        results = payload.get("results") or []
        if not results:
            break

        collected.extend(results)
        offset += len(results)

        if not payload.get("next"):
            break

        time.sleep(REQUEST_DELAY_SECONDS)

    return collected if limit is None else collected[:limit]
