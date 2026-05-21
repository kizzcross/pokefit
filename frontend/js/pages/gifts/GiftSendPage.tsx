import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import SuperuserGuard from '@/js/app/SuperuserGuard';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { pokemonSpeciesList } from '@/js/api';
import type { PokemonSpecies } from '@/js/api/types.gen';
import { getApiErrorMessage } from '@/js/lib/api-errors';
import {
  searchGiftRecipients,
  sendGifts,
  type GiftRecipientSearch,
} from '@/js/lib/gifts';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import { cn } from '@/js/lib/utils';

type GiftMode = 'direct' | 'choice';

const MAX_CHOICE = 3;

const GiftSendPageContent = () => {
  const navigate = useNavigate();
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<GiftRecipientSearch[]>([]);
  const [message, setMessage] = useState('');
  const [giftMode, setGiftMode] = useState<GiftMode>('direct');
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<PokemonSpecies[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const recipientSearchTerm = recipientSearch.trim();
  const recipientsQuery = useQuery({
    queryKey: ['gifts', 'recipient-search', recipientSearchTerm],
    queryFn: () => searchGiftRecipients(recipientSearchTerm),
    enabled: recipientSearchTerm.length >= 1,
    retry: false,
  });
  const recipientSearchError = recipientsQuery.isError
    ? recipientsQuery.error instanceof Error && recipientsQuery.error.message
      ? recipientsQuery.error.message
      : getApiErrorMessage(
          recipientsQuery.error,
          'Não foi possível buscar usuários. Confirme que sua conta é staff/superuser.',
        )
    : null;

  const speciesSearchTerm = speciesSearch.trim();
  const speciesQuery = useQuery({
    queryKey: ['pokemon-species', 'gift-search', speciesSearchTerm],
    queryFn: async () => {
      const response = await pokemonSpeciesList({
        query: {
          limit: 200,
          ...(speciesSearchTerm ? { search: speciesSearchTerm } : {}),
        } as { limit?: number; search?: string },
      });
      return response.data?.results ?? [];
    },
  });

  const speciesLimit = giftMode === 'direct' ? 1 : MAX_CHOICE;
  const speciesMin = giftMode === 'direct' ? 1 : 2;

  const sendMutation = useMutation({
    mutationFn: () =>
      sendGifts({
        recipient_ids: selectedRecipients.map((r) => r.id),
        message: message.trim(),
        gift_kind: giftMode,
        species_ids: selectedSpecies.map((s) => s.id),
      }),
    onSuccess: (data) => {
      setFormError(null);
      setSuccess(`Presente enviado para ${data.sent_count} jogador(es)!`);
      setSelectedRecipients([]);
      setSelectedSpecies([]);
      setMessage('');
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Não foi possível enviar o presente.';
      setFormError(typeof detail === 'string' ? detail : 'Erro ao enviar.');
      setSuccess(null);
    },
  });

  const addRecipient = (user: GiftRecipientSearch) => {
    if (selectedRecipients.some((r) => r.id === user.id)) return;
    setSelectedRecipients((prev) => [...prev, user]);
    setRecipientSearch('');
  };

  const toggleSpecies = (species: PokemonSpecies) => {
    setSelectedSpecies((prev) => {
      const exists = prev.some((s) => s.id === species.id);
      if (exists) return prev.filter((s) => s.id !== species.id);
      if (prev.length >= speciesLimit) return prev;
      return [...prev, species];
    });
  };

  const recipientResults = useMemo(() => {
    const results = recipientsQuery.data ?? [];
    return results.filter((r) => !selectedRecipients.some((s) => s.id === r.id));
  }, [recipientsQuery.data, selectedRecipients]);

  const canSubmit =
    selectedRecipients.length > 0 &&
    message.trim().length > 0 &&
    selectedSpecies.length >= speciesMin &&
    selectedSpecies.length <= speciesLimit;

  return (
    <>
      <MobileHeader backTo="/more" subtitle="Superuser" title="Enviar presentes" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        {success ? (
          <PixelCard className="border-[var(--color-game-success)]">
            <p className="text-sm text-[var(--color-game-success)]">{success}</p>
          </PixelCard>
        ) : null}

        <PixelCard className="space-y-3">
          <p className="text-game-title text-[var(--color-game-accent)]">Destinatários</p>
          <input
            className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder="Buscar por nickname ou e-mail..."
            value={recipientSearch}
          />
          {recipientSearchTerm.length >= 1 && recipientsQuery.isFetching ? (
            <p className="text-xs text-[var(--color-game-muted)]">Buscando...</p>
          ) : null}
          {recipientSearchTerm.length >= 1 && recipientSearchError ? (
            <p className="text-sm text-[var(--color-game-danger)]">{recipientSearchError}</p>
          ) : null}
          {recipientSearchTerm.length >= 1 &&
          !recipientsQuery.isPending &&
          !recipientsQuery.isError &&
          recipientResults.length > 0 ? (
            <ul className="max-h-36 space-y-1 overflow-y-auto border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] p-1">
              {recipientResults.map((user) => (
                <li key={user.id}>
                  <button
                    className="w-full px-2 py-2 text-left text-sm hover:bg-[var(--color-game-panel)]"
                    onClick={() => addRecipient(user)}
                    type="button"
                  >
                    {user.display_name}{' '}
                    <span className="text-[var(--color-game-muted)]">@{user.nickname}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {recipientSearchTerm.length >= 1 &&
          !recipientsQuery.isPending &&
          !recipientsQuery.isError &&
          recipientResults.length === 0 ? (
            <p className="text-xs text-[var(--color-game-muted)]">Nenhum jogador encontrado.</p>
          ) : null}
          {selectedRecipients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedRecipients.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 border-2 border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/10 px-2 py-1 text-xs"
                >
                  {user.display_name}
                  <button
                    aria-label={`Remover ${user.display_name}`}
                    className="font-bold text-[var(--color-game-danger)]"
                    onClick={() =>
                      setSelectedRecipients((prev) => prev.filter((r) => r.id !== user.id))
                    }
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-game-muted)]">Nenhum destinatário selecionado.</p>
          )}
        </PixelCard>

        <PixelCard className="space-y-2">
          <p className="text-game-title">Mensagem</p>
          <textarea
            className="min-h-[5rem] w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
            maxLength={500}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva a mensagem do presente..."
            value={message}
          />
          <p className="text-right text-[10px] text-[var(--color-game-muted)]">{message.length}/500</p>
        </PixelCard>

        <PixelCard className="space-y-3">
          <p className="text-game-title">Tipo de presente</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={cn(
                'border-4 px-2 py-2 text-xs font-bold uppercase',
                giftMode === 'direct'
                  ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/15'
                  : 'border-[var(--color-game-border)]',
              )}
              onClick={() => {
                setGiftMode('direct');
                setSelectedSpecies((prev) => prev.slice(0, 1));
              }}
              type="button"
            >
              1 Pokémon
            </button>
            <button
              className={cn(
                'border-4 px-2 py-2 text-xs font-bold uppercase',
                giftMode === 'choice'
                  ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/15'
                  : 'border-[var(--color-game-border)]',
              )}
              onClick={() => setGiftMode('choice')}
              type="button"
            >
              Escolha (2–3)
            </button>
          </div>
          <p className="text-xs text-[var(--color-game-muted)]">
            {giftMode === 'direct'
              ? 'O jogador recebe o Pokémon automaticamente ao resgatar.'
              : 'O jogador escolhe 1 entre os Pokémon selecionados (máx. 3).'}
          </p>
        </PixelCard>

        <PixelCard className="space-y-3">
          <p className="text-game-title">
            Pokémon ({selectedSpecies.length}/{speciesLimit})
          </p>
          <input
            className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
            onChange={(e) => setSpeciesSearch(e.target.value)}
            placeholder="Buscar no catálogo..."
            value={speciesSearch}
          />
          <div
            className={cn(
              'grid gap-2',
              giftMode === 'choice' && 'grid-cols-3',
              giftMode === 'direct' && 'grid-cols-2 sm:grid-cols-3',
            )}
          >
            {speciesQuery.isPending && (speciesQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-[var(--color-game-muted)]">Carregando catálogo...</p>
        ) : null}
        {(speciesQuery.data ?? []).length === 0 && speciesSearchTerm ? (
          <p className="text-xs text-[var(--color-game-muted)]">
            Nenhum Pokémon encontrado. Importe o catálogo (import_pokemon).
          </p>
        ) : null}
        {(speciesQuery.data ?? []).map((species) => {
              const selected = selectedSpecies.some((s) => s.id === species.id);
              const image = resolvePokemonSpriteUrl(species);
              return (
                <button
                  key={species.id}
                  className={cn(
                    'flex flex-col items-center gap-1 border-4 p-2',
                    selected
                      ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/15'
                      : 'border-[var(--color-game-border)] bg-[var(--color-game-panel)]',
                  )}
                  onClick={() => toggleSpecies(species)}
                  type="button"
                >
                  <PokemonSprite
                    alt={species.name}
                    pokedexId={species.pokedex_id}
                    size="sm"
                    src={image}
                  />
                  <span className="text-[8px] font-bold uppercase">{species.name}</span>
                </button>
              );
            })}
          </div>
        </PixelCard>

        {formError ? <p className="text-sm text-[var(--color-game-danger)]">{formError}</p> : null}

        <PixelButton
          disabled={!canSubmit || sendMutation.isPending}
          fullWidth
          onClick={() => {
            setFormError(null);
            setSuccess(null);
            sendMutation.mutate();
          }}
        >
          {sendMutation.isPending ? 'Enviando...' : 'Enviar presente(s)'}
        </PixelButton>

        <PixelButton fullWidth onClick={() => navigate('/gifts')} variant="secondary">
          Ver caixa de notificações
        </PixelButton>
      </main>
    </>
  );
};

const GiftSendPage = () => (
  <SuperuserGuard>
    <GiftSendPageContent />
  </SuperuserGuard>
);

export default GiftSendPage;
