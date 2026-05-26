from decimal import Decimal

from django.conf import settings
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.models import IndexedTimeStampedModel

from .choices import (
    EncounterStatus,
    ExerciseDifficulty,
    ExerciseMuscleGroup,
    ValidationType,
    WorkoutStatus,
    WorkoutType,
)

EXERCISE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
EXERCISE_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]


def exercise_image_upload_to(instance, filename: str) -> str:
    extension = filename.rsplit(".", 1)[-1].lower()
    return f"exercises/{instance.slug or 'exercise'}.{extension}"


def workout_proof_upload_to(instance, filename: str) -> str:
    extension = filename.rsplit(".", 1)[-1].lower()
    return f"workout_proofs/{instance.user_id}/{instance.pk or 'draft'}.{extension}"


class Exercise(IndexedTimeStampedModel):
    """Catalog exercise managed by system admins."""

    name = models.CharField(max_length=128, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.CharField(max_length=255, blank=True, default="")
    instructions = models.TextField(
        blank=True,
        default="",
        help_text=_("Step-by-step guidance shown to the user."),
    )
    muscle_group = models.CharField(
        max_length=32,
        choices=ExerciseMuscleGroup.choices,
        default=ExerciseMuscleGroup.FULL_BODY,
    )
    difficulty = models.CharField(
        max_length=16,
        choices=ExerciseDifficulty.choices,
        default=ExerciseDifficulty.BEGINNER,
    )
    equipment = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text=_("e.g. barbell, dumbbell, bodyweight"),
    )
    image = models.ImageField(
        upload_to=exercise_image_upload_to,
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=EXERCISE_IMAGE_EXTENSIONS)],
        help_text=_("Demonstration image (max 5 MB, JPG/PNG/WebP)."),
    )
    video_url = models.URLField(
        max_length=512,
        blank=True,
        default="",
        help_text=_("Optional external video demonstrating the movement."),
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Inactive exercises are hidden from users but kept for history."),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_exercises",
    )

    class Meta:
        verbose_name = _("exercise")
        verbose_name_plural = _("exercises")
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "exercise"
            slug = base_slug
            counter = 1
            while Exercise.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Workout(IndexedTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workouts",
    )
    workout_type = models.CharField(
        max_length=32,
        choices=WorkoutType.choices,
        default=WorkoutType.FULL_BODY,
    )
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    perceived_effort = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text=_("Rate of perceived exertion from 1 to 10."),
    )
    validation_type = models.CharField(
        max_length=32,
        choices=ValidationType.choices,
        default=ValidationType.MANUAL,
    )
    quality_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(100)],
    )
    progress_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(100)],
    )
    status = models.CharField(
        max_length=16,
        choices=WorkoutStatus.choices,
        default=WorkoutStatus.DRAFT,
    )
    encounter_species = models.ForeignKey(
        "pokemon.PokemonSpecies",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workout_encounters",
    )
    encounter_status = models.CharField(
        max_length=16,
        choices=EncounterStatus.choices,
        blank=True,
        default="",
    )
    encounter_level = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text=_("Level of the wild Pokémon for this encounter."),
    )
    weekly_goal_reward = models.BooleanField(
        default=False,
        help_text=_("Encontro lendário/ultra raro por bater a meta semanal neste treino."),
    )
    proof_photo = models.ImageField(
        upload_to=workout_proof_upload_to,
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=EXERCISE_IMAGE_EXTENSIONS)],
        help_text=_("Photo proof that the workout was completed."),
    )
    proof_caption = models.CharField(max_length=140, blank=True, default="")
    proof_uploaded_at = models.DateTimeField(null=True, blank=True)
    cardio_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_("Duration of the cardio session in minutes."),
    )
    cardio_pace_seconds_per_km = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_("Average pace in seconds per kilometer (lower is faster)."),
    )

    class Meta:
        verbose_name = _("workout")
        verbose_name_plural = _("workouts")
        ordering = ("-started_at",)

    def __str__(self):
        return f"Workout {self.pk} — {self.user} ({self.get_status_display()})"

    @property
    def total_volume(self) -> Decimal:
        return sum((exercise.volume for exercise in self.exercises.all()), Decimal("0"))

    def _compute_duration_minutes(self) -> int | None:
        if not self.started_at or not self.ended_at:
            return None
        elapsed_seconds = (self.ended_at - self.started_at).total_seconds()
        if elapsed_seconds <= 0:
            return 0
        return int(elapsed_seconds // 60)

    def _compute_quality_score(self) -> int:
        if self.perceived_effort is not None:
            return min(100, int(self.perceived_effort) * 10)
        exercise_count = self.exercises.count()
        if exercise_count == 0:
            return 0
        return min(100, exercise_count * 15)

    def _compute_progress_score(self) -> int:
        if self.workout_type == WorkoutType.CARDIO:
            from .services.cardio import compute_cardio_progress_score, get_reference_pace_seconds

            pace = self.cardio_pace_seconds_per_km
            if not pace:
                return 0
            reference = get_reference_pace_seconds(
                self.user,
                exclude_workout_id=self.pk,
            )
            return compute_cardio_progress_score(pace, reference)

        total = self.total_volume
        if total <= 0:
            return 0
        return min(100, int(total // Decimal("50")))

    def finish(self) -> None:
        if self.status != WorkoutStatus.DRAFT:
            raise ValueError(_("Only draft workouts can be finished."))

        if not self.ended_at:
            self.ended_at = timezone.now()

        if self.workout_type == WorkoutType.CARDIO and self.cardio_duration_minutes:
            self.duration_minutes = self.cardio_duration_minutes
        else:
            duration = self._compute_duration_minutes()
            if duration is not None:
                self.duration_minutes = duration

        self.quality_score = self._compute_quality_score()
        self.progress_score = self._compute_progress_score()
        self.status = WorkoutStatus.FINISHED
        self.save(
            update_fields=[
                "ended_at",
                "duration_minutes",
                "quality_score",
                "progress_score",
                "status",
                "modified",
            ]
        )


WORKOUT_REACTION_EMOJIS: list[str] = [
    "🔥",
    "💪",
    "👏",
    "❤️",
    "😂",
    "😮",
    "👎",
]
WORKOUT_COMMENT_MAX_LENGTH = 500


class WorkoutReaction(IndexedTimeStampedModel):
    """An emoji reaction left by any logged-in user on a finished workout."""

    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_reactions",
    )
    emoji = models.CharField(max_length=8)

    class Meta:
        verbose_name = _("workout reaction")
        verbose_name_plural = _("workout reactions")
        ordering = ("-created",)
        constraints = [
            models.UniqueConstraint(
                fields=["workout", "user"],
                name="workout_reaction_unique_per_user",
            ),
        ]
        indexes = [
            models.Index(fields=["workout", "emoji"]),
        ]

    def __str__(self):
        return f"{self.user_id} {self.emoji} #{self.workout_id}"


class WorkoutComment(IndexedTimeStampedModel):
    """A short text comment from any logged-in user on a finished workout."""

    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_comments",
    )
    body = models.CharField(max_length=WORKOUT_COMMENT_MAX_LENGTH)

    class Meta:
        verbose_name = _("workout comment")
        verbose_name_plural = _("workout comments")
        ordering = ("created",)
        indexes = [
            models.Index(fields=["workout", "created"]),
        ]

    def __str__(self):
        return f"comment #{self.pk} on workout #{self.workout_id}"


class WorkoutExercise(IndexedTimeStampedModel):
    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name="exercises",
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="workout_entries",
    )
    name = models.CharField(
        max_length=128,
        help_text=_("Snapshot of the catalog name at the time of the workout."),
    )
    sets = models.PositiveSmallIntegerField()
    reps = models.PositiveSmallIntegerField()
    weight = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0"))
    volume = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=Decimal("0"))
    is_pr = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("workout exercise")
        verbose_name_plural = _("workout exercises")
        ordering = ("created",)

    def __str__(self):
        return f"{self.name} ({self.workout_id})"

    def compute_volume(self) -> Decimal:
        return Decimal(self.sets) * Decimal(self.reps) * self.weight

    def save(self, *args, **kwargs):
        if self.exercise_id and not self.name:
            self.name = self.exercise.name
        self.volume = self.compute_volume()
        super().save(*args, **kwargs)
