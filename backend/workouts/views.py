from django.db.models import Count
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .choices import EncounterStatus, WorkoutStatus
from .models import Exercise, Workout, WorkoutExercise
from .permissions import IsAdminOrReadOnly
from .serializers import (
    ExerciseListSerializer,
    ExerciseSerializer,
    LastWorkoutByTypeSerializer,
    PendingEncounterSerializer,
    WorkoutCreateSerializer,
    WorkoutDetailSerializer,
    WorkoutExerciseBulkCreateSerializer,
    WorkoutExerciseCreateSerializer,
    WorkoutExerciseSerializer,
    WorkoutExerciseUpdateSerializer,
    WorkoutFinishResultSerializer,
    WorkoutFinishSerializer,
    WorkoutListSerializer,
    WorkoutProofSerializer,
)
from .services.calendar import build_calendar_month


class ExerciseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = Exercise.objects.select_related("created_by")
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        muscle_group = self.request.query_params.get("muscle_group")
        if muscle_group:
            queryset = queryset.filter(muscle_group=muscle_group)
        difficulty = self.request.query_params.get("difficulty")
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset.order_by("name")

    def get_serializer_class(self):
        if self.action == "list":
            return ExerciseListSerializer
        return ExerciseSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.workout_entries.exists():
            instance.is_active = False
            instance.save(update_fields=["is_active", "modified"])
        else:
            instance.delete()


class WorkoutViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = Workout.objects.filter(user=self.request.user)
        if self.action == "list":
            return queryset.prefetch_related("exercises").annotate(
                exercise_count=Count("exercises"),
            )
        return queryset.select_related("encounter_species").prefetch_related("exercises__exercise")

    def get_serializer_class(self):
        if self.action == "list":
            return WorkoutListSerializer
        if self.action == "create":
            return WorkoutCreateSerializer
        if self.action == "add_exercise":
            return WorkoutExerciseCreateSerializer
        if self.action == "add_exercises_bulk":
            return WorkoutExerciseBulkCreateSerializer
        if self.action == "last_by_type":
            return LastWorkoutByTypeSerializer
        if self.action == "finish":
            return WorkoutFinishSerializer
        if self.action == "pending_encounter":
            return PendingEncounterSerializer
        if self.action == "upload_proof":
            return WorkoutProofSerializer
        return WorkoutDetailSerializer

    def perform_create(self, serializer):
        Workout.objects.filter(user=self.request.user, status=WorkoutStatus.DRAFT).delete()
        serializer.save(user=self.request.user, status=WorkoutStatus.DRAFT)

    @extend_schema(responses=WorkoutDetailSerializer)
    @action(detail=False, methods=["get"], url_path="active-draft")
    def active_draft(self, request):
        workout = (
            self.get_queryset()
            .filter(status=WorkoutStatus.DRAFT)
            .prefetch_related("exercises__exercise")
            .order_by("-created")
            .first()
        )
        if not workout:
            return Response(
                {"detail": "Nenhum treino em andamento."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = WorkoutDetailSerializer(workout, context={"request": request})
        return Response(serializer.data)

    @extend_schema(responses=PendingEncounterSerializer)
    @action(detail=False, methods=["get"], url_path="pending-encounter")
    def pending_encounter(self, request):
        workout = (
            self.get_queryset()
            .filter(
                encounter_status=EncounterStatus.PENDING,
                encounter_species__isnull=False,
            )
            .order_by("-ended_at")
            .first()
        )
        if not workout:
            return Response(
                {"detail": "Nenhum encontro pendente. Finalize um treino primeiro."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PendingEncounterSerializer(workout, context={"request": request})
        return Response(serializer.data)

    @extend_schema(responses=LastWorkoutByTypeSerializer)
    @action(detail=False, methods=["get"], url_path="last-by-type")
    def last_by_type(self, request):
        workout_type = request.query_params.get("workout_type")
        if not workout_type:
            return Response(
                {"detail": "Query param workout_type is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exclude_id = request.query_params.get("exclude")
        queryset = (
            self.get_queryset()
            .filter(status=WorkoutStatus.FINISHED, workout_type=workout_type)
            .prefetch_related("exercises__exercise")
            .order_by("-ended_at")
        )
        if exclude_id:
            queryset = queryset.exclude(pk=exclude_id)

        last_workout = queryset.first()
        if not last_workout:
            return Response(
                {"detail": "Nenhum treino finalizado deste grupo ainda."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = LastWorkoutByTypeSerializer(last_workout, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="exercises/bulk")
    def add_exercises_bulk(self, request, pk=None):
        workout = self.get_object()
        if workout.status != WorkoutStatus.DRAFT:
            return Response(
                {"detail": "Exercises can only be added to draft workouts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = WorkoutExerciseBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        created_entries = []
        for item in serializer.validated_data["exercises"]:
            exercise = item["exercise"]
            entry = WorkoutExercise.objects.create(
                workout=workout,
                exercise=exercise,
                name=exercise.name,
                sets=item["sets"],
                reps=item["reps"],
                weight=item["weight"],
            )
            created_entries.append(entry)

        output = WorkoutExerciseSerializer(
            created_entries,
            many=True,
            context={"request": request},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="exercises")
    def add_exercise(self, request, pk=None):
        workout = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={**self.get_serializer_context(), "workout": workout},
        )
        serializer.is_valid(raise_exception=True)
        exercise = serializer.save()
        output = WorkoutExerciseSerializer(exercise, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def _get_draft_exercise_entry(self, workout, entry_id):
        if workout.status != WorkoutStatus.DRAFT:
            return None, Response(
                {"detail": "Só é possível alterar exercícios em treinos em rascunho."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            entry = workout.exercises.get(pk=entry_id)
        except WorkoutExercise.DoesNotExist:
            return None, Response(
                {"detail": "Exercício não encontrado neste treino."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return entry, None

    @extend_schema(request=WorkoutExerciseUpdateSerializer, responses=WorkoutExerciseSerializer)
    @action(detail=True, methods=["patch"], url_path=r"exercises/(?P<entry_id>[0-9]+)")
    def update_exercise(self, request, pk=None, entry_id=None):
        workout = self.get_object()
        entry, error_response = self._get_draft_exercise_entry(workout, entry_id)
        if error_response:
            return error_response

        serializer = WorkoutExerciseUpdateSerializer(
            entry,
            data=request.data,
            partial=True,
            context={**self.get_serializer_context(), "workout": workout},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        output = WorkoutExerciseSerializer(entry, context={"request": request})
        return Response(output.data)

    @extend_schema(responses={status.HTTP_204_NO_CONTENT: None})
    @action(detail=True, methods=["delete"], url_path=r"exercises/(?P<entry_id>[0-9]+)")
    def remove_exercise(self, request, pk=None, entry_id=None):
        workout = self.get_object()
        entry, error_response = self._get_draft_exercise_entry(workout, entry_id)
        if error_response:
            return error_response

        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request, pk=None):
        workout = self.get_object()
        workout.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=WorkoutProofSerializer, responses=WorkoutDetailSerializer)
    @action(detail=True, methods=["post"], url_path="proof")
    def upload_proof(self, request, pk=None):
        workout = self.get_object()
        if workout.status != WorkoutStatus.DRAFT:
            return Response(
                {"detail": "Só é possível enviar foto em treinos em rascunho."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(
            data=request.data,
            context={**self.get_serializer_context(), "workout": workout},
        )
        serializer.is_valid(raise_exception=True)
        workout = serializer.save()
        output = WorkoutDetailSerializer(workout, context={"request": request})
        return Response(output.data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="calendar")
    def calendar(self, request):
        try:
            year = int(request.query_params.get("year", timezone.now().year))
            month = int(request.query_params.get("month", timezone.now().month))
        except (TypeError, ValueError):
            return Response(
                {"detail": "year e month devem ser números inteiros."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 1 <= month <= 12:
            return Response({"detail": "month deve estar entre 1 e 12."}, status=status.HTTP_400_BAD_REQUEST)

        data = build_calendar_month(request.user, year, month, include_proof_photos=True)
        return Response(data)

    @extend_schema(request=WorkoutFinishSerializer, responses=WorkoutDetailSerializer)
    @action(detail=True, methods=["post"], url_path="finish")
    def finish(self, request, pk=None):
        workout = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={**self.get_serializer_context(), "workout": workout},
        )
        serializer.is_valid(raise_exception=True)
        try:
            workout = serializer.save()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not workout.encounter_species_id:
            return Response(
                {"detail": "Catálogo de Pokémon vazio. Rode import_pokemon ou seed_gen1_pokemon."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        output = WorkoutDetailSerializer(workout, context={"request": request})
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="decline-encounter")
    def decline_encounter(self, request, pk=None):
        workout = self.get_object()
        if workout.encounter_status != EncounterStatus.PENDING:
            return Response(
                {"detail": "Este treino não tem encontro pendente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workout.encounter_status = EncounterStatus.FLED
        workout.save(update_fields=["encounter_status", "modified"])
        return Response({"detail": "O Pokémon fugiu para o mato."})
