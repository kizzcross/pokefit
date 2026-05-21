import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { workoutsList } from '@/js/api';
import GameIcon from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { LoadingCardSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import PixelLink from '@/js/components/ui/PixelLink';
import { formatDate } from '@/js/lib/utils';
import { workoutTypeLabel } from '@/js/lib/workout-labels';
import { cn } from '@/js/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const WorkoutsListPage = () => {
  const { data, isPending, isFetching } = useQuery({
    queryKey: ['workouts', 'all'],
    queryFn: async () => (await workoutsList({ query: { limit: 100 } })).data,
  });

  const items = data?.results ?? [];
  const drafts = items.filter((w) => w.status === 'draft');
  const finished = items.filter((w) => w.status !== 'draft');

  return (
    <>
      <MobileHeader backTo="/" title="Meus treinos" subtitle="Histórico completo" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <PixelLink fullWidth to={drafts[0]?.id ? `/workout/${drafts[0].id}` : '/workout/new'}>
          <GameIcon name="workout" size={18} />
          <span>{drafts[0]?.id ? 'Continuar treino ativo' : 'Novo treino'}</span>
        </PixelLink>
        {drafts[0]?.id ? (
          <PixelLink fullWidth to="/workout/new" variant="secondary">
            Trocar grupo (descarta o atual)
          </PixelLink>
        ) : null}

        <QueryRefetchBar visible={isQueryRefetching({ isPending, isFetching, data })} />

        {isPending ? (
          <div className="space-y-3">
            <LoadingCardSkeleton lines={2} />
            <LoadingCardSkeleton lines={3} />
            <LoadingCardSkeleton lines={3} />
          </div>
        ) : items.length === 0 ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-muted)]">Nenhum treino registrado ainda.</p>
          </PixelCard>
        ) : (
          <ul className="space-y-3">
            {drafts.length > 0 ? (
              <li>
                <p className="mb-2 text-game-label text-[var(--color-game-info)]">Treino ativo</p>
                {drafts.map((workout) => (
                  <WorkoutListItem key={workout.id} workout={workout} />
                ))}
              </li>
            ) : null}
            {finished.length > 0 ? (
              <li>
                <p className="mb-2 text-game-label text-[var(--color-game-muted)]">Histórico</p>
                {finished.map((workout) => (
                  <WorkoutListItem key={workout.id} workout={workout} />
                ))}
              </li>
            ) : null}
          </ul>
        )}
      </main>
    </>
  );
};

function WorkoutListItem({
  workout,
}: {
  workout: {
    id?: number;
    status?: string;
    workout_type?: string;
    started_at?: string;
    exercise_count?: number;
    total_volume?: string | number;
    duration_minutes?: number | null;
  };
}) {
  const status = workout.status ?? 'draft';
  const isDraft = status === 'draft';
  return (
    <Link
      className={cn(
        'pixel-panel mb-3 block rounded-sm p-4 no-underline transition hover:border-[var(--color-game-accent)]',
        isDraft && 'border-[var(--color-game-info)]',
        status === 'finished' && 'border-[var(--color-game-success)]/50',
      )}
      to={`/workout/${workout.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-game-title text-[var(--color-game-accent)]">
            {workoutTypeLabel(workout.workout_type)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-game-muted)]">
            {workout.started_at ? formatDate(workout.started_at) : '—'}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 border-2 px-2 py-1 text-[10px] font-bold uppercase',
            isDraft
              ? 'border-[var(--color-game-info)] text-[var(--color-game-info)]'
              : 'border-[var(--color-game-success)] text-[var(--color-game-success)]',
          )}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-[var(--color-game-muted)]">
        <span>{workout.exercise_count ?? 0} exercícios</span>
        {workout.total_volume != null ? <span>Vol. {workout.total_volume}</span> : null}
        {workout.duration_minutes ? <span>{workout.duration_minutes} min</span> : null}
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase text-[var(--color-game-info)]">
        Ver exercícios →
      </p>
    </Link>
  );
}

export default WorkoutsListPage;
