import { client } from '@/js/lib/api';
import type { PokemonSpecies, UserPokemonDetail } from '@/js/api/types.gen';

export type GiftSenderDisplay = {
  id: number;
  display_name: string;
  email: string;
};

export type GiftSpeciesOption = {
  id: number;
  species: PokemonSpecies;
  sort_order: number;
};

export type GiftNotification = {
  id: number;
  batch_id: string;
  message: string;
  gift_kind: 'direct' | 'choice';
  status: 'pending' | 'claimed';
  is_pending: boolean;
  sender_display: GiftSenderDisplay;
  species_options: GiftSpeciesOption[];
  claimed_at: string | null;
  created: string;
};

export type GiftRecipientSearch = {
  id: number;
  email: string;
  nickname: string;
  display_name: string;
};

export async function fetchGiftInbox() {
  const response = await client.instance.get<GiftNotification[] | { results: GiftNotification[] }>(
    '/api/gifts/',
  );
  const data = response.data;
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchGiftPendingCount() {
  const response = await client.instance.get<{ count: number }>('/api/gifts/pending-count/');
  return response.data.count;
}

export async function claimGift(giftId: number, speciesId?: number) {
  const response = await client.instance.post<{
    gift: GiftNotification;
    pokemon: UserPokemonDetail;
  }>(`/api/gifts/${giftId}/claim/`, {
    species_id: speciesId ?? null,
  });
  return response.data;
}

export async function sendGifts(payload: {
  recipient_ids: number[];
  message: string;
  gift_kind: 'direct' | 'choice';
  species_ids: number[];
}) {
  const response = await client.instance.post<{
    sent_count: number;
    batch_id: string;
    notifications: GiftNotification[];
  }>('/api/gifts/send/', payload);
  return response.data;
}

export async function searchGiftRecipients(query: string) {
  const response = await client.instance.get<GiftRecipientSearch[] | { detail?: string }>(
    '/api/users/gift-recipients/',
    {
      params: { q: query },
      validateStatus: (status) => status < 500,
    },
  );
  if (response.status >= 400) {
    const detail =
      typeof response.data === 'object' &&
      response.data !== null &&
      typeof response.data.detail === 'string'
        ? response.data.detail
        : 'Não foi possível buscar usuários.';
    const error = new Error(detail) as Error & { response?: typeof response };
    error.response = response;
    throw error;
  }
  const data = response.data;
  return Array.isArray(data) ? data : [];
}
