import { client } from '@/js/lib/api';

export type UserBrief = {
  id: number;
  email: string;
  display_name: string;
  trainer_sprite?: string;
  trainer_sprite_url?: string | null;
};

export type Friendship = {
  id: number;
  from_user: UserBrief;
  to_user: UserBrief;
  status: string;
  created: string;
};

export async function fetchFriends() {
  const response = await client.instance.get<UserBrief[]>('/api/friends/list/');
  return response.data;
}

export async function fetchFriendRequests() {
  const response = await client.instance.get<{
    incoming: Friendship[];
    outgoing: Friendship[];
  }>('/api/friends/requests/');
  return response.data;
}

export async function sendFriendRequest(email: string) {
  const response = await client.instance.post<Friendship>('/api/friends/requests/send/', { email });
  return response.data;
}

export async function acceptFriendRequest(friendshipId: number) {
  const response = await client.instance.post<Friendship>(`/api/friends/${friendshipId}/accept/`);
  return response.data;
}

export async function declineFriendRequest(friendshipId: number) {
  const response = await client.instance.post<Friendship>(`/api/friends/${friendshipId}/decline/`);
  return response.data;
}

export async function removeFriend(userId: number) {
  await client.instance.delete(`/api/friends/${userId}/remove/`);
}
