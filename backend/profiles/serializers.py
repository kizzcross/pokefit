from rest_framework import serializers

from profiles.services.weekly_goal import (
    WeeklyGoalAlreadySetError,
    build_weekly_goal_status,
    save_weekly_goal,
)


class WeeklyGoalStatusSerializer(serializers.Serializer):
    has_active_goal = serializers.BooleanField()
    target = serializers.IntegerField(allow_null=True)
    suggested_target = serializers.IntegerField()
    current = serializers.IntegerField()
    hp_current = serializers.IntegerField()
    hp_max = serializers.IntegerField()
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    iso_year = serializers.IntegerField()
    iso_week = serializers.IntegerField()
    progress_percent = serializers.IntegerField()
    goal_met = serializers.BooleanField()
    reward_claimed = serializers.BooleanField()
    reward_workout_id = serializers.IntegerField(allow_null=True)
    pending_legendary_encounter = serializers.BooleanField()
    goal_locked = serializers.BooleanField()


class SaveWeeklyGoalSerializer(serializers.Serializer):
    target = serializers.IntegerField(min_value=1, max_value=7)

    def save(self, **kwargs):
        user = self.context["request"].user
        try:
            save_weekly_goal(user, self.validated_data["target"])
        except WeeklyGoalAlreadySetError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return build_weekly_goal_status(user)
