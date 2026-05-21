import { client } from '@/js/lib/api';

export type TimelineEvent = {
  type: 'workout_finished' | 'pokemon_captured';
  at: string;
  actor: {
    id: number;
    display_name: string;
    email?: string;
    trainer_sprite?: string;
    trainer_sprite_url?: string | null;
  };
  workout?: {
    id: number;
    workout_type: string;
    total_volume?: string;
    perceived_effort?: number | null;
    proof_photo_url?: string | null;
    proof_caption?: string;
    duration_minutes?: number | null;
  };
  encounter?: {
    species_name: string;
    species_pokedex_id: number;
    species_sprite: string;
    status: string;
    captured: boolean;
    shiny: boolean;
  } | null;
  pokemon?: {
    id: number;
    display_name: string;
    species_name: string;
    species_pokedex_id: number;
    species_sprite: string;
    shiny: boolean;
  };
};

export async function fetchMyTimeline() {
  const response = await client.instance.get<{ results: TimelineEvent[]; count: number }>(
    '/api/timeline/',
  );
  return response.data;
}

export async function fetchUserTimeline(userId: number) {
  const response = await client.instance.get<{
    user: {
      id: number;
      display_name: string;
      email?: string;
      trainer_sprite?: string;
      trainer_sprite_url?: string | null;
    };
    results: TimelineEvent[];
    count: number;
  }>(`/api/users/${userId}/timeline/`);
  return response.data;
}
