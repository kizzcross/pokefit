from profiles.views import WeeklyGoalViewSet

routes = [
    {"regex": r"weekly-goal", "viewset": WeeklyGoalViewSet, "basename": "weekly-goal"},
]
