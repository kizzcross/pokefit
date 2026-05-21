from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from profiles.serializers import SaveWeeklyGoalSerializer, WeeklyGoalStatusSerializer
from profiles.services.weekly_goal import build_weekly_goal_status


class WeeklyGoalViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=WeeklyGoalStatusSerializer)
    def list(self, request):
        return Response(build_weekly_goal_status(request.user))

    @extend_schema(request=SaveWeeklyGoalSerializer, responses=WeeklyGoalStatusSerializer)
    def create(self, request):
        serializer = SaveWeeklyGoalSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_201_CREATED)
