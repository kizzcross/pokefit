from django.db.models import Count
from django.utils import timezone

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .choices import EncounterStatus, WorkoutStatus, WorkoutType
from .models import Exercise, Workout, WorkoutExercise
from .permissions import IsAdminOrReadOnly
from .serializers import (
    CardioPreviewSerializer,
    CardioReferenceSerializer,
    CardioSessionSerializer,
    CardioWorkoutFinishSerializer,
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
from .services.cardio import (
    cardio_performance_summary,
    format_pace,
    get_last_finished_cardio,
    get_reference_pace_seconds,
)
from .services.seed_exercises import SeedStatus, ingest_exercises_list


MAX_BULK_IMPORT_EXERCISES = 500


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

    @extend_schema(
        request={
            "application/json": {
                "oneOf": [
                    {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                    {
                        "type": "object",
                        "properties": {
                            "exercises": {
                                "type": "array",
                                "items": {"type": "object"},
                            },
                            "create_only": {"type": "boolean"},
                            "dry_run": {"type": "boolean"},
                        },
                    },
                ],
            },
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "results": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "status": {"type": "string"},
                                "reason": {"type": "string"},
                            },
                        },
                    },
                    "summary": {
                        "type": "object",
                        "properties": {
                            "created": {"type": "integer"},
                            "updated": {"type": "integer"},
                            "skipped": {"type": "integer"},
                            "failed": {"type": "integer"},
                            "total": {"type": "integer"},
                        },
                    },
                    "dry_run": {"type": "boolean"},
                },
            },
            400: {
                "type": "object",
                "properties": {"detail": {"type": "string"}},
            },
        },
    )
    @action(detail=False, methods=["post"], url_path="import")
    def bulk_import(self, request):
        """Importação em massa de exercícios (staff only).

        Aceita o payload em dois formatos:

        - Lista direta: `[{...}, {...}]`
        - Objeto com opções: `{"exercises": [...], "create_only": false, "dry_run": false}`

        Cada item deve seguir o mesmo shape de `seed_exercises` (name,
        muscle_group, difficulty obrigatórios; slug/description/instructions/
        equipment/video_url/is_active opcionais).
        """
        payload = request.data

        if isinstance(payload, list):
            entries = payload
            create_only = False
            dry_run = False
        elif isinstance(payload, dict):
            entries = payload.get("exercises", [])
            create_only = bool(payload.get("create_only", False))
            dry_run = bool(payload.get("dry_run", False))
        else:
            return Response(
                {"detail": "Payload deve ser lista de exercícios ou objeto com 'exercises'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(entries, list):
            return Response(
                {"detail": "'exercises' deve ser uma lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not entries:
            return Response(
                {"detail": "Lista vazia. Envie pelo menos 1 exercício."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(entries) > MAX_BULK_IMPORT_EXERCISES:
            return Response(
                {
                    "detail": (
                        f"Máximo de {MAX_BULK_IMPORT_EXERCISES} exercícios por importação "
                        f"(recebido: {len(entries)})."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            results = ingest_exercises_list(
                entries,
                update_existing=not create_only,
                dry_run=dry_run,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = sum(1 for r in results if r.status == SeedStatus.CREATED)
        updated = sum(1 for r in results if r.status == SeedStatus.UPDATED)
        skipped = sum(1 for r in results if r.status == SeedStatus.SKIPPED)
        failed = sum(1 for r in results if r.status == SeedStatus.FAILED)

        return Response(
            {
                "results": [
                    {"name": r.name, "status": r.status.value, "reason": r.reason}
                    for r in results
                ],
                "summary": {
                    "created": created,
                    "updated": updated,
                    "skipped": skipped,
                    "failed": failed,
                    "total": len(results),
                },
                "dry_run": dry_run,
            }
        )


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
        if self.action == "finish_cardio":
            return CardioWorkoutFinishSerializer
        if self.action == "save_cardio_session":
            return CardioSessionSerializer
        if self.action == "cardio_reference":
            return CardioReferenceSerializer
        if self.action == "cardio_preview":
            return CardioPreviewSerializer
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

    def _finish_workout(self, request, workout, serializer_class):
        serializer = serializer_class(
            data=request.data,
            context={**self.get_serializer_context(), "workout": workout},
        )
        serializer.is_valid(raise_exception=True)
        try:
            result = serializer.save()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not result.workout.encounter_species_id:
            return Response(
                {"detail": "Catálogo de Pokémon vazio. Rode import_pokemon ou seed_gen1_pokemon."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payload = {
            "workout": WorkoutDetailSerializer(result.workout, context={"request": request}).data,
            "team_rewards": result.team_rewards,
        }
        cardio_summary = getattr(result, "cardio_summary", None)
        if cardio_summary is not None:
            payload["cardio_summary"] = cardio_summary
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(request=WorkoutFinishSerializer, responses=WorkoutFinishResultSerializer)
    @action(detail=True, methods=["post"], url_path="finish")
    def finish(self, request, pk=None):
        workout = self.get_object()
        if workout.workout_type == WorkoutType.CARDIO:
            return self._finish_workout(request, workout, CardioWorkoutFinishSerializer)
        return self._finish_workout(request, workout, WorkoutFinishSerializer)

    @extend_schema(request=CardioWorkoutFinishSerializer, responses=WorkoutFinishResultSerializer)
    @action(detail=True, methods=["post"], url_path="finish-cardio")
    def finish_cardio(self, request, pk=None):
        workout = self.get_object()
        if workout.workout_type != WorkoutType.CARDIO:
            return Response(
                {"detail": "Este endpoint é apenas para treinos de cardio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._finish_workout(request, workout, CardioWorkoutFinishSerializer)

    @extend_schema(request=CardioSessionSerializer, responses=WorkoutDetailSerializer)
    @action(detail=True, methods=["post", "patch"], url_path="cardio-session")
    def save_cardio_session(self, request, pk=None):
        workout = self.get_object()
        if workout.workout_type != WorkoutType.CARDIO:
            return Response(
                {"detail": "Só treinos de cardio aceitam sessão de pace."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if workout.status != WorkoutStatus.DRAFT:
            return Response(
                {"detail": "Só é possível editar cardio em rascunho."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CardioSessionSerializer(
            data=request.data,
            context={**self.get_serializer_context(), "workout": workout},
        )
        serializer.is_valid(raise_exception=True)
        workout = serializer.save()
        output = WorkoutDetailSerializer(workout, context={"request": request})
        return Response(output.data)

    @extend_schema(responses=CardioReferenceSerializer)
    @action(detail=True, methods=["get"], url_path="cardio-reference")
    def cardio_reference(self, request, pk=None):
        workout = self.get_object()
        if workout.workout_type != WorkoutType.CARDIO:
            return Response(
                {"detail": "Referência de pace só para treinos de cardio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        last = get_last_finished_cardio(workout.user, exclude_workout_id=workout.pk)
        reference_pace = get_reference_pace_seconds(workout.user, exclude_workout_id=workout.pk)
        data = {
            "reference_pace_seconds_per_km": reference_pace,
            "reference_pace_display": format_pace(reference_pace),
            "has_previous_cardio": last is not None,
            "last_cardio_ended_at": last.ended_at if last else None,
            "last_cardio_duration_minutes": last.cardio_duration_minutes if last else None,
            "last_cardio_pace_display": (
                format_pace(last.cardio_pace_seconds_per_km)
                if last and last.cardio_pace_seconds_per_km
                else None
            ),
        }
        return Response(CardioReferenceSerializer(data).data)

    @extend_schema(request=CardioPreviewSerializer, responses=CardioPreviewSerializer)
    @action(detail=True, methods=["post"], url_path="cardio-preview")
    def cardio_preview(self, request, pk=None):
        workout = self.get_object()
        if workout.workout_type != WorkoutType.CARDIO:
            return Response(
                {"detail": "Preview de pace só para treinos de cardio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CardioPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reference_pace = get_reference_pace_seconds(workout.user, exclude_workout_id=workout.pk)
        has_previous = get_last_finished_cardio(workout.user, exclude_workout_id=workout.pk) is not None
        summary = cardio_performance_summary(
            current_pace=serializer.validated_data["cardio_pace_seconds_per_km"],
            reference_pace=reference_pace,
            has_previous_cardio=has_previous,
        )
        return Response(summary)

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
