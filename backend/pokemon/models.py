from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from common.models import IndexedTimeStampedModel

from .choices import Nature, PokemonType, Rarity
from .constants import EV_STAT_MAX, EV_TOTAL_MAX, IV_MAX, IV_MIN, TEAM_SLOT_MAX, TEAM_SLOT_MIN


class PokemonSpecies(IndexedTimeStampedModel):
    pokedex_id = models.PositiveIntegerField(unique=True)
    name = models.CharField(max_length=64)
    type_1 = models.CharField(max_length=16, choices=PokemonType.choices)
    type_2 = models.CharField(
        max_length=16,
        choices=PokemonType.choices,
        blank=True,
        default="",
    )
    base_hp = models.PositiveSmallIntegerField()
    base_attack = models.PositiveSmallIntegerField()
    base_defense = models.PositiveSmallIntegerField()
    base_sp_attack = models.PositiveSmallIntegerField()
    base_sp_defense = models.PositiveSmallIntegerField()
    base_speed = models.PositiveSmallIntegerField()
    sprite_url = models.URLField(max_length=512, blank=True, default="")
    official_artwork_url = models.URLField(max_length=512, blank=True, default="")
    evolution_chain_url = models.URLField(max_length=512, blank=True, default="")
    rarity = models.CharField(max_length=16, choices=Rarity.choices, default=Rarity.COMMON)
    workout_pools = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Workout pool configuration keyed by activity or muscle group."),
    )

    class Meta:
        verbose_name = _("Pokémon species")
        verbose_name_plural = _("Pokémon species")
        ordering = ("pokedex_id",)

    evolution_chain = models.ForeignKey(
        "EvolutionChain",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="species",
    )

    def __str__(self):
        return f"#{self.pokedex_id} {self.name}"


class EvolutionChain(IndexedTimeStampedModel):
    pokeapi_id = models.PositiveIntegerField(unique=True)
    url = models.URLField(max_length=512, unique=True)

    class Meta:
        verbose_name = _("evolution chain")
        verbose_name_plural = _("evolution chains")

    def __str__(self):
        return f"Evolution chain #{self.pokeapi_id}"


class EvolutionRule(models.Model):
    chain = models.ForeignKey(
        EvolutionChain,
        on_delete=models.CASCADE,
        related_name="rules",
    )
    from_species = models.ForeignKey(
        PokemonSpecies,
        on_delete=models.CASCADE,
        related_name="evolution_rules_from",
    )
    to_species = models.ForeignKey(
        PokemonSpecies,
        on_delete=models.CASCADE,
        related_name="evolution_rules_to",
    )
    trigger = models.CharField(max_length=32, default="level-up")
    min_level = models.PositiveSmallIntegerField(null=True, blank=True)
    min_affection = models.PositiveSmallIntegerField(null=True, blank=True)
    item_slug = models.CharField(max_length=64, blank=True, default="")
    enabled = models.BooleanField(default=True)
    priority = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("priority", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["from_species", "to_species", "trigger", "min_level", "min_affection", "item_slug"],
                name="pokemon_evolution_rule_unique_edge",
            ),
        ]

    def __str__(self):
        return f"{self.from_species.name} → {self.to_species.name} ({self.trigger})"


class UserPokemon(IndexedTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pokemon",
    )
    species = models.ForeignKey(
        PokemonSpecies,
        on_delete=models.PROTECT,
        related_name="user_pokemon",
    )
    nickname = models.CharField(max_length=64, blank=True, default="")
    level = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
    )
    experience = models.PositiveIntegerField(default=0)
    nature = models.CharField(max_length=16, choices=Nature.choices, default=Nature.HARDY)
    shiny = models.BooleanField(default=False)
    captured_at = models.DateTimeField()
    source_workout = models.ForeignKey(
        "workouts.Workout",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="captured_pokemon",
    )
    active_team_slot = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text=_("Team position 1-6 when assigned to the active roster."),
    )
    affection = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("user Pokémon")
        verbose_name_plural = _("user Pokémon")
        ordering = ("-captured_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(active_team_slot__isnull=True)
                | Q(
                    active_team_slot__gte=TEAM_SLOT_MIN,
                    active_team_slot__lte=TEAM_SLOT_MAX,
                ),
                name="user_pokemon_active_team_slot_range",
            ),
            models.UniqueConstraint(
                fields=["user", "active_team_slot"],
                condition=Q(active_team_slot__isnull=False),
                name="user_pokemon_unique_active_team_slot",
            ),
        ]

    def __str__(self):
        display_name = self.nickname or self.species.name
        return f"{display_name} (Lv.{self.level}) — {self.user}"


class PokemonIV(models.Model):
    user_pokemon = models.OneToOneField(
        UserPokemon,
        on_delete=models.CASCADE,
        related_name="ivs",
    )
    hp = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(IV_MIN), MaxValueValidator(IV_MAX)],
    )
    attack = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(IV_MIN), MaxValueValidator(IV_MAX)],
    )
    defense = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(IV_MIN), MaxValueValidator(IV_MAX)],
    )
    sp_attack = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(IV_MIN), MaxValueValidator(IV_MAX)],
    )
    sp_defense = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(IV_MIN), MaxValueValidator(IV_MAX)],
    )
    speed = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(IV_MIN), MaxValueValidator(IV_MAX)],
    )

    class Meta:
        verbose_name = _("Pokémon IV")
        verbose_name_plural = _("Pokémon IVs")

    def __str__(self):
        return f"IVs for {self.user_pokemon}"

    def clean(self):
        super().clean()
        for field_name in ("hp", "attack", "defense", "sp_attack", "sp_defense", "speed"):
            value = getattr(self, field_name)
            if value is not None and not IV_MIN <= value <= IV_MAX:
                raise ValidationError(
                    {field_name: _(f"IV must be between {IV_MIN} and {IV_MAX}.")}
                )


class PokemonEV(IndexedTimeStampedModel):
    user_pokemon = models.OneToOneField(
        UserPokemon,
        on_delete=models.CASCADE,
        related_name="evs",
    )
    hp = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(EV_STAT_MAX)],
    )
    attack = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(EV_STAT_MAX)],
    )
    defense = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(EV_STAT_MAX)],
    )
    sp_attack = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(EV_STAT_MAX)],
    )
    sp_defense = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(EV_STAT_MAX)],
    )
    speed = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(EV_STAT_MAX)],
    )
    total = models.PositiveSmallIntegerField(default=0, editable=False)

    class Meta:
        verbose_name = _("Pokémon EV")
        verbose_name_plural = _("Pokémon EVs")

    def __str__(self):
        return f"EVs for {self.user_pokemon} (total {self.total})"

    @property
    def stat_fields(self):
        return ("hp", "attack", "defense", "sp_attack", "sp_defense", "speed")

    def compute_total(self) -> int:
        return sum(getattr(self, field_name) for field_name in self.stat_fields)

    def clean(self):
        super().clean()
        errors = {}
        computed_total = 0

        for field_name in self.stat_fields:
            value = getattr(self, field_name) or 0
            if value > EV_STAT_MAX:
                errors[field_name] = _(f"EV per stat cannot exceed {EV_STAT_MAX}.")
            computed_total += value

        if computed_total > EV_TOTAL_MAX:
            errors["total"] = _(f"Total EVs cannot exceed {EV_TOTAL_MAX}.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.total = self.compute_total()
        super().save(*args, **kwargs)
