from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social.choices import FriendshipStatus
from social.models import Friendship
from social.serializers import (
    FriendRequestCreateSerializer,
    FriendshipSerializer,
    UserBriefSerializer,
)
from social.services.friends import accepted_friend_ids, display_name
from workouts.services.timeline import build_feed_timeline_events

User = get_user_model()


class FriendViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserBriefSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="list")
    def friends_list(self, request):
        friend_ids = accepted_friend_ids(request.user)
        friends = User.objects.filter(pk__in=friend_ids).order_by("email")
        serializer = UserBriefSerializer(friends, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="requests")
    def requests(self, request):
        incoming = Friendship.objects.filter(
            to_user=request.user,
            status=FriendshipStatus.PENDING,
        ).select_related("from_user")
        outgoing = Friendship.objects.filter(
            from_user=request.user,
            status=FriendshipStatus.PENDING,
        ).select_related("to_user")
        return Response(
            {
                "incoming": FriendshipSerializer(incoming, many=True).data,
                "outgoing": FriendshipSerializer(outgoing, many=True).data,
            }
        )

    @extend_schema(request=FriendRequestCreateSerializer, responses=FriendshipSerializer)
    @action(detail=False, methods=["post"], url_path="requests/send")
    def send_request(self, request):
        serializer = FriendRequestCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        friendship = serializer.save()
        return Response(
            FriendshipSerializer(friendship).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        friendship = Friendship.objects.filter(
            pk=pk,
            to_user=request.user,
            status=FriendshipStatus.PENDING,
        ).first()
        if not friendship:
            return Response({"detail": "Pedido não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        friendship.status = FriendshipStatus.ACCEPTED
        friendship.save(update_fields=["status", "modified"])
        return Response(FriendshipSerializer(friendship).data)

    @action(detail=True, methods=["post"], url_path="decline")
    def decline(self, request, pk=None):
        friendship = Friendship.objects.filter(
            pk=pk,
            to_user=request.user,
            status=FriendshipStatus.PENDING,
        ).first()
        if not friendship:
            return Response({"detail": "Pedido não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        friendship.status = FriendshipStatus.DECLINED
        friendship.save(update_fields=["status", "modified"])
        return Response(FriendshipSerializer(friendship).data)

    @action(detail=True, methods=["delete"], url_path="remove")
    def remove(self, request, pk=None):
        other_id = int(pk)
        deleted, _ = Friendship.objects.filter(
            Q(from_user=request.user, to_user_id=other_id)
            | Q(from_user_id=other_id, to_user=request.user),
            status=FriendshipStatus.ACCEPTED,
        ).delete()
        if not deleted:
            return Response({"detail": "Amizade não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="block")
    def block(self, request, pk=None):
        other_id = int(pk)
        if other_id == request.user.pk:
            return Response({"detail": "Ação inválida."}, status=status.HTTP_400_BAD_REQUEST)

        Friendship.objects.filter(
            Q(from_user=request.user, to_user_id=other_id)
            | Q(from_user_id=other_id, to_user=request.user),
        ).delete()

        Friendship.objects.create(
            from_user=request.user,
            to_user_id=other_id,
            status=FriendshipStatus.BLOCKED,
        )
        return Response({"detail": "Usuário bloqueado."})


class TimelineViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        events = build_feed_timeline_events(request.user, include_proof_photos=True, limit=40)
        return Response({"results": events, "count": len(events)})
