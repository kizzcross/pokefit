from django.db import models
from django.utils.translation import gettext_lazy as _


class WorkoutType(models.TextChoices):
    CHEST_TRICEPS = "chest_triceps", _("Chest & triceps")
    BACK_BICEPS = "back_biceps", _("Back & biceps")
    LEGS = "legs", _("Legs")
    SHOULDERS = "shoulders", _("Shoulders")
    ARMS = "arms", _("Arms")
    CARDIO = "cardio", _("Cardio")
    FULL_BODY = "full_body", _("Full body")
    MOBILITY = "mobility", _("Mobility")


class ValidationType(models.TextChoices):
    MANUAL = "manual", _("Manual")
    PHOTO = "photo", _("Photo proof")
    HEALTH_APP = "health_app", _("Health app")
    LOCATION = "location", _("Location")
    WEARABLE_LOCATION = "wearable_location", _("Wearable + location")


class WorkoutStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    FINISHED = "finished", _("Finished")
    CANCELLED = "cancelled", _("Cancelled")


class EncounterStatus(models.TextChoices):
    PENDING = "pending", _("Pending")
    CAPTURED = "captured", _("Captured")
    FLED = "fled", _("Fled")


class ExerciseMuscleGroup(models.TextChoices):
    CHEST = "chest", _("Chest")
    BACK = "back", _("Back")
    LEGS = "legs", _("Legs")
    SHOULDERS = "shoulders", _("Shoulders")
    ARMS = "arms", _("Arms")
    CORE = "core", _("Core")
    CARDIO = "cardio", _("Cardio")
    FULL_BODY = "full_body", _("Full body")
    MOBILITY = "mobility", _("Mobility")


class ExerciseDifficulty(models.TextChoices):
    BEGINNER = "beginner", _("Beginner")
    INTERMEDIATE = "intermediate", _("Intermediate")
    ADVANCED = "advanced", _("Advanced")
