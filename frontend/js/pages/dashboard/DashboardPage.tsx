import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import NotificationBell from '@/js/components/layout/NotificationBell';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
import { LoadingCardSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import { useAuth } from '@/js/hooks/useAuth';
import { mergeQueryState } from '@/js/hooks/useQueryLoading';
import { myPokemonList, myPokemonTeamList, workoutsList } from '@/js/api';
import { fetchMyCalendar, localDateIso } from '@/js/lib/calendar';
import { fetchPendingEncounter } from '@/js/lib/encounter';
import { fetchActiveDraft } from '@/js/lib/workout';
import { fetchWeeklyGoal } from '@/js/lib/weekly-goal';
import WeeklyGoalCard from '@/js/components/weekly/WeeklyGoalCard';
import { workoutTypeLabel } from '@/js/lib/workout-labels';
import { useGameStore } from '@/js/stores/game-store';
import { cn } from '@/js/lib/utils';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const setEncounter = useGameStore((s) => s.setEncounter);

  const pendingEncounterQuery = useQuery({
    queryKey: ['workouts', 'pending-encounter'],
    queryFn: fetchPendingEncounter,
  });

  const workoutsQuery = useQuery({
    queryKey: ['workouts', 'recent'],
    queryFn: async () => (await workoutsList({ query: { limit: 5 } })).data,
  });

  const teamQuery = useQuery({
    queryKey: ['my-pokemon', 'team'],
    queryFn: async () => (await myPokemonTeamList()).data,
  });

  const collectionQuery = useQuery({
    queryKey: ['my-pokemon', 'count'],
    queryFn: async () => (await myPokemonList()).data,
  });

  const now = new Date();
  const calendarQuery = useQuery({
    queryKey: ['calendar', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => fetchMyCalendar(now.getFullYear(), now.getMonth() + 1),
  });

  const activeDraftQuery = useQuery({
    queryKey: ['workouts', 'active-draft'],
    queryFn: fetchActiveDraft,
  });

  const weeklyGoalQuery = useQuery({
    queryKey: ['weekly-goal'],
    queryFn: fetchWeeklyGoal,
  });

  const { isPending: statsPending, isRefetching } = mergeQueryState(
    calendarQuery,
    collectionQuery,
    teamQuery,
    workoutsQuery,
    activeDraftQuery,
  );

  const activeDraft = activeDraftQuery.data as { id?: number; workout_type?: string } | null;
  const pending = pendingEncounterQuery.isPending ? undefined : pendingEncounterQuery.data;
  const recentWorkouts = workoutsQuery.data?.results ?? [];
  const team = Array.isArray(teamQuery.data) ? teamQuery.data : [];
  const collectionCount = collectionQuery.data?.count ?? (collectionQuery.data?.results?.length ?? 0);

  const goToPendingEncounter = () => {
    if (!pending) return;
    setEncounter(pending.species, pending.workout_id);
    navigate('/capture', {
      state: { workoutId: pending.workout_id, species: pending.species },
    });
  };

  return (
    <>
      <MobileHeader
        action={
          user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link
                aria-label="Abrir perfil"
                className="block rounded-sm border-2 border-transparent transition hover:border-[var(--color-game-accent)]"
                to="/profile"
              >
                <TrainerAvatar
                  alt={user.display_name ?? user.email}
                  size="xs"
                  slug={user.trainer_sprite}
                  src={user.trainer_sprite_url}
                />
              </Link>
            </div>
          ) : null
        }
        subtitle={user?.nickname ? `@${user.nickname}` : user?.email}
        title="POKEFIT"
      />

      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isRefetching} />

        {pendingEncounterQuery.isPending ? (
          <LoadingCardSkeleton lines={2} />
        ) : pending ? (
          <PixelCard className="border-[var(--color-game-danger)]">
            <div className="flex items-start gap-3">
              <GameIcon className="shrink-0 text-[var(--color-game-danger)]" name="explore" size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-game-title text-[var(--color-game-danger)]">Captura pendente</p>
                <p className="mt-1 truncate text-sm font-semibold">{pending.species.name}</p>
                <p className="mt-1 text-xs text-[var(--color-game-muted)]">Finalize o encontro do último treino.</p>
              </div>
            </div>
            <PixelButton className="mt-3" fullWidth onClick={goToPendingEncounter}>
              Capturar agora
            </PixelButton>
          </PixelCard>
        ) : null}

        <WeeklyGoalCard data={weeklyGoalQuery.data} isLoading={weeklyGoalQuery.isPending} />

        <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 8 }}>
          {statsPending ? (
            <LoadingCardSkeleton lines={4} />
          ) : (
          <PixelCard className="bg-gradient-to-br from-[var(--color-game-panel)] to-[var(--color-game-bg-light)]">
            <p className="text-game-title text-[var(--color-game-accent)]">Treinador</p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2">
                <p className="text-xl font-bold leading-none">{collectionCount}</p>
                <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">Pokémon</p>
              </div>
              <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2 text-center">
                <p className="text-xl font-bold leading-none text-[var(--color-game-accent)]">
                  {calendarQuery.data?.streak_current ?? 0}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">Sequência</p>
              </div>
              <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2 text-right">
                <p className="text-xl font-bold leading-none">{team.length}/6</p>
                <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">Time</p>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-game-label text-[var(--color-game-muted)]">Esta semana</p>
                <Link className="text-[10px] font-bold uppercase text-[var(--color-game-info)] no-underline" to="/calendar">
                  Ver jornada
                </Link>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, index) => {
                  const day = new Date(now);
                  day.setDate(now.getDate() - (6 - index));
                  const iso = localDateIso(day);
                  const cell = calendarQuery.data?.days.find((d) => d.date === iso);
                  const conquered = (cell?.workout_count ?? 0) > 0;
                  const todayIso = localDateIso(now);
                  return (
                    <div
                      key={iso}
                      className={cn(
                        'flex min-h-9 flex-col items-center justify-center border-2 text-[10px] font-bold',
                        conquered
                          ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/20 text-[var(--color-game-accent)]'
                          : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)] text-[var(--color-game-muted)]',
                        iso === todayIso && 'ring-1 ring-[var(--color-game-info)]',
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {activeDraft?.id ? (
                <>
                  <PixelLink fullWidth to={`/workout/${activeDraft.id}`} variant="primary">
                    <GameIcon name="workout" size={18} />
                    <span>Continuar treino</span>
                  </PixelLink>
                  <p className="text-center text-[10px] text-[var(--color-game-muted)]">
                    {workoutTypeLabel(activeDraft.workout_type)} em andamento
                  </p>
                  <PixelLink fullWidth to="/workout/new" variant="secondary">
                    Trocar grupo (descarta o atual)
                  </PixelLink>
                </>
              ) : (
                <PixelLink fullWidth to="/workout/new" variant="primary">
                  <GameIcon name="workout" size={18} />
                  <span>Iniciar treino</span>
                </PixelLink>
              )}

              <div className="grid grid-cols-2 gap-2">
                <PixelLink fullWidth to="/collection" variant="secondary">
                  Coleção
                </PixelLink>
                <PixelLink fullWidth to="/team" variant="secondary">
                  Time
                </PixelLink>
              </div>

              {user?.is_staff ? (
                <PixelLink className="min-h-10 text-[11px]" fullWidth to="/exercises" variant="secondary">
                  <GameIcon name="admin" size={16} />
                  <span>Catálogo (admin)</span>
                </PixelLink>
              ) : null}
            </div>
          </PixelCard>
          )}
        </motion.div>

        <PixelCard>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-game-title text-[var(--color-game-info)]">Últimos treinos</h2>
            <Link className="text-xs font-bold uppercase text-[var(--color-game-info)] no-underline" to="/workouts">
              Ver todos
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {workoutsQuery.isPending ? (
              <>
                <LoadingCardSkeleton lines={2} />
                <LoadingCardSkeleton lines={2} />
              </>
            ) : recentWorkouts.length === 0 ? (
              <li className="text-sm text-[var(--color-game-muted)]">Nenhum treino ainda. Bora começar!</li>
            ) : (
              recentWorkouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    className="flex items-center justify-between rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 no-underline transition hover:border-[var(--color-game-accent)]"
                    to={`/workout/${workout.id}`}
                  >
                    <span className="text-sm capitalize text-[var(--color-game-text)]">
                      {workout.workout_type?.replaceAll('_', ' ')}
                    </span>
                    <span className="text-xs text-[var(--color-game-muted)]">{workout.status}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </PixelCard>

        <PixelCard>
          <div className="flex items-center justify-between">
            <h2 className="text-game-title">Time rápido</h2>
            <Link className="text-xs text-[var(--color-game-info)] no-underline" to="/team">
              Ver time
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {teamQuery.isPending ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-20 animate-pulse border-2 border-[var(--color-game-border)] bg-[var(--color-game-panel)]"
                />
              ))
            ) : (
            Array.from({ length: 6 }).map((_, index) => {
              const slot = index + 1;
              const member = team.find((p) => p.active_team_slot === slot);
              return (
                <div
                  key={slot}
                  className="flex min-h-20 flex-col items-center justify-center border-2 border-dashed border-[var(--color-game-border)] bg-[var(--color-game-bg)] p-2 text-center"
                >
                  <span className="text-[10px] text-[var(--color-game-muted)]">#{slot}</span>
                  <span className="mt-1 text-[10px] font-semibold">
                    {member?.display_name?.slice(0, 10) ?? '—'}
                  </span>
                </div>
              );
            })
            )}
          </div>
        </PixelCard>
      </main>
    </>
  );
};

export default DashboardPage;
