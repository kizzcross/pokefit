import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';

import { myPokemonList } from '@/js/api';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { LoadingGridSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';

const CollectionPage = () => {
  const location = useLocation();
  const pokemonReleased = Boolean(
    (location.state as { pokemonReleased?: boolean } | null)?.pokemonReleased,
  );

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['my-pokemon', 'collection'],
    queryFn: async () => (await myPokemonList()).data,
  });

  const items = data?.results ?? [];

  return (
    <>
      <MobileHeader title="Coleção" />
      <main className="px-4 pb-28 pt-4">
        {pokemonReleased ? (
          <PixelCard className="mb-4 border-[var(--color-game-success)]">
            <p className="text-sm text-[var(--color-game-success)]">Pokémon liberado com sucesso.</p>
          </PixelCard>
        ) : null}

        <PixelCard className="mb-4">
          <p className="text-sm text-[var(--color-game-muted)]">
            {isPending ? '...' : `${data?.count ?? items.length} Pokémon capturados`}
          </p>
        </PixelCard>

        <QueryRefetchBar className="mb-3" visible={isQueryRefetching({ isPending, isFetching, data })} />

        {isPending ? (
          <LoadingGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((pokemon) => {
              const image = resolvePokemonSpriteUrl(pokemon.species);
              return (
                <Link key={pokemon.id} to={`/pokemon/${pokemon.id}`}>
                  <PixelCard className="text-center">
                    <PokemonSprite
                      alt={pokemon.display_name ?? 'pokemon'}
                      pokedexId={pokemon.species?.pokedex_id}
                      size="sm"
                      src={image}
                    />
                    <p className="mt-2 text-sm font-semibold">{pokemon.display_name}</p>
                    <p className="text-xs text-[var(--color-game-muted)]">Lv. {pokemon.level}</p>
                  </PixelCard>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};

export default CollectionPage;
