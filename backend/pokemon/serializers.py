from rest_framework import serializers

from .constants import TEAM_SLOT_MAX, TEAM_SLOT_MIN
from .models import PokemonIV, PokemonSpecies, UserPokemon
from .serializers_progress import EvolutionPreviewSerializer, PokemonProgressMixin
from .services.progression import EvolutionPreview, TeamPokemonGain, WorkoutTeamRewards
from .services.sprites import normalize_sprite_url


class PokemonSpeciesSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PokemonSpecies
        fields = [  # noqa: RUF012
            "id",
            "pokedex_id",
            "name",
            "type_1",
            "type_2",
            "base_hp",
            "base_attack",
            "base_defense",
            "base_sp_attack",
            "base_sp_defense",
            "base_speed",
            "sprite_url",
            "official_artwork_url",
            "rarity",
            "image_url",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = normalize_sprite_url(obj.sprite_url, obj.pokedex_id)
        if not url:
            return None
        if url.startswith("http"):
            return url
        if request:
            return request.build_absolute_uri(url)
        return url


class PokemonIVSerializer(serializers.ModelSerializer):
    class Meta:
        model = PokemonIV
        fields = ("hp", "attack", "defense", "sp_attack", "sp_defense", "speed")


class UserPokemonListSerializer(PokemonProgressMixin, serializers.ModelSerializer):
    species = PokemonSpeciesSerializer(read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = UserPokemon
        fields = [  # noqa: RUF012
            "id",
            "species",
            "nickname",
            "display_name",
            "level",
            "experience",
            "experience_to_next_level",
            "experience_progress_percent",
            "nature",
            "shiny",
            "active_team_slot",
            "affection",
            "affection_max",
            "affection_progress_percent",
            "can_evolve",
            "next_evolution",
            "captured_at",
        ]

    def get_display_name(self, obj):
        return obj.nickname or obj.species.name


class UserPokemonDetailSerializer(serializers.ModelSerializer):
    species = PokemonSpeciesSerializer(read_only=True)
    ivs = PokemonIVSerializer(read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = UserPokemon
        fields = [  # noqa: RUF012
            "id",
            "species",
            "nickname",
            "display_name",
            "level",
            "experience",
            "nature",
            "shiny",
            "active_team_slot",
            "affection",
            "captured_at",
            "ivs",
            "created",
            "modified",
        ]

    def get_display_name(self, obj):
        return obj.nickname or obj.species.name


class UserPokemonCaptureSerializer(serializers.Serializer):
    species_id = serializers.PrimaryKeyRelatedField(queryset=PokemonSpecies.objects.all(), source="species")
    nickname = serializers.CharField(required=False, allow_blank=True, default="")
    shiny = serializers.BooleanField(default=False)
    source_workout_id = serializers.IntegerField()


class TeamPokemonGainSerializer(serializers.Serializer):
    pokemon_id = serializers.IntegerField()
    display_name = serializers.CharField()
    xp_added = serializers.IntegerField()
    affection_added = serializers.IntegerField()
    level_before = serializers.IntegerField()
    level_after = serializers.IntegerField()
    evolved = serializers.BooleanField()
    evolved_to = EvolutionPreviewSerializer(allow_null=True, required=False)

    @classmethod
    def from_gain(cls, gain: TeamPokemonGain):
        data = {
            "pokemon_id": gain.pokemon_id,
            "display_name": gain.display_name,
            "xp_added": gain.xp_added,
            "affection_added": gain.affection_added,
            "level_before": gain.level_before,
            "level_after": gain.level_after,
            "evolved": gain.evolved,
            "evolved_to": (
                EvolutionPreviewSerializer(gain.evolved_to).data if gain.evolved_to else None
            ),
        }
        return data


class WorkoutTeamRewardsSerializer(serializers.Serializer):
    gains = TeamPokemonGainSerializer(many=True)
    empty_team = serializers.BooleanField()

    @classmethod
    def from_rewards(cls, rewards: WorkoutTeamRewards):
        return {
            "gains": [TeamPokemonGainSerializer.from_gain(g) for g in rewards.gains],
            "empty_team": rewards.empty_team,
        }


class UserPokemonTeamUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPokemon
        fields = ("active_team_slot",)

    def validate_active_team_slot(self, value):
        if value is not None and not TEAM_SLOT_MIN <= value <= TEAM_SLOT_MAX:
            raise serializers.ValidationError(f"Team slot must be between {TEAM_SLOT_MIN} and {TEAM_SLOT_MAX}.")
        return value
