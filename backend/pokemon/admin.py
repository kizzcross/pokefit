from django.contrib import admin

from .models import PokemonEV, PokemonIV, PokemonSpecies, UserPokemon


class PokemonIVInline(admin.StackedInline):
    model = PokemonIV
    extra = 0
    max_num = 1
    can_delete = False


class PokemonEVInline(admin.StackedInline):
    model = PokemonEV
    extra = 0
    max_num = 1
    can_delete = False
    readonly_fields = ("total", "created", "modified")


@admin.register(PokemonSpecies)
class PokemonSpeciesAdmin(admin.ModelAdmin):
    list_display = (
        "pokedex_id",
        "name",
        "type_1",
        "type_2",
        "rarity",
        "base_hp",
        "base_speed",
        "created",
    )
    list_filter = ("type_1", "type_2", "rarity")
    search_fields = ("name",)
    ordering = ("pokedex_id",)
    readonly_fields = ("created", "modified")


@admin.register(UserPokemon)
class UserPokemonAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "species",
        "nickname",
        "level",
        "nature",
        "shiny",
        "active_team_slot",
        "captured_at",
    )
    list_filter = ("nature", "shiny", "species__type_1")
    search_fields = ("nickname", "species__name", "user__email")
    raw_id_fields = ("user", "species", "source_workout")
    readonly_fields = ("created", "modified")
    inlines = (PokemonIVInline, PokemonEVInline)


@admin.register(PokemonIV)
class PokemonIVAdmin(admin.ModelAdmin):
    list_display = ("user_pokemon", "hp", "attack", "defense", "sp_attack", "sp_defense", "speed")
    raw_id_fields = ("user_pokemon",)


@admin.register(PokemonEV)
class PokemonEVAdmin(admin.ModelAdmin):
    list_display = (
        "user_pokemon",
        "hp",
        "attack",
        "defense",
        "sp_attack",
        "sp_defense",
        "speed",
        "total",
        "modified",
    )
    readonly_fields = ("total", "created", "modified")
    raw_id_fields = ("user_pokemon",)
