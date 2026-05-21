from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from gifts.permissions import IsGiftAdmin
from social.serializers import UserBriefSerializer
from social.services.friends import are_friends, display_name, is_blocked, user_public_profile
from workouts.services.calendar import build_calendar_month
from workouts.services.timeline import build_timeline_events

from .models import User
from users.trainer_sprites import allowed_trainer_slugs, trainer_sprite_url

from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="q",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Nickname or e-mail fragment (min. 1 character).",
            ),
        ],
        responses=UserBriefSerializer(many=True),
    )
    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated, IsGiftAdmin],
        url_path="gift-recipients",
    )
    def gift_recipients(self, request):
        query = (request.query_params.get("q") or "").strip()
        if len(query) < 1:
            return Response([])
        recipients = User.objects.filter(is_active=True)
        if "@" in query:
            recipients = recipients.filter(email__icontains=query.lower())
        else:
            term = query.lower()
            recipients = recipients.filter(
                Q(nickname__icontains=term) | Q(email__icontains=term)
            )
        recipients = recipients.order_by("nickname", "email")[:20]
        serializer = UserBriefSerializer(recipients, many=True, context={"request": request})
        return Response(serializer.data)

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="login")
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail": "User account is disabled."}, status=status.HTTP_403_FORBIDDEN)
        login(request, user)
        return Response(UserSerializer(user).data)

    @extend_schema(request=None, responses={204: None})
    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="logout")
    def logout(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated], url_path="me")
    def me(self, request):
        if request.method == "PATCH":
            serializer = UserProfileUpdateSerializer(
                request.user,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            return Response(UserSerializer(user).data)
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="trainer-sprites")
    def trainer_sprites(self, request):
        featured = request.query_params.get("featured", "").lower() in ("1", "true", "yes")
        slugs = sorted(allowed_trainer_slugs())
        if featured:
            picks = [
                "red",
                "blue",
                "leaf",
                "ethan",
                "lyra",
                "n",
                "hilbert",
                "hilda",
                "rosa",
                "calem",
                "serena",
                "elio",
                "selene",
                "victor",
                "gloria",
                "florian",
                "juliana",
                "ash",
                "misty",
                "brock",
                "cynthia",
                "steven",
                "wallace",
                "diantha",
                "leon",
                "hop",
                "iono",
                "rika",
                "kieran",
            ]
            slugs = [slug for slug in picks if slug in allowed_trainer_slugs()]
        else:
            query = (request.query_params.get("q") or "").strip().lower()
            if query:
                exact = [slug for slug in slugs if slug == query]
                partial = [slug for slug in slugs if query in slug and slug != query]
                slugs = (exact + partial)[:120]

        results = [
            {
                "slug": slug,
                "url": trainer_sprite_url(slug),
                "label": slug.replace("-", " ").replace("_", " "),
            }
            for slug in slugs
        ]
        return Response({"results": results, "count": len(results)})

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="register")
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def _friend_or_self(self, request, pk):
        if int(pk) == request.user.pk:
            return request.user, True
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None, False
        if is_blocked(request.user, target):
            return None, False
        if not are_friends(request.user, target):
            return None, False
        return target, False

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="timeline")
    def user_timeline(self, request, pk=None):
        target, is_self = self._friend_or_self(request, pk)
        if target is None:
            return Response(
                {"detail": "Perfil indisponível ou vocês não são amigos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        include_photos = is_self or are_friends(request.user, target)
        events = build_timeline_events(target, include_proof_photos=include_photos, limit=40)
        return Response(
            {
                "user": user_public_profile(target, include_email=True),
                "results": events,
                "count": len(events),
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="calendar")
    def user_calendar(self, request, pk=None):
        target, is_self = self._friend_or_self(request, pk)
        if target is None:
            return Response(
                {"detail": "Perfil indisponível ou vocês não são amigos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            year = int(request.query_params.get("year", timezone.now().year))
            month = int(request.query_params.get("month", timezone.now().month))
        except (TypeError, ValueError):
            return Response(
                {"detail": "year e month devem ser números inteiros."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        include_photos = is_self or are_friends(request.user, target)
        data = build_calendar_month(target, year, month, include_proof_photos=include_photos)
        data["user"] = user_public_profile(target)
        return Response(data)
