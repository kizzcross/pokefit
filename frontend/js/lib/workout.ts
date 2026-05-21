import { client } from '@/js/lib/api';

export type LastWorkoutExercise = {
  id: number;
  name?: string;
  sets: number;
  reps: number;
  weight: string | number;
  exercise?: {
    id: number;
    name?: string;
    muscle_group?: string;
    image_url?: string | null;
  } | null;
};

export type LastWorkoutByType = {
  id: number;
  workout_type: string;
  ended_at?: string;
  duration_minutes?: number | null;
  total_volume?: string | number;
  exercises: LastWorkoutExercise[];
};

export type BulkExerciseInput = {
  exercise: number;
  sets: number;
  reps: number;
  weight: string | number;
};

export async function fetchActiveDraft() {
  try {
    const response = await client.instance.get('/api/workouts/active-draft/');
    return response.data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function fetchLastWorkoutByType(
  workoutType: string,
  excludeWorkoutId?: number,
): Promise<LastWorkoutByType | null> {
  try {
    const params: Record<string, string> = { workout_type: workoutType };
    if (excludeWorkoutId) params.exclude = String(excludeWorkoutId);

    const response = await client.instance.get<LastWorkoutByType>('/api/workouts/last-by-type/', {
      params,
    });
    return response.data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function addWorkoutExercisesBulk(workoutId: number, exercises: BulkExerciseInput[]) {
  const response = await client.instance.post(`/api/workouts/${workoutId}/exercises/bulk/`, {
    exercises,
  });
  return response.data;
}

export async function addWorkoutExercise(
  workoutId: number,
  payload: BulkExerciseInput,
) {
  const response = await client.instance.post(`/api/workouts/${workoutId}/exercises/`, payload);
  return response.data;
}

export type WorkoutExerciseEntry = {
  id: number;
  name?: string;
  sets?: number;
  reps?: number;
  weight?: string | number;
  volume?: string | number;
  exercise?: {
    id?: number;
    name?: string;
    muscle_group?: string;
    image_url?: string | null;
  } | null;
};

export type WorkoutExerciseUpdate = {
  sets?: number;
  reps?: number;
  weight?: string | number;
};

export async function updateWorkoutExercise(
  workoutId: number,
  entryId: number,
  payload: WorkoutExerciseUpdate,
) {
  const response = await client.instance.patch(
    `/api/workouts/${workoutId}/exercises/${entryId}/`,
    payload,
  );
  return response.data;
}

export async function deleteWorkoutExercise(workoutId: number, entryId: number) {
  await client.instance.delete(`/api/workouts/${workoutId}/exercises/${entryId}/`);
}

export async function deleteWorkout(workoutId: number) {
  await client.instance.delete(`/api/workouts/${workoutId}/`);
}

export async function uploadWorkoutProof(
  workoutId: number,
  photo: File,
  caption?: string,
) {
  const formData = new FormData();
  formData.append('photo', photo);
  if (caption) formData.append('caption', caption);
  const response = await client.instance.post(`/api/workouts/${workoutId}/proof/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
