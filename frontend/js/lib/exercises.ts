import { client } from '@/js/lib/api';

export type ExerciseFormPayload = {
  name: string;
  description?: string;
  instructions?: string;
  muscle_group: string;
  difficulty: string;
  equipment?: string;
  video_url?: string;
  is_active?: boolean;
  image?: File | null;
};

function buildExerciseFormData(payload: ExerciseFormPayload): FormData {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description ?? '');
  formData.append('instructions', payload.instructions ?? '');
  formData.append('muscle_group', payload.muscle_group);
  formData.append('difficulty', payload.difficulty);
  formData.append('equipment', payload.equipment ?? '');
  formData.append('video_url', payload.video_url ?? '');
  formData.append('is_active', String(payload.is_active ?? true));
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return formData;
}

export async function createExercise(payload: ExerciseFormPayload) {
  const response = await client.instance.post('/api/exercises/', buildExerciseFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateExercise(id: number, payload: ExerciseFormPayload) {
  const response = await client.instance.patch(`/api/exercises/${id}/`, buildExerciseFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteExercise(id: number) {
  await client.instance.delete(`/api/exercises/${id}/`);
}
