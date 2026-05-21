from django.db import models
from django.utils.translation import gettext_lazy as _


class PokemonType(models.TextChoices):
    NORMAL = "normal", _("Normal")
    FIRE = "fire", _("Fire")
    WATER = "water", _("Water")
    ELECTRIC = "electric", _("Electric")
    GRASS = "grass", _("Grass")
    ICE = "ice", _("Ice")
    FIGHTING = "fighting", _("Fighting")
    POISON = "poison", _("Poison")
    GROUND = "ground", _("Ground")
    FLYING = "flying", _("Flying")
    PSYCHIC = "psychic", _("Psychic")
    BUG = "bug", _("Bug")
    ROCK = "rock", _("Rock")
    GHOST = "ghost", _("Ghost")
    DRAGON = "dragon", _("Dragon")
    DARK = "dark", _("Dark")
    STEEL = "steel", _("Steel")
    FAIRY = "fairy", _("Fairy")


class Rarity(models.TextChoices):
    COMMON = "common", _("Common")
    RARE = "rare", _("Rare")
    SUPER_RARE = "super_rare", _("Super Rare")
    LEGENDARY = "legendary", _("Legendary")


class Nature(models.TextChoices):
    HARDY = "hardy", _("Hardy")
    LONELY = "lonely", _("Lonely")
    BRAVE = "brave", _("Brave")
    ADAMANT = "adamant", _("Adamant")
    NAUGHTY = "naughty", _("Naughty")
    BOLD = "bold", _("Bold")
    DOCILE = "docile", _("Docile")
    RELAXED = "relaxed", _("Relaxed")
    IMPISH = "impish", _("Impish")
    LAX = "lax", _("Lax")
    TIMID = "timid", _("Timid")
    HASTY = "hasty", _("Hasty")
    SERIOUS = "serious", _("Serious")
    JOLLY = "jolly", _("Jolly")
    NAIVE = "naive", _("Naive")
    MODEST = "modest", _("Modest")
    MILD = "mild", _("Mild")
    QUIET = "quiet", _("Quiet")
    BASHFUL = "bashful", _("Bashful")
    RASH = "rash", _("Rash")
    CALM = "calm", _("Calm")
    GENTLE = "gentle", _("Gentle")
    SASSY = "sassy", _("Sassy")
    CAREFUL = "careful", _("Careful")
    QUIRKY = "quirky", _("Quirky")
