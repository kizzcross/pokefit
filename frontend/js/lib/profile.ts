import { client } from '@/js/lib/api';
import type { User } from '@/js/api/types.gen';

export async function updateMyProfile(payload: {
  nickname?: string;
  trainer_sprite?: string;
}) {
  const response = await client.instance.patch<User>('/api/users/me/', payload);
  return response.data;
}
