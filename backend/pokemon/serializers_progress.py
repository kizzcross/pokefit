from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from pokemon.services.progression import EvolutionPreview


class EvolutionPreviewSerializer(serializers.Serializer):
    species_name = serializers.CharField()
    pokedex_id = serializers.IntegerField()
    trigger = serializers.CharField()
    requires_level = serializers.IntegerField(allow_null=True, required=False)
    requires_affection = serializers.IntegerField(allow_null=True, required=False)

    @classmethod
    def from_preview(cls, preview: EvolutionPreview | None):
        if preview is None:
            return None
        return cls(preview).data


class PokemonProgressMixin(serializers.Serializer):
    experience_to_next_level = serializers.SerializerMethodField()
    experience_progress_percent = serializers.SerializerMethodField()
    affection_max = serializers.SerializerMethodField()
    affection_progress_percent = serializers.SerializerMethodField()
    can_evolve = serializers.SerializerMethodField()
    next_evolution = serializers.SerializerMethodField()

    @extend_schema_field(serializers.IntegerField())
    def get_experience_to_next_level(self, obj):
        return get_progress_metadata_for(obj)["experience_to_next_level"]

    @extend_schema_field(serializers.FloatField())
    def get_experience_progress_percent(self, obj):
        return get_progress_metadata_for(obj)["experience_progress_percent"]

    @extend_schema_field(serializers.IntegerField())
    def get_affection_max(self, obj):
        return get_progress_metadata_for(obj)["affection_max"]

    @extend_schema_field(serializers.FloatField())
    def get_affection_progress_percent(self, obj):
        return get_progress_metadata_for(obj)["affection_progress_percent"]

    @extend_schema_field(serializers.BooleanField())
    def get_can_evolve(self, obj):
        return get_progress_metadata_for(obj)["can_evolve"]

    @extend_schema_field(EvolutionPreviewSerializer(allow_null=True))
    def get_next_evolution(self, obj):
        preview = get_progress_metadata_for(obj)["next_evolution"]
        if preview is None:
            return None
        return EvolutionPreviewSerializer(preview).data


def get_progress_metadata_for(obj) -> dict:
    cache = getattr(obj, "_progress_metadata_cache", None)
    if cache is not None:
        return cache
    from pokemon.services.progression import get_progress_metadata

    metadata = get_progress_metadata(obj)
    obj._progress_metadata_cache = metadata
    return metadata
