from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from gifts.permissions import IsGiftAdmin
from gifts.services import GiftError, claim_gift, send_gifts
from pokemon.serializers import UserPokemonDetailSerializer

from .models import GiftNotification
from .serializers import (
    GiftClaimSerializer,
    GiftNotificationSerializer,
    GiftSendResultSerializer,
    GiftSendSerializer,
)


class GiftNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GiftNotificationSerializer
    http_method_names = ["get", "post", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        return (
            GiftNotification.objects.filter(recipient=self.request.user)
            .select_related("sender", "claimed_species")
            .prefetch_related("species_options__species")
            .order_by("-created")
        )

    @extend_schema(responses={200: {"type": "object", "properties": {"count": {"type": "integer"}}}})
    @action(detail=False, methods=["get"], url_path="pending-count")
    def pending_count(self, request):
        from gifts.choices import GiftStatus

        count = self.get_queryset().filter(status=GiftStatus.PENDING).count()
        return Response({"count": count})

    @extend_schema(request=GiftClaimSerializer, responses=UserPokemonDetailSerializer)
    @action(detail=True, methods=["post"], url_path="claim")
    def claim(self, request, pk=None):
        notification = self.get_object()
        serializer = GiftClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        species_id = serializer.validated_data.get("species_id")
        try:
            notification, user_pokemon = claim_gift(
                notification=notification,
                recipient=request.user,
                species_id=species_id,
            )
        except GiftError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "gift": GiftNotificationSerializer(notification, context={"request": request}).data,
                "pokemon": UserPokemonDetailSerializer(
                    user_pokemon, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(request=GiftSendSerializer, responses=GiftSendResultSerializer)
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsGiftAdmin],
        url_path="send",
    )
    def send(self, request):
        serializer = GiftSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            notifications = send_gifts(
                sender=request.user,
                recipient_ids=data["recipient_ids"],
                message=data["message"],
                gift_kind=data["gift_kind"],
                species_ids=data["species_ids"],
            )
        except GiftError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        output = GiftNotificationSerializer(notifications, many=True, context={"request": request})
        return Response(
            {
                "sent_count": len(notifications),
                "batch_id": notifications[0].batch_id if notifications else None,
                "notifications": output.data,
            },
            status=status.HTTP_201_CREATED,
        )
