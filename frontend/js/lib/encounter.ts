import { client } from '@/js/lib/api';

import type { PokemonSpecies } from '@/js/api/types.gen';

export type PendingEncounter = {
  workout_id: number;
  encounter_status: string;
  species: PokemonSpecies;
};

export type WorkoutWithEncounter = {
  id: number;
  encounter_status?: string;
  encounter_species?: PokemonSpecies | null;
};

export async function fetchPendingEncounter(): Promise<PendingEncounter | null> {
  try {
    const response = await client.instance.get<PendingEncounter>('/api/workouts/pending-encounter/');
    return response.data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function declineEncounter(workoutId: number) {
  const response = await client.instance.post(`/api/workouts/${workoutId}/decline-encounter/`);
  return response.data;
}
