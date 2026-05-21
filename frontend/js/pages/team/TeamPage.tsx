import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { myPokemonList, myPokemonTeamList, myPokemonTeamSlotPartialUpdate } from '@/js/api';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import StatBar from '@/js/components/game/StatBar';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import { PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { mergeQueryState } from '@/js/hooks/useQueryLoading';

const TeamPage = () => {
  const queryClient = useQueryClient();

  const teamQuery = useQuery({
    queryKey: ['my-pokemon', 'team'],
    queryFn: async () => (await myPokemonTeamList()).data,
  });

  const collectionQuery = useQuery({
    queryKey: ['my-pokemon', 'collection'],
    queryFn: async () => (await myPokemonList()).data,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ pokemonId, slot }: { pokemonId: number; slot: number | null }) =>
      (
        await myPokemonTeamSlotPartialUpdate({
          path: { id: String(pokemonId) },
          body: { active_team_slot: slot },
          throwOnError: true,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pokemon'] });
    },
  });

  const { isPending, isRefetching } = mergeQueryState(teamQuery, collectionQuery);
  const team = Array.isArray(teamQuery.data) ? teamQuery.data : [];
  const bench = (collectionQuery.data?.results ?? []).filter(
    (p) => !p.active_team_slot,
  );

  return (
    <>
      <MobileHeader title="Time ativo" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isRefetching} />

        {isPending ? (
          <PageLoading label="Carregando time..." />
        ) : (
        <>
        <PixelCard className="border-[var(--color-game-info)]">
          <p className="text-sm text-[var(--color-game-muted)]">
            Pokémon no time ganham <strong className="text-[var(--color-game-text)]">XP</strong> e{' '}
            <strong className="text-[var(--color-game-text)]">carinho</strong> ao finalizar treinos.
            Ao subir de nível, podem evoluir conforme a cadeia do Pokédex.
          </p>
        </PixelCard>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, index) => {
            const slot = index + 1;
            const member = team.find((p) => p.active_team_slot === slot);
            const image = resolvePokemonSpriteUrl(member?.species);
            return (
              <PixelCard key={slot} className="text-center">
                <p className="text-[10px] text-[var(--color-game-muted)]">Slot {slot}</p>
                <div className="my-2">
                  <PokemonSprite
                    alt={member?.display_name ?? 'empty'}
                    pokedexId={member?.species?.pokedex_id}
                    size="sm"
                    src={image}
                  />
                </div>
                <p className="text-xs font-semibold">{member?.display_name ?? 'Vazio'}</p>
                {member ? (
                  <>
                    <p className="text-[10px] text-[var(--color-game-muted)]">Lv. {member.level}</p>
                    <div className="mt-1 px-1">
                      <StatBar
                        color="bg-[var(--color-game-accent)]"
                        label="XP"
                        max={100}
                        value={member.experience_progress_percent ?? 0}
                      />
                    </div>
                    <PixelButton
                      className="mt-2 w-full text-[8px]"
                      onClick={() => assignMutation.mutate({ pokemonId: member.id, slot: null })}
                      variant="secondary"
                    >
                      Remover
                    </PixelButton>
                  </>
                ) : null}
              </PixelCard>
            );
          })}
        </div>

        <PixelCard>
          <h2 className="text-game-title">Reserva</h2>
          <ul className="mt-3 space-y-2">
            {bench.map((pokemon) => (
              <li
                key={pokemon.id}
                className="flex items-center justify-between gap-2 border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] p-2"
              >
                <span className="text-sm">{pokemon.display_name}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((slot) => (
                    <button
                      key={slot}
                      className="min-h-8 min-w-8 border-2 border-[var(--color-game-border)] bg-[var(--color-game-panel)] text-[10px]"
                      onClick={() => assignMutation.mutate({ pokemonId: pokemon.id, slot })}
                      type="button"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </PixelCard>
        </>
        )}
      </main>
    </>
  );
};

export default TeamPage;
