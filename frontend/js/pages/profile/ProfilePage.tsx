import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { LoadingGridSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { authQueryKey, useAuth } from '@/js/hooks/useAuth';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { getApiErrorMessage } from '@/js/lib/api-errors';
import { updateMyProfile } from '@/js/lib/profile';
import { fetchTrainerSprites, updateMyTrainerSprite } from '@/js/lib/trainer-sprites';
import { cn } from '@/js/lib/utils';

const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(user?.trainer_sprite ?? 'red');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [error, setError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameSuccess, setNicknameSuccess] = useState(false);

  useEffect(() => {
    if (user?.trainer_sprite) {
      setSelected(user.trainer_sprite);
    }
  }, [user?.trainer_sprite]);

  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user?.nickname]);

  const featuredQuery = useQuery({
    queryKey: ['trainer-sprites', 'featured'],
    queryFn: () => fetchTrainerSprites({ featured: true }),
  });

  const searchTerm = search.trim();
  const isSearching = searchTerm.length > 0;

  const searchQuery = useQuery({
    queryKey: ['trainer-sprites', 'search', searchTerm],
    queryFn: () => fetchTrainerSprites({ q: searchTerm }),
    enabled: isSearching,
  });

  const saveNicknameMutation = useMutation({
    mutationFn: () => updateMyProfile({ nickname: nickname.trim() }),
    onMutate: () => {
      setNicknameError(null);
      setNicknameSuccess(false);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authQueryKey, updatedUser);
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setNicknameSuccess(true);
    },
    onError: (err) =>
      setNicknameError(getApiErrorMessage(err, 'Não foi possível salvar o nickname.')),
  });

  const saveMutation = useMutation({
    mutationFn: () => updateMyTrainerSprite(selected),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authQueryKey, updatedUser);
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setError(null);
    },
    onError: () => setError('Não foi possível salvar o ícone.'),
  });

  const gridItems = useMemo(() => {
    if (isSearching) {
      return searchQuery.data?.results ?? [];
    }
    return featuredQuery.data?.results ?? [];
  }, [featuredQuery.data?.results, isSearching, searchQuery.data?.results]);

  const isLoadingList = isSearching ? searchQuery.isPending : featuredQuery.isPending;
  const isRefetchingList = isQueryRefetching(isSearching ? searchQuery : featuredQuery);

  return (
    <>
      <MobileHeader backTo="/more" subtitle="Nickname e ícone" title="Perfil" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <PixelCard className="border-[var(--color-game-accent)]">
          <p className="text-game-title text-[var(--color-game-accent)]">Seu treinador</p>
          <div className="mt-3 flex items-center gap-3">
            <TrainerAvatar alt={user?.display_name ?? 'Treinador'} size="md" slug={selected} />
            <div className="min-w-0">
              <p className="font-semibold">{user?.display_name ?? user?.nickname ?? user?.email}</p>
              <p className="text-xs text-[var(--color-game-muted)]">
                {user?.nickname ? `@${user.nickname}` : null}
                {user?.nickname ? ' · ' : null}
                {selected}
              </p>
            </div>
          </div>
        </PixelCard>

        <PixelCard className="space-y-2 border-[var(--color-game-info)]">
          <p className="text-game-title text-[var(--color-game-info)]">Nickname</p>
          <p className="text-xs text-[var(--color-game-muted)]">
            Nome público único. Amigos podem te achar por ele ou pelo e-mail.
          </p>
          <input
            autoComplete="off"
            className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
            maxLength={24}
            onChange={(e) => {
              setNickname(e.target.value.toLowerCase());
              setNicknameSuccess(false);
            }}
            placeholder="ex: kizz_cross"
            value={nickname}
          />
          {nicknameSuccess ? (
            <p className="text-sm text-[var(--color-game-success)]">Nickname salvo com sucesso!</p>
          ) : null}
          {nicknameError ? (
            <p className="text-sm text-[var(--color-game-danger)]">{nicknameError}</p>
          ) : null}
          <PixelButton
            disabled={saveNicknameMutation.isPending || nickname.trim() === (user?.nickname ?? '')}
            fullWidth
            onClick={() => saveNicknameMutation.mutate()}
          >
            {saveNicknameMutation.isPending ? 'Salvando...' : 'Salvar nickname'}
          </PixelButton>
        </PixelCard>

        <PixelCard className="space-y-2">
          <label className="text-game-label" htmlFor="trainer-search">
            Buscar sprite
          </label>
          <input
            className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
            id="trainer-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex: n, cynthia, red..."
            value={search}
          />
          <p className="text-[10px] text-[var(--color-game-muted)]">
            {!isSearching
              ? 'Destaques abaixo. Digite para buscar no catálogo completo.'
              : `${gridItems.length} resultado(s)`}
          </p>
        </PixelCard>

        <QueryRefetchBar visible={isRefetchingList} />

        {isLoadingList ? (
          <LoadingGridSkeleton cols={3} count={9} />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {gridItems.map((sprite) => {
              const isSelected = selected === sprite.slug;
              return (
                <button
                  key={sprite.slug}
                  className={cn(
                    'flex flex-col items-center gap-1 border-4 p-2 transition',
                    isSelected
                      ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/15 shadow-[3px_3px_0_0_var(--color-game-border)]'
                      : 'border-[var(--color-game-border)] bg-[var(--color-game-panel)] hover:border-[var(--color-game-info)]',
                  )}
                  onClick={() => setSelected(sprite.slug)}
                  type="button"
                >
                  <TrainerAvatar alt={sprite.label} size="sm" slug={sprite.slug} src={sprite.url} />
                  <span className="line-clamp-2 text-center text-[8px] font-bold uppercase leading-tight text-[var(--color-game-muted)]">
                    {sprite.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isSearching && !isLoadingList && gridItems.length === 0 ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-muted)]">Nenhum sprite encontrado.</p>
          </PixelCard>
        ) : null}

        {error ? <p className="text-sm text-[var(--color-game-danger)]">{error}</p> : null}

        <PixelButton
          disabled={saveMutation.isPending || selected === user?.trainer_sprite}
          fullWidth
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar ícone'}
        </PixelButton>
      </main>
    </>
  );
};

export default ProfilePage;
