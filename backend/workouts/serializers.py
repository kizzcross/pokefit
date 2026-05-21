from rest_framework import serializers

from django.utils import timezone

from pokemon.serializers import PokemonSpeciesSerializer, WorkoutTeamRewardsSerializer

from .choices import ValidationType, WorkoutStatus
from .models import EXERCISE_IMAGE_MAX_SIZE_BYTES, Exercise, Workout, WorkoutExercise


class AbsoluteImageUrlMixin:
    def get_image_url(self, obj) -> str | None:
        if not obj.image:
            return None
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ExerciseSerializer(AbsoluteImageUrlMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = Exercise
        fields = [  # noqa: RUF012
            "id",
            "name",
            "slug",
            "description",
            "instructions",
            "muscle_group",
            "difficulty",
            "equipment",
            "image",
            "image_url",
            "video_url",
            "is_active",
            "created_by",
            "created_by_email",
            "created",
            "modified",
        ]
        read_only_fields = ("id", "slug", "created_by", "created_by_email", "created", "modified")

    def validate_image(self, image):
        if image and image.size > EXERCISE_IMAGE_MAX_SIZE_BYTES:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        return image

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ExerciseListSerializer(AbsoluteImageUrlMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [  # noqa: RUF012
            "id",
            "name",
            "slug",
            "description",
            "muscle_group",
            "difficulty",
            "equipment",
            "image_url",
            "is_active",
        ]
        read_only_fields = fields


class ExerciseSummarySerializer(AbsoluteImageUrlMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [  # noqa: RUF012
            "id",
            "name",
            "slug",
            "description",
            "instructions",
            "muscle_group",
            "difficulty",
            "equipment",
            "image_url",
            "video_url",
        ]
        read_only_fields = fields


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    exercise = ExerciseSummarySerializer(read_only=True)

    class Meta:
        model = WorkoutExercise
        fields = [  # noqa: RUF012
            "id",
            "exercise",
            "name",
            "sets",
            "reps",
            "weight",
            "volume",
            "is_pr",
            "created",
            "modified",
        ]
        read_only_fields = ("id", "name", "volume", "created", "modified")


class WorkoutListSerializer(serializers.ModelSerializer):
    exercise_count = serializers.IntegerField(read_only=True)
    total_volume = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Workout
        fields = [  # noqa: RUF012
            "id",
            "workout_type",
            "started_at",
            "ended_at",
            "duration_minutes",
            "perceived_effort",
            "validation_type",
            "quality_score",
            "progress_score",
            "status",
            "exercise_count",
            "total_volume",
            "created",
            "modified",
        ]
        read_only_fields = fields


class WorkoutDetailSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True, read_only=True)
    total_volume = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    encounter_species = PokemonSpeciesSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Workout
        fields = [  # noqa: RUF012
            "id",
            "workout_type",
            "started_at",
            "ended_at",
            "duration_minutes",
            "perceived_effort",
            "validation_type",
            "quality_score",
            "progress_score",
            "status",
            "encounter_status",
            "encounter_species",
            "encounter_level",
            "weekly_goal_reward",
            "proof_photo_url",
            "proof_caption",
            "proof_uploaded_at",
            "exercises",
            "total_volume",
            "created",
            "modified",
        ]
        read_only_fields = fields

    proof_photo_url = serializers.SerializerMethodField()

    def get_proof_photo_url(self, obj):
        if not obj.proof_photo:
            return None
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(obj.proof_photo.url)
        return obj.proof_photo.url

class PendingEncounterSerializer(serializers.Serializer):
    workout_id = serializers.IntegerField(source="id")
    encounter_status = serializers.CharField()
    encounter_level = serializers.IntegerField(allow_null=True)
    weekly_goal_reward = serializers.BooleanField()
    species = serializers.SerializerMethodField()

    def get_species(self, obj):
        from pokemon.serializers import PokemonSpeciesSerializer

        return PokemonSpeciesSerializer(
            obj.encounter_species,
            context=self.context,
        ).data


class WorkoutCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workout
        fields = [  # noqa: RUF012
            "id",
            "workout_type",
            "started_at",
            "perceived_effort",
            "validation_type",
            "status",
            "created",
            "modified",
        ]
        read_only_fields = ("id", "status", "created", "modified")


class WorkoutFinishResultSerializer(serializers.Serializer):
    workout = serializers.SerializerMethodField()
    team_rewards = serializers.DictField()

    def get_workout(self, obj):
        return WorkoutDetailSerializer(obj.workout, context=self.context).data


class WorkoutFinishSerializer(serializers.Serializer):
    perceived_effort = serializers.IntegerField(
        min_value=1,
        max_value=10,
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        workout = self.context["workout"]
        if workout.status != WorkoutStatus.DRAFT:
            raise serializers.ValidationError("Only draft workouts can be finished.")
        if workout.exercises.count() == 0:
            raise serializers.ValidationError("Add at least one exercise before finishing.")
        if not workout.proof_photo:
            raise serializers.ValidationError(
                "Envie uma foto de prova antes de finalizar o treino."
            )
        return attrs

    def save(self, **kwargs):
        from dataclasses import dataclass

        from pokemon.services.encounter import assign_workout_encounter
        from pokemon.services.progression import apply_workout_rewards
        from profiles.services.weekly_goal import (
            record_weekly_goal_reward,
            should_grant_weekly_goal_encounter,
        )

        @dataclass
        class WorkoutFinishResult:
            workout: Workout
            team_rewards: dict

        workout = self.context["workout"]
        perceived_effort = self.validated_data.get("perceived_effort")
        if perceived_effort is not None:
            workout.perceived_effort = perceived_effort
            workout.save(update_fields=["perceived_effort", "modified"])
        workout.finish()
        team_rewards = apply_workout_rewards(workout.user, workout)
        weekly_bonus = should_grant_weekly_goal_encounter(workout.user, workout)
        assign_workout_encounter(workout, weekly_goal_bonus=weekly_bonus)
        if weekly_bonus:
            record_weekly_goal_reward(workout.user, workout)
        workout = (
            Workout.objects.filter(pk=workout.pk)
            .select_related("encounter_species")
            .prefetch_related("exercises__exercise")
            .get()
        )
        return WorkoutFinishResult(
            workout=workout,
            team_rewards=WorkoutTeamRewardsSerializer.from_rewards(team_rewards),
        )


class WorkoutExerciseBulkItemSerializer(serializers.Serializer):
    exercise = serializers.PrimaryKeyRelatedField(queryset=Exercise.objects.filter(is_active=True))
    sets = serializers.IntegerField(min_value=1, max_value=99)
    reps = serializers.IntegerField(min_value=1, max_value=999)
    weight = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)


class WorkoutExerciseBulkCreateSerializer(serializers.Serializer):
    exercises = WorkoutExerciseBulkItemSerializer(many=True, allow_empty=False)

    def validate_exercises(self, value):
        if len(value) > 30:
            raise serializers.ValidationError("Maximum 30 exercises per batch.")
        return value


class LastWorkoutByTypeSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True, read_only=True)
    total_volume = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Workout
        fields = (
            "id",
            "workout_type",
            "ended_at",
            "duration_minutes",
            "total_volume",
            "exercises",
        )
        read_only_fields = fields


class WorkoutExerciseCreateSerializer(serializers.ModelSerializer):
    exercise = serializers.PrimaryKeyRelatedField(
        queryset=Exercise.objects.filter(is_active=True),
    )

    class Meta:
        model = WorkoutExercise
        fields = [  # noqa: RUF012
            "id",
            "exercise",
            "sets",
            "reps",
            "weight",
            "is_pr",
            "volume",
            "name",
            "created",
            "modified",
        ]
        read_only_fields = ("id", "volume", "name", "created", "modified")

    def validate_exercise(self, exercise):
        if not exercise.is_active:
            raise serializers.ValidationError("This exercise is not available.")
        return exercise

    def validate(self, attrs):
        workout = self.context["workout"]
        if workout.status != WorkoutStatus.DRAFT:
            raise serializers.ValidationError("Exercises can only be added to draft workouts.")
        if not attrs.get("exercise"):
            raise serializers.ValidationError({"exercise": "A catalog exercise is required."})
        return attrs

    def create(self, validated_data):
        exercise = validated_data["exercise"]
        validated_data["name"] = exercise.name
        validated_data["workout"] = self.context["workout"]
        return super().create(validated_data)


class WorkoutExerciseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutExercise
        fields = ("sets", "reps", "weight", "is_pr")

    def validate(self, attrs):
        workout = self.context["workout"]
        if workout.status != WorkoutStatus.DRAFT:
            raise serializers.ValidationError("Só é possível editar exercícios em treinos em rascunho.")
        return attrs


class WorkoutProofSerializer(serializers.Serializer):
    photo = serializers.ImageField()
    caption = serializers.CharField(max_length=140, required=False, allow_blank=True, default="")

    def validate_photo(self, image):
        if image.size > EXERCISE_IMAGE_MAX_SIZE_BYTES:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        return image

    def save(self, **kwargs):
        workout = self.context["workout"]
        workout.proof_photo = self.validated_data["photo"]
        workout.proof_caption = self.validated_data.get("caption", "")
        workout.proof_uploaded_at = timezone.now()
        workout.validation_type = ValidationType.PHOTO
        workout.save(
            update_fields=[
                "proof_photo",
                "proof_caption",
                "proof_uploaded_at",
                "validation_type",
                "modified",
            ]
        )
        return workout
