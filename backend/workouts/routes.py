from .views import ExerciseViewSet, WorkoutViewSet


routes = [
    {"regex": r"exercises", "viewset": ExerciseViewSet, "basename": "exercise"},
    {"regex": r"workouts", "viewset": WorkoutViewSet, "basename": "workout"},
]
