import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { exercisesList } from '@/js/api';
import StaffGuard from '@/js/app/StaffGuard';
import GameIcon from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import { LoadingCardSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import PixelLink from '@/js/components/ui/PixelLink';
import { deleteExercise } from '@/js/lib/exercises';
import { MUSCLE_GROUP_LABELS } from '@/js/lib/workout-labels';
import { cn } from '@/js/lib/utils';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const ExerciseListPage = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const locationState = location.state as { exerciseCreated?: boolean; exerciseUpdated?: boolean } | null;
  const [search, setSearch] = useState('');

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['exercises', 'admin-list'],
    queryFn: async () => (await exercisesList({ query: { limit: 500 } })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const items = data?.results ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.name?.toLowerCase().includes(term));
  }, [items, search]);

  const handleDelete = (id: number, name: string) => {
    const ok = window.confirm(
      `Remover "${name}"?\n\nSe já foi usado em treinos, o exercício só será desativado (não some do histórico).`,
    );
    if (!ok) return;
    deleteMutation.mutate(id);
  };

  return (
    <StaffGuard>
      <MobileHeader backTo="/more" subtitle="Staff" title="Catálogo de exercícios" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        {locationState?.exerciseCreated || locationState?.exerciseUpdated ? (
          <PixelCard className="border-[var(--color-game-success)]">
            <p className="text-sm text-[var(--color-game-success)]">
              {locationState.exerciseUpdated ? 'Exercício atualizado!' : 'Exercício publicado!'}
            </p>
          </PixelCard>
        ) : null}

        <PixelLink fullWidth to="/exercises/new" variant="secondary">
          <GameIcon name="admin" size={18} />
          <span>Novo exercício</span>
        </PixelLink>

        <PixelCard className="space-y-2">
          <label className="text-game-label block" htmlFor="exercise-search">
            Buscar
          </label>
          <input
            className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
            id="exercise-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome do exercício..."
            value={search}
          />
          <p className="text-xs text-[var(--color-game-muted)]">
            {filtered.length} de {items.length} exercícios
          </p>
        </PixelCard>

        <QueryRefetchBar visible={isQueryRefetching({ isPending, isFetching, data })} />

        {isPending ? (
          <div className="space-y-3">
            <LoadingCardSkeleton lines={3} />
            <LoadingCardSkeleton lines={3} />
            <LoadingCardSkeleton lines={2} />
          </div>
        ) : filtered.length === 0 ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-muted)]">Nenhum exercício encontrado.</p>
          </PixelCard>
        ) : (
          <ul className="space-y-3">
            {filtered.map((exercise) => (
              <li key={exercise.id}>
                <PixelCard
                  className={cn(
                    'space-y-3',
                    exercise.is_active === false && 'opacity-75 border-[var(--color-game-muted)]',
                  )}
                >
                  <div className="flex gap-3">
                    {exercise.image_url ? (
                      <img
                        alt=""
                        className="h-14 w-14 shrink-0 border-4 border-[var(--color-game-border)] object-cover"
                        src={exercise.image_url}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
                        <GameIcon name="workout" size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{exercise.name}</p>
                      <p className="text-xs text-[var(--color-game-muted)]">
                        {MUSCLE_GROUP_LABELS[exercise.muscle_group ?? ''] ?? exercise.muscle_group}
                        {' · '}
                        {DIFFICULTY_LABELS[exercise.difficulty ?? ''] ?? exercise.difficulty}
                      </p>
                      {exercise.is_active === false ? (
                        <span className="mt-1 inline-block text-[10px] font-bold uppercase text-[var(--color-game-danger)]">
                          Inativo
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      className="pixel-btn pixel-btn-secondary min-h-10 flex items-center justify-center no-underline text-sm"
                      to={`/exercises/${exercise.id}/edit`}
                    >
                      Editar
                    </Link>
                    <PixelButton
                      disabled={deleteMutation.isPending}
                      variant="danger"
                      onClick={() => exercise.id && handleDelete(exercise.id, exercise.name ?? '')}
                    >
                      Excluir
                    </PixelButton>
                  </div>
                </PixelCard>
              </li>
            ))}
          </ul>
        )}
      </main>
    </StaffGuard>
  );
};

export default ExerciseListPage;
