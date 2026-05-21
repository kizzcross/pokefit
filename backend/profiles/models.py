from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import IndexedTimeStampedModel

from .choices import FitnessGoal, TrainingStage


class UserProfile(IndexedTimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    height = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Height in centimeters."),
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Weight in kilograms."),
    )
    training_stage = models.CharField(
        max_length=32,
        choices=TrainingStage.choices,
        default=TrainingStage.BEGINNER,
    )
    training_since = models.DateField(null=True, blank=True)
    goal = models.CharField(
        max_length=32,
        choices=FitnessGoal.choices,
        default=FitnessGoal.GENERAL_FITNESS,
    )
    weekly_frequency = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(7)],
        help_text=_("Target workout sessions per week (1-7)."),
    )
    current_streak = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("user profile")
        verbose_name_plural = _("user profiles")

    def __str__(self):
        return f"Profile for {self.user}"


class WeeklyGoal(IndexedTimeStampedModel):
    """Meta de treinos comprometida para uma semana (não pode ser alterada na mesma semana)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_goals",
    )
    iso_year = models.PositiveSmallIntegerField()
    iso_week = models.PositiveSmallIntegerField()
    target = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(7)],
        help_text=_("Treinos finalizados necessários nesta semana."),
    )

    class Meta:
        verbose_name = _("weekly goal")
        verbose_name_plural = _("weekly goals")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "iso_year", "iso_week"),
                name="unique_weekly_goal_per_user_week",
            ),
        ]

    def __str__(self):
        return f"Weekly goal {self.user_id} {self.iso_year}-W{self.iso_week}: {self.target}"


class WeeklyGoalReward(IndexedTimeStampedModel):
    """Recompensa semanal: encontro lendário ao bater a meta de treinos."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_goal_rewards",
    )
    iso_year = models.PositiveSmallIntegerField()
    iso_week = models.PositiveSmallIntegerField()
    workout = models.ForeignKey(
        "workouts.Workout",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="weekly_goal_reward_record",
    )

    class Meta:
        verbose_name = _("weekly goal reward")
        verbose_name_plural = _("weekly goal rewards")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "iso_year", "iso_week"),
                name="unique_weekly_goal_reward_per_user_week",
            ),
        ]

    def __str__(self):
        return f"Weekly reward {self.user_id} {self.iso_year}-W{self.iso_week}"
