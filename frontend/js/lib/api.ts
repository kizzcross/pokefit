import { parse as cookieParse } from 'cookie';

import { client } from '@/js/api/client.gen';

client.setConfig({
  baseURL: '',
  withCredentials: true,
});

client.instance.interceptors.request.use((request) => {
  const { csrftoken } = cookieParse(document.cookie);
  if (request.headers && csrftoken) {
    request.headers['X-CSRFTOKEN'] = csrftoken;
  }
  return request;
});

export { client };

export async function capturePokemon(data: {
  species_id: number;
  nickname?: string;
  shiny?: boolean;
  source_workout_id?: number | null;
}) {
  const response = await client.instance.post('/api/my-pokemon/capture/', data);
  return response.data;
}
