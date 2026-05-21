import { client } from '@/js/lib/api';

export const SHOWDOWN_TRAINER_CDN = 'https://play.pokemonshowdown.com/sprites/trainers';

export type TrainerSpriteOption = {
  slug: string;
  url: string;
  label: string;
};

export function trainerSpriteUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase().replace(/\.png$/i, '');
  if (!normalized) return null;
  return `${SHOWDOWN_TRAINER_CDN}/${normalized}.png`;
}

export async function fetchTrainerSprites(params?: { q?: string; featured?: boolean }) {
  const response = await client.instance.get<{ results: TrainerSpriteOption[]; count: number }>(
    '/api/users/trainer-sprites/',
    {
      params: {
        q: params?.q || undefined,
        featured: params?.featured ? '1' : undefined,
      },
    },
  );
  return response.data;
}

export async function updateMyTrainerSprite(trainerSprite: string) {
  const response = await client.instance.patch('/api/users/me/', {
    trainer_sprite: trainerSprite,
  });
  return response.data;
}
