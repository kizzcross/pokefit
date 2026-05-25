import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import PokemonSprite from '@/js/components/game/PokemonSprite';
import StatBar from '@/js/components/game/StatBar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { LoadingGridSkeleton } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import { fetchUserPokemon, fetchUserProfile } from '@/js/lib/profile';

const UserCollectionPage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const isValidId = Number.isFinite(userId);

  const profileQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: isValidId,
    retry: false,
  });

  const pokemonQuery = useQuery({
    queryKey: ['user-pokemon', userId],
    queryFn: () => fetchUserPokemon(userId),
    enabled: isValidId && Boolean(profileQuery.data),
  });

  const backTo = `/users/${id}`;
  const title = profileQuery.data?.user.display_name
    ? `Coleção de ${profileQuery.data.user.display_name}`
    : 'Coleção';
  const items = pokemonQuery.data?.results ?? [];

  if (profileQuery.isError) {
    return (
      <>
        <MobileHeader backTo="/friends" title="Coleção" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard className="border-[var(--color-game-danger)]">
            <p className="text-sm text-[var(--color-game-danger)]">
              Você não tem permissão para ver esta coleção.
            </p>
          </PixelCard>
        </main>
      </>
    );
  }

  return (
    <>
      <MobileHeader backTo={backTo} title={title} />
      <main className="px-4 pb-28 pt-4">
        <PixelCard className="mb-4">
          <p className="text-sm text-[var(--color-game-muted)]">
            {pokemonQuery.isPending
              ? '...'
              : `${pokemonQuery.data?.count ?? items.length} Pokémon capturados`}
          </p>
        </PixelCard>

        {pokemonQuery.isPending ? (
          <LoadingGridSkeleton count={6} />
        ) : items.length === 0 ? (
          <PixelCard>
            <p className="text-xs text-[var(--color-game-muted)]">
              Esse treinador ainda não capturou nenhum Pokémon.
            </p>
          </PixelCard>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((pokemon) => {
              const image = resolvePokemonSpriteUrl(pokemon.species);
              return (
                <PixelCard key={pokemon.id} className="text-center">
                  <PokemonSprite
                    alt={pokemon.display_name ?? 'pokemon'}
                    pokedexId={pokemon.species?.pokedex_id}
                    size="sm"
                    src={image}
                  />
                  <p className="mt-2 truncate text-sm font-semibold">{pokemon.display_name}</p>
                  <p className="text-xs text-[var(--color-game-muted)]">Lv. {pokemon.level}</p>
                  <div className="mt-2 px-1">
                    <StatBar
                      color="bg-[var(--color-game-accent)]"
                      label="XP"
                      max={100}
                      value={pokemon.experience_progress_percent ?? 0}
                    />
                  </div>
                </PixelCard>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};

export default UserCollectionPage;
