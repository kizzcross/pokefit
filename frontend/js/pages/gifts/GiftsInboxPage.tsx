import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { claimGift, fetchGiftInbox, type GiftNotification } from '@/js/lib/gifts';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import { cn } from '@/js/lib/utils';

const GiftClaimCard = ({
  gift,
  onClaimed,
}: {
  gift: GiftNotification;
  onClaimed: (pokemonId: number) => void;
}) => {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(
    gift.gift_kind === 'direct' ? gift.species_options[0]?.species.id ?? null : null,
  );
  const [error, setError] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: () => claimGift(gift.id, selectedSpeciesId ?? undefined),
    onSuccess: (data) => {
      setError(null);
      onClaimed(data.pokemon.id);
    },
    onError: () => setError('Não foi possível resgatar o presente.'),
  });

  const isChoice = gift.gift_kind === 'choice';
  const optionCount = gift.species_options.length;

  return (
    <PixelCard className="border-[var(--color-game-accent)]">
      <div className="flex items-start gap-2">
        <GameIcon className="shrink-0 text-[var(--color-game-accent)]" name="missions" size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-game-title text-[var(--color-game-accent)]">Presente!</p>
          <p className="text-[10px] text-[var(--color-game-muted)]">
            De {gift.sender_display.display_name}
          </p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{gift.message}</p>

      {isChoice ? (
        <p className="mt-3 text-xs text-[var(--color-game-muted)]">
          Escolha 1 dos {optionCount} Pokémon:
        </p>
      ) : (
        <p className="mt-3 text-xs text-[var(--color-game-muted)]">Você receberá:</p>
      )}

      <div
        className={cn(
          'mt-3 grid gap-2',
          optionCount === 1 && 'grid-cols-1',
          optionCount === 2 && 'grid-cols-2',
          optionCount >= 3 && 'grid-cols-3',
        )}
      >
        {gift.species_options.map((option) => {
          const species = option.species;
          const selected = selectedSpeciesId === species.id;
          const image = resolvePokemonSpriteUrl(species);
          return (
            <button
              key={option.id}
              className={cn(
                'flex flex-col items-center gap-1 border-4 p-2 transition',
                selected
                  ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/15 shadow-[3px_3px_0_0_var(--color-game-border)]'
                  : 'border-[var(--color-game-border)] bg-[var(--color-game-panel)]',
                !isChoice && 'pointer-events-none',
              )}
              disabled={!isChoice}
              onClick={() => setSelectedSpeciesId(species.id)}
              type="button"
            >
              <PokemonSprite alt={species.name} pokedexId={species.pokedex_id} size="sm" src={image} />
              <span className="line-clamp-2 text-center text-[8px] font-bold uppercase leading-tight">
                {species.name}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-2 text-sm text-[var(--color-game-danger)]">{error}</p> : null}

      <PixelButton
        className="mt-3"
        disabled={claimMutation.isPending || (isChoice && selectedSpeciesId == null)}
        fullWidth
        onClick={() => {
          setError(null);
          claimMutation.mutate();
        }}
      >
        {claimMutation.isPending ? 'Resgatando...' : 'Resgatar presente'}
      </PixelButton>
    </PixelCard>
  );
};

const GiftsInboxPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ['gifts', 'inbox'],
    queryFn: fetchGiftInbox,
  });

  const pending = (inboxQuery.data ?? []).filter((g) => g.is_pending);
  const claimed = (inboxQuery.data ?? []).filter((g) => !g.is_pending);

  const handleClaimed = (pokemonId: number) => {
    queryClient.invalidateQueries({ queryKey: ['gifts'] });
    queryClient.invalidateQueries({ queryKey: ['my-pokemon'] });
    navigate(`/pokemon/${pokemonId}`);
  };

  return (
    <>
      <MobileHeader backTo="/more" subtitle="Presentes e mensagens" title="Caixa de entrada" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isQueryRefetching(inboxQuery)} />

        {inboxQuery.isPending ? (
          <PageLoading label="Carregando notificações..." />
        ) : (
          <>
            {pending.length === 0 ? (
              <PixelCard>
                <p className="text-sm text-[var(--color-game-muted)]">
                  Nenhum presente pendente no momento.
                </p>
              </PixelCard>
            ) : (
              <section className="space-y-3">
                <p className="text-game-label text-[var(--color-game-accent)]">
                  Pendentes ({pending.length})
                </p>
                {pending.map((gift) => (
                  <GiftClaimCard key={gift.id} gift={gift} onClaimed={handleClaimed} />
                ))}
              </section>
            )}

            {claimed.length > 0 ? (
              <section className="space-y-2">
                <p className="text-game-label text-[var(--color-game-muted)]">Resgatados</p>
                {claimed.slice(0, 10).map((gift) => (
                  <PixelCard key={gift.id} className="opacity-80">
                    <p className="text-xs text-[var(--color-game-muted)]">
                      {gift.sender_display.display_name} · resgatado
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm">{gift.message}</p>
                  </PixelCard>
                ))}
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
};

export default GiftsInboxPage;
