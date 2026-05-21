from django.db import models
from django.utils.translation import gettext_lazy as _


class TrainingStage(models.TextChoices):
    BEGINNER = "beginner", _("Beginner")
    RETURNING = "returning", _("Returning")
    INTERMEDIATE = "intermediate", _("Intermediate")
    ADVANCED = "advanced", _("Advanced")
    ELITE = "elite", _("Elite")


class FitnessGoal(models.TextChoices):
    LOSE_WEIGHT = "lose_weight", _("Lose weight")
    BUILD_MUSCLE = "build_muscle", _("Build muscle")
    ENDURANCE = "endurance", _("Endurance")
    STRENGTH = "strength", _("Strength")
    GENERAL_FITNESS = "general_fitness", _("General fitness")
    MAINTENANCE = "maintenance", _("Maintenance")
