export const WORKOUT_TYPE_LABELS: Record<string, string> = {
  chest_triceps: 'Peito + Tríceps',
  back_biceps: 'Costas + Bíceps',
  legs: 'Pernas',
  shoulders: 'Ombros',
  arms: 'Braços',
  cardio: 'Cardio',
  full_body: 'Corpo inteiro',
  mobility: 'Mobilidade',
};

export const WORKOUT_TYPE_MUSCLE_GROUPS: Record<string, string[]> = {
  chest_triceps: ['chest', 'arms'],
  back_biceps: ['back', 'arms'],
  legs: ['legs'],
  shoulders: ['shoulders'],
  arms: ['arms'],
  cardio: ['cardio'],
  full_body: ['chest', 'back', 'legs', 'full_body'],
  mobility: ['mobility', 'core'],
};

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Peito',
  back: 'Costas',
  legs: 'Pernas',
  shoulders: 'Ombros',
  arms: 'Braços',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Corpo inteiro',
  mobility: 'Mobilidade',
};

export function workoutTypeLabel(value?: string | null) {
  if (!value) return 'Treino';
  return WORKOUT_TYPE_LABELS[value] ?? value.replaceAll('_', ' ');
}
