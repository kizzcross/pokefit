import importlib.util
import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from django.core.files import File
from django.db import transaction

from workouts.choices import ExerciseDifficulty, ExerciseMuscleGroup
from workouts.models import Exercise


class SeedStatus(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    SKIPPED = "skipped"
    FAILED = "failed"


@dataclass
class SeedResult:
    status: SeedStatus
    name: str
    reason: str = ""


REQUIRED_FIELDS = ("name", "muscle_group", "difficulty")

ALLOWED_MUSCLE_GROUPS = {c.value for c in ExerciseMuscleGroup}
ALLOWED_DIFFICULTIES = {c.value for c in ExerciseDifficulty}


def load_exercises_from_file(path: Path) -> list[dict]:
    path = path.resolve()
    if not path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")

    suffix = path.suffix.lower()
    if suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("JSON deve ser uma lista de objetos.")
        return data

    if suffix == ".py":
        spec = importlib.util.spec_from_file_location("exercises_seed_module", path)
        if spec is None or spec.loader is None:
            raise ValueError(f"Não foi possível carregar: {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        exercises = getattr(module, "EXERCISES", None)
        if exercises is None:
            raise ValueError(f"{path} deve definir EXERCISES = [...]")
        if not isinstance(exercises, list):
            raise ValueError("EXERCISES deve ser uma lista.")
        return exercises

    raise ValueError("Formato não suportado. Use .py (EXERCISES) ou .json (lista).")


def _resolve_image_path(raw_path: str, seed_file: Path | None) -> Path | None:
    if not raw_path or not str(raw_path).strip():
        return None
    p = Path(raw_path.strip())
    if p.is_absolute() and p.exists():
        return p
    if seed_file is not None:
        candidate = (seed_file.parent / p).resolve()
        if candidate.exists():
            return candidate
    candidate = Path.cwd() / p
    if candidate.exists():
        return candidate
    return None


def _validate_entry(entry: dict, index: int) -> str | None:
    if not isinstance(entry, dict):
        return f"Item {index}: deve ser um dict."

    for field in REQUIRED_FIELDS:
        if not entry.get(field):
            return f"Item {index}: campo obrigatório '{field}' ausente."

    muscle = entry["muscle_group"]
    if muscle not in ALLOWED_MUSCLE_GROUPS:
        return (
            f"Item {index} ({entry.get('name')}): muscle_group '{muscle}' inválido. "
            f"Use: {', '.join(sorted(ALLOWED_MUSCLE_GROUPS))}"
        )

    difficulty = entry["difficulty"]
    if difficulty not in ALLOWED_DIFFICULTIES:
        return (
            f"Item {index} ({entry.get('name')}): difficulty '{difficulty}' inválida. "
            f"Use: {', '.join(sorted(ALLOWED_DIFFICULTIES))}"
        )

    return None


def _find_existing(entry: dict) -> Exercise | None:
    slug = (entry.get("slug") or "").strip()
    if slug:
        found = Exercise.objects.filter(slug=slug).first()
        if found:
            return found
    name = entry["name"].strip()
    return Exercise.objects.filter(name=name).first()


def _apply_fields(exercise: Exercise, entry: dict) -> None:
    exercise.name = entry["name"].strip()
    if entry.get("slug"):
        exercise.slug = entry["slug"].strip()
    exercise.description = (entry.get("description") or "")[:255]
    exercise.instructions = entry.get("instructions") or ""
    exercise.muscle_group = entry["muscle_group"]
    exercise.difficulty = entry["difficulty"]
    exercise.equipment = entry.get("equipment") or ""
    exercise.video_url = entry.get("video_url") or ""
    if "is_active" in entry:
        exercise.is_active = bool(entry["is_active"])


def ingest_exercise_entry(
    entry: dict,
    *,
    seed_file: Path | None = None,
    update_existing: bool = True,
    dry_run: bool = False,
) -> SeedResult:
    name = (entry.get("name") or "").strip()
    error = _validate_entry(entry, 0)
    if error:
        return SeedResult(SeedStatus.FAILED, name or "?", error)

    existing = _find_existing(entry)
    image_path = _resolve_image_path(entry.get("image_path") or "", seed_file)

    if existing and not update_existing:
        return SeedResult(SeedStatus.SKIPPED, name, "já existe (use update ou remova --create-only)")

    if dry_run:
        action = "atualizar" if existing else "criar"
        return SeedResult(
            SeedStatus.UPDATED if existing else SeedStatus.CREATED,
            name,
            f"[dry-run] {action}",
        )

    try:
        with transaction.atomic():
            if existing:
                _apply_fields(existing, entry)
                exercise = existing
                status = SeedStatus.UPDATED
            else:
                exercise = Exercise(
                    name=name,
                    slug=(entry.get("slug") or "").strip() or None,
                    description=(entry.get("description") or "")[:255],
                    instructions=entry.get("instructions") or "",
                    muscle_group=entry["muscle_group"],
                    difficulty=entry["difficulty"],
                    equipment=entry.get("equipment") or "",
                    video_url=entry.get("video_url") or "",
                    is_active=entry.get("is_active", True),
                )
                status = SeedStatus.CREATED

            if image_path is not None:
                with image_path.open("rb") as image_file:
                    exercise.image.save(image_path.name, File(image_file), save=False)

            exercise.save()
    except Exception as exc:
        return SeedResult(SeedStatus.FAILED, name, str(exc))

    return SeedResult(status, name)


def ingest_exercises_list(
    exercises: list[dict],
    *,
    seed_file: Path | None = None,
    update_existing: bool = True,
    dry_run: bool = False,
) -> list[SeedResult]:
    results: list[SeedResult] = []

    for index, entry in enumerate(exercises):
        err = _validate_entry(entry, index)
        if err:
            results.append(SeedResult(SeedStatus.FAILED, str(entry.get("name", "?")), err))
            continue
        results.append(
            ingest_exercise_entry(
                entry,
                seed_file=seed_file,
                update_existing=update_existing,
                dry_run=dry_run,
            )
        )

    return results


def ingest_exercises_file(
    path: Path,
    *,
    update_existing: bool = True,
    dry_run: bool = False,
) -> list[SeedResult]:
    exercises = load_exercises_from_file(path)
    return ingest_exercises_list(
        exercises,
        seed_file=path,
        update_existing=update_existing,
        dry_run=dry_run,
    )
