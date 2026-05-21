from django.contrib.auth import get_user_model

from pokemon.models import UserPokemon
from social.services.friends import accepted_friend_ids
from workouts.choices import WorkoutStatus
from workouts.models import Workout

User = get_user_model()


def _actor_payload(user) -> dict:
    from social.services.friends import user_public_profile

    return user_public_profile(user, include_email=True)


def _events_from_workout(
    workout: Workout,
    user,
    capture: UserPokemon | None,
    *,
    include_proof_photos: bool,
) -> list[dict]:
    actor = _actor_payload(user)
    events: list[dict] = []

    proof_url = None
    if include_proof_photos and workout.proof_photo:
        proof_url = workout.proof_photo.url

    species = workout.encounter_species
    encounter = None
    if species:
        encounter = {
            "species_name": species.name,
            "species_pokedex_id": species.pokedex_id,
            "species_sprite": species.sprite_url,
            "status": workout.encounter_status or "",
            "captured": capture is not None,
            "shiny": capture.shiny if capture else False,
        }

    events.append(
        {
            "type": "workout_finished",
            "at": workout.ended_at.isoformat(),
            "actor": actor,
            "workout": {
                "id": workout.pk,
                "workout_type": workout.workout_type,
                "total_volume": str(workout.total_volume),
                "perceived_effort": workout.perceived_effort,
                "proof_photo_url": proof_url,
                "proof_caption": workout.proof_caption if include_proof_photos else "",
                "duration_minutes": workout.duration_minutes,
            },
            "encounter": encounter,
        }
    )

    if capture:
        events.append(
            {
                "type": "pokemon_captured",
                "at": capture.captured_at.isoformat(),
                "actor": actor,
                "workout": {"id": workout.pk, "workout_type": workout.workout_type},
                "pokemon": {
                    "id": capture.pk,
                    "display_name": capture.nickname or capture.species.name,
                    "species_name": capture.species.name,
                    "species_pokedex_id": capture.species.pokedex_id,
                    "species_sprite": capture.species.sprite_url,
                    "shiny": capture.shiny,
                },
            }
        )

    return events


def build_timeline_events(user, *, include_proof_photos: bool = True, limit: int = 30) -> list[dict]:
    workouts = (
        Workout.objects.filter(user=user, status=WorkoutStatus.FINISHED)
        .exclude(ended_at__isnull=True)
        .select_related("encounter_species")
        .prefetch_related("exercises")
        .order_by("-ended_at")[:limit]
    )

    workout_list = list(workouts)
    workout_ids = [w.pk for w in workout_list]
    captures = {
        c.source_workout_id: c
        for c in UserPokemon.objects.filter(user=user, source_workout_id__in=workout_ids).select_related(
            "species"
        )
    }

    events: list[dict] = []
    for workout in workout_list:
        events.extend(
            _events_from_workout(
                workout,
                user,
                captures.get(workout.pk),
                include_proof_photos=include_proof_photos,
            )
        )

    events.sort(key=lambda item: item["at"], reverse=True)
    return events[:limit]


def build_feed_timeline_events(viewer, *, include_proof_photos: bool = True, limit: int = 40) -> list[dict]:
    """Timeline do viewer + todos os amigos aceitos, ordenada por data."""
    user_ids = [viewer.pk, *accepted_friend_ids(viewer)]
    users_by_id = {u.pk: u for u in User.objects.filter(pk__in=user_ids)}

    workouts = list(
        Workout.objects.filter(user_id__in=user_ids, status=WorkoutStatus.FINISHED)
        .exclude(ended_at__isnull=True)
        .select_related("encounter_species", "user")
        .prefetch_related("exercises")
        .order_by("-ended_at")[: limit * 2]
    )

    if not workouts:
        return []

    workout_ids = [w.pk for w in workouts]
    captures = {
        (c.user_id, c.source_workout_id): c
        for c in UserPokemon.objects.filter(
            user_id__in=user_ids,
            source_workout_id__in=workout_ids,
        ).select_related("species")
    }

    events: list[dict] = []
    for workout in workouts:
        owner = users_by_id.get(workout.user_id) or workout.user
        events.extend(
            _events_from_workout(
                workout,
                owner,
                captures.get((workout.user_id, workout.pk)),
                include_proof_photos=include_proof_photos,
            )
        )

    events.sort(key=lambda item: item["at"], reverse=True)
    return events[:limit]
