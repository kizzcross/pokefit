from .choices import ExerciseMuscleGroup, WorkoutType

WORKOUT_TYPE_MUSCLE_GROUPS: dict[str, list[str]] = {
    WorkoutType.CHEST_TRICEPS: [ExerciseMuscleGroup.CHEST, ExerciseMuscleGroup.ARMS],
    WorkoutType.BACK_BICEPS: [ExerciseMuscleGroup.BACK, ExerciseMuscleGroup.ARMS],
    WorkoutType.LEGS: [ExerciseMuscleGroup.LEGS],
    WorkoutType.SHOULDERS: [ExerciseMuscleGroup.SHOULDERS],
    WorkoutType.ARMS: [ExerciseMuscleGroup.ARMS],
    WorkoutType.CARDIO: [ExerciseMuscleGroup.CARDIO],
    WorkoutType.FULL_BODY: [
        ExerciseMuscleGroup.FULL_BODY,
        ExerciseMuscleGroup.CHEST,
        ExerciseMuscleGroup.BACK,
        ExerciseMuscleGroup.LEGS,
    ],
    WorkoutType.MOBILITY: [ExerciseMuscleGroup.MOBILITY, ExerciseMuscleGroup.CORE],
}
