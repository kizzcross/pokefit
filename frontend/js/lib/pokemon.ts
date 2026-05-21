import { client } from '@/js/lib/api';

export async function releasePokemon(id: number) {
  await client.instance.post(`/api/my-pokemon/${id}/release/`);
}
