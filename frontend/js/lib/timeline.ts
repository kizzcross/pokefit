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

export type TimelineFeedPage = {
  results: TimelineEvent[];
  count: number;
  next_cursor: string | null;
};

export type TimelineFetchParams = {
  before?: string | null;
  limit?: number;
};

export async function fetchMyTimeline(params: TimelineFetchParams = {}): Promise<TimelineFeedPage> {
  const search: Record<string, string> = {};
  if (params.before) search.before = params.before;
  if (params.limit) search.limit = String(params.limit);

  const response = await client.instance.get<TimelineFeedPage>('/api/timeline/', {
    params: search,
  });
  return {
    results: response.data.results ?? [],
    count: response.data.count ?? 0,
    next_cursor: response.data.next_cursor ?? null,
  };
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
