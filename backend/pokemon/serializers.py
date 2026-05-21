from rest_framework import serializers

from .constants import TEAM_SLOT_MAX, TEAM_SLOT_MIN
from .models import PokemonIV, PokemonSpecies, UserPokemon
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


class UserPokemonListSerializer(serializers.ModelSerializer):
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
            "nature",
            "shiny",
            "active_team_slot",
            "affection",
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


class UserPokemonTeamUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPokemon
        fields = ("active_team_slot",)

    def validate_active_team_slot(self, value):
        if value is not None and not TEAM_SLOT_MIN <= value <= TEAM_SLOT_MAX:
            raise serializers.ValidationError(f"Team slot must be between {TEAM_SLOT_MIN} and {TEAM_SLOT_MAX}.")
        return value
