import type { WorkoutFinishResult } from '@/js/api/types.gen';
import { client } from '@/js/lib/api';

export type CardioReference = {
  reference_pace_seconds_per_km: number;
  reference_pace_display: string;
  has_previous_cardio: boolean;
  last_cardio_ended_at?: string | null;
  last_cardio_duration_minutes?: number | null;
  last_cardio_pace_display?: string | null;
};

export type CardioPreview = {
  progress_score: number;
  reference_pace_seconds_per_km: number;
  reference_pace_display: string;
  current_pace_display: string;
  has_previous_cardio: boolean;
  tier: 'improved' | 'slower' | 'steady';
  message: string;
};

export type CardioSessionInput = {
  duration_minutes: number;
  pace_minutes: number;
  pace_seconds: number;
};

export function paceSecondsFromParts(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parsePaceDisplay(pace: string): { minutes: number; seconds: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(pace.trim());
  if (!match) return null;
  return { minutes: Number(match[1]), seconds: Number(match[2]) };
}

export function partsFromPaceSeconds(secondsPerKm: number): { minutes: number; seconds: number } {
  return { minutes: Math.floor(secondsPerKm / 60), seconds: secondsPerKm % 60 };
}

export async function fetchCardioReference(workoutId: number): Promise<CardioReference> {
  const response = await client.instance.get<CardioReference>(
    `/api/workouts/${workoutId}/cardio-reference/`,
  );
  return response.data;
}

export async function previewCardioSession(
  workoutId: number,
  payload: CardioSessionInput,
): Promise<CardioPreview> {
  const response = await client.instance.post<CardioPreview>(
    `/api/workouts/${workoutId}/cardio-preview/`,
    payload,
  );
  return response.data;
}

export async function saveCardioSession(workoutId: number, payload: CardioSessionInput) {
  const response = await client.instance.post(`/api/workouts/${workoutId}/cardio-session/`, payload);
  return response.data;
}

export async function finishCardioWorkout(
  workoutId: number,
  payload: CardioSessionInput & { perceived_effort?: number },
): Promise<WorkoutFinishResult> {
  const response = await client.instance.post<WorkoutFinishResult>(
    `/api/workouts/${workoutId}/finish-cardio/`,
    payload,
  );
  return response.data;
}

export function workoutDetailPath(workout: { id?: number; workout_type?: string }): string {
  if (workout.workout_type === 'cardio' && workout.id) {
    return `/workout/cardio/${workout.id}`;
  }
  if (workout.id) return `/workout/${workout.id}`;
  return '/workout/new';
}
