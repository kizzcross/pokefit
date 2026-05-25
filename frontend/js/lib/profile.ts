import { client } from '@/js/lib/api';
import type { User, UserPokemonList } from '@/js/api/types.gen';

export async function updateMyProfile(payload: {
  nickname?: string;
  trainer_sprite?: string;
}) {
  const response = await client.instance.patch<User>('/api/users/me/', payload);
  return response.data;
}

export type PublicProfileUser = {
  id: number;
  nickname: string;
  display_name: string;
  trainer_sprite: string;
  trainer_sprite_url: string | null;
  email?: string;
};

export type PublicProfileResponse = {
  user: PublicProfileUser;
  is_self: boolean;
  is_friend: boolean;
  friend_count: number;
  pokemon_count: number;
  team_count: number;
  current_streak: number;
  joined_at: string | null;
};

export type PublicProfileFriend = {
  id: number;
  email: string;
  nickname: string;
  display_name: string;
  trainer_sprite: string;
  trainer_sprite_url: string | null;
};

export async function fetchUserProfile(userId: number): Promise<PublicProfileResponse> {
  const response = await client.instance.get<PublicProfileResponse>(
    `/api/users/${userId}/profile/`,
  );
  return response.data;
}

export async function fetchUserFriends(userId: number): Promise<PublicProfileFriend[]> {
  const response = await client.instance.get<PublicProfileFriend[]>(
    `/api/users/${userId}/friends/`,
  );
  return response.data;
}

export async function fetchUserPokemon(
  userId: number,
): Promise<{ results: UserPokemonList[]; count: number }> {
  const response = await client.instance.get<{ results: UserPokemonList[]; count: number }>(
    `/api/users/${userId}/pokemon/`,
  );
  return response.data;
}

export async function fetchUserTeam(
  userId: number,
): Promise<{ results: UserPokemonList[]; count: number }> {
  const response = await client.instance.get<{ results: UserPokemonList[]; count: number }>(
    `/api/users/${userId}/team/`,
  );
  return response.data;
}
