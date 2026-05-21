import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { myPokemonRetrieve } from '@/js/api';
import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import StatBar from '@/js/components/game/StatBar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import { PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { releasePokemon } from '@/js/lib/pokemon';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';

const PokemonDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pokemonId = Number(id);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const pokemonQuery = useQuery({
    queryKey: ['my-pokemon', pokemonId],
    queryFn: async () => (await myPokemonRetrieve({ path: { id: String(pokemonId) } })).data,
    enabled: Number.isFinite(pokemonId),
  });

  const releaseMutation = useMutation({
    mutationFn: () => releasePokemon(pokemonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pokemon'] });
      navigate('/collection', { state: { pokemonReleased: true } });
    },
    onError: () => {
      setReleaseError('Não foi possível liberar este Pokémon.');
    },
  });

  const pokemon = pokemonQuery.data;
  const image = resolvePokemonSpriteUrl(pokemon?.species);
  const displayName = pokemon?.display_name ?? pokemon?.species?.name ?? 'Pokémon';
  const onTeam = pokemon?.active_team_slot != null;

  const handleRelease = () => {
    const warning = onTeam
      ? `${displayName} está no time (slot ${pokemon?.active_team_slot}). Liberar remove da coleção e do time. Continuar?`
      : `Liberar ${displayName}? Ele sai da sua coleção para sempre.`;
    if (!window.confirm(warning)) return;
    setReleaseError(null);
    releaseMutation.mutate();
  };

  return (
    <>
      <MobileHeader backTo="/collection" title={pokemonQuery.isPending ? 'Pokémon' : displayName} />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isQueryRefetching(pokemonQuery)} />

        {pokemonQuery.isPending ? (
          <PageLoading label="Carregando Pokémon..." />
        ) : pokemonQuery.isError ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-danger)]">Pokémon não encontrado.</p>
          </PixelCard>
        ) : (
        <>
        <PixelCard className="text-center">
          <PokemonSprite
            alt={displayName}
            pokedexId={pokemon?.species?.pokedex_id}
            size="lg"
            src={image}
          />
          <p className="mt-3 text-game-title text-[var(--color-game-accent)]">
            {pokemon?.species?.name}
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-[var(--color-game-muted)]">
            <span>
              {pokemon?.nature} • Lv. {pokemon?.level}
            </span>
            {pokemon?.shiny ? (
              <span className="inline-flex items-center gap-1 text-[var(--color-game-accent)]">
                <GameIcon name="shiny" size={14} />
                <span className="text-game-label">Shiny</span>
              </span>
            ) : null}
          </p>
        </PixelCard>

        <PixelCard>
          <h2 className="text-game-title">IVs</h2>
          <div className="mt-3 space-y-2">
            <StatBar label="HP" max={31} value={pokemon?.ivs?.hp ?? 0} />
            <StatBar color="bg-[var(--color-game-danger)]" label="ATK" max={31} value={pokemon?.ivs?.attack ?? 0} />
            <StatBar color="bg-[var(--color-game-info)]" label="DEF" max={31} value={pokemon?.ivs?.defense ?? 0} />
            <StatBar label="Sp. ATK" max={31} value={pokemon?.ivs?.sp_attack ?? 0} />
            <StatBar label="Sp. DEF" max={31} value={pokemon?.ivs?.sp_defense ?? 0} />
            <StatBar label="SPD" max={31} value={pokemon?.ivs?.speed ?? 0} />
          </div>
        </PixelCard>

        <PixelCard>
          <p className="text-sm">Carinho: {pokemon?.affection ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--color-game-muted)]">
            Slot do time: {pokemon?.active_team_slot ?? 'reserva'}
          </p>
        </PixelCard>

        <PixelCard className="space-y-3 border-[var(--color-game-danger)]">
          <h2 className="text-game-title text-[var(--color-game-danger)]">Liberar Pokémon</h2>
          <p className="text-xs text-[var(--color-game-muted)]">
            Envia o Pokémon de volta à natureza. Não dá para desfazer — use se quiser espaço na coleção.
          </p>
          {releaseError ? (
            <p className="text-sm text-[var(--color-game-danger)]">{releaseError}</p>
          ) : null}
          <PixelButton
            disabled={releaseMutation.isPending}
            fullWidth
            variant="danger"
            onClick={handleRelease}
          >
            {releaseMutation.isPending ? 'Liberando...' : 'Liberar Pokémon'}
          </PixelButton>
        </PixelCard>
        </>
        )}
      </main>
    </>
  );
};

export default PokemonDetailPage;
