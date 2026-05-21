const SPRITES_CDN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';

type SpeciesImageSource = {
  pokedex_id?: number;
  sprite_url?: string | null;
  image_url?: string | null;
  official_artwork_url?: string | null;
};

const isBrokenSpriteUrl = (url: string) =>
  url.includes('firered-leafgreen') || url.includes('pokeapi.co/media/');

export function defaultPixelSpriteUrl(pokedexId: number) {
  return `${SPRITES_CDN}/pokemon/${pokedexId}.png`;
}

export function resolvePokemonSpriteUrl(species?: SpeciesImageSource | null): string | null {
  if (!species?.pokedex_id) {
    return species?.sprite_url ?? species?.image_url ?? null;
  }

  const candidates = [
    species.sprite_url,
    species.image_url,
    species.official_artwork_url,
    defaultPixelSpriteUrl(species.pokedex_id),
  ].filter((url): url is string => Boolean(url));

  const valid = candidates.find((url) => !isBrokenSpriteUrl(url));
  return valid ?? defaultPixelSpriteUrl(species.pokedex_id);
}
