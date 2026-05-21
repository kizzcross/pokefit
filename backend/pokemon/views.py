from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from workouts.choices import EncounterStatus, WorkoutStatus
from workouts.models import Workout

from .models import PokemonSpecies, UserPokemon
from .services.grant import grant_pokemon_from_workout_encounter
from .serializers import (
    PokemonSpeciesSerializer,
    UserPokemonCaptureSerializer,
    UserPokemonDetailSerializer,
    UserPokemonListSerializer,
    UserPokemonTeamUpdateSerializer,
)
class PokemonSpeciesViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PokemonSpeciesSerializer
    lookup_field = "pokedex_id"

    def get_queryset(self):
        queryset = PokemonSpecies.objects.all().order_by("pokedex_id")
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            filters = Q(name__icontains=search)
            if search.isdigit():
                filters |= Q(pokedex_id=int(search))
            queryset = queryset.filter(filters)
        return queryset


class UserPokemonViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        return (
            UserPokemon.objects.filter(user=self.request.user)
            .select_related("species")
            .prefetch_related("ivs", "evs")
            .order_by("-captured_at")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return UserPokemonDetailSerializer
        if self.action in ("partial_update", "update", "set_team_slot"):
            return UserPokemonTeamUpdateSerializer
        return UserPokemonListSerializer

    @action(detail=True, methods=["patch"], url_path="team-slot")
    def set_team_slot(self, request, pk=None):
        pokemon = self.get_object()
        serializer = UserPokemonTeamUpdateSerializer(pokemon, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserPokemonDetailSerializer(pokemon, context={"request": request}).data)

    @extend_schema(responses=UserPokemonListSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="team")
    def team(self, request):
        queryset = self.get_queryset().filter(active_team_slot__isnull=False).order_by("active_team_slot")
        serializer = UserPokemonListSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    @extend_schema(request=UserPokemonCaptureSerializer, responses=UserPokemonDetailSerializer)
    @action(detail=False, methods=["post"], url_path="capture")
    def capture(self, request):
        serializer = UserPokemonCaptureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        species = serializer.validated_data["species"]
        source_workout_id = serializer.validated_data.get("source_workout_id")

        if not source_workout_id:
            return Response(
                {"detail": "source_workout_id é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            workout = Workout.objects.select_related("encounter_species").get(
                pk=source_workout_id,
                user=request.user,
            )
        except Workout.DoesNotExist:
            return Response(
                {"detail": "Treino não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if workout.status != WorkoutStatus.FINISHED:
            return Response(
                {"detail": "O treino precisa estar finalizado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if workout.encounter_status != EncounterStatus.PENDING:
            return Response(
                {"detail": "Este encontro já foi resolvido (capturado ou fugiu)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if workout.encounter_species_id != species.id:
            return Response(
                {"detail": "Espécie não corresponde ao encontro deste treino."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if UserPokemon.objects.filter(user=request.user, source_workout=workout).exists():
            return Response(
                {"detail": "Você já capturou o Pokémon deste treino."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shiny = serializer.validated_data.get("shiny")
        user_pokemon = grant_pokemon_from_workout_encounter(
            request.user,
            species,
            workout,
            nickname=serializer.validated_data.get("nickname", ""),
            shiny=shiny,
        )
        workout.encounter_status = EncounterStatus.CAPTURED
        workout.save(update_fields=["encounter_status", "modified"])

        return Response(
            UserPokemonDetailSerializer(user_pokemon, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(responses={status.HTTP_204_NO_CONTENT: None})
    @action(detail=True, methods=["post"], url_path="release")
    def release(self, request, pk=None):
        pokemon = self.get_object()
        pokemon.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses=PokemonSpeciesSerializer)
    @action(detail=False, methods=["get"], url_path="random-encounter")
    def random_encounter(self, request):
        return Response(
            {
                "detail": "Encontros aleatórios desativados. Finalize um treino para gerar um encontro.",
            },
            status=status.HTTP_410_GONE,
        )
