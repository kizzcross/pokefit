import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { exercisesList, workoutsFinishCreate, workoutsRetrieve } from '@/js/api';
import type { WorkoutFinishResult } from '@/js/api/types.gen';
import type { WorkoutDetailWithEncounter } from '@/js/lib/encounter';
import GameIcon from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import { LoadingCardSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import WorkoutExerciseRow from '@/js/components/workout/WorkoutExerciseRow';
import WorkoutProofCard from '@/js/components/workout/WorkoutProofCard';
import {
  addWorkoutExercise,
  addWorkoutExercisesBulk,
  deleteWorkout,
  deleteWorkoutExercise,
  fetchLastWorkoutByType,
  updateWorkoutExercise,
  uploadWorkoutProof,
  type BulkExerciseInput,
  type LastWorkoutExercise,
  type WorkoutExerciseEntry,
} from '@/js/lib/workout';
import {
  MUSCLE_GROUP_LABELS,
  WORKOUT_TYPE_MUSCLE_GROUPS,
  workoutTypeLabel,
} from '@/js/lib/workout-labels';
import { formatDate } from '@/js/lib/utils';
import { useGameStore } from '@/js/stores/game-store';
import { cn } from '@/js/lib/utils';

const fieldClass =
  'w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--color-game-accent)]';

const WorkoutDetailPage = () => {
  const { id } = useParams();
  const workoutId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setEncounter = useGameStore((s) => s.setEncounter);

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('20');
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null);
  const [effort, setEffort] = useState(8);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const workoutQuery = useQuery({
    queryKey: ['workouts', workoutId],
    queryFn: async () => (await workoutsRetrieve({ path: { id: String(workoutId) } })).data,
    enabled: Number.isFinite(workoutId),
  });

  const workout = workoutQuery.data;
  const workoutType = workout?.workout_type ?? '';
  const isDraft = workout?.status === 'draft';

  useEffect(() => {
    if (workout?.workout_type === 'cardio' && Number.isFinite(workoutId)) {
      navigate(`/workout/cardio/${workoutId}`, { replace: true });
    }
  }, [workout?.workout_type, workoutId, navigate]);

  const sessionExercises = workout?.exercises ?? [];
  const exerciseCount = sessionExercises.length;
  const sessionExerciseIds = new Set(
    sessionExercises.map((e) => e.exercise?.id).filter((id): id is number => Boolean(id)),
  );

  const lastWorkoutQuery = useQuery({
    queryKey: ['workouts', 'last-by-type', workoutType, workoutId],
    queryFn: () => fetchLastWorkoutByType(workoutType, workoutId),
    enabled: Boolean(workoutType) && isDraft,
  });

  const catalogQuery = useQuery({
    queryKey: ['exercises', 'catalog', workoutType],
    queryFn: async () => (await exercisesList({ query: { limit: 200 } })).data,
    enabled: isDraft,
  });

  const suggestedMuscleGroups = WORKOUT_TYPE_MUSCLE_GROUPS[workoutType] ?? [];

  const catalog = useMemo(() => {
    const items = catalogQuery.data?.results ?? [];
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (muscleFilter !== 'all' && item.muscle_group !== muscleFilter) return false;
      if (term && !item.name?.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [catalogQuery.data?.results, muscleFilter, search]);

  const invalidateWorkout = () => {
    queryClient.invalidateQueries({ queryKey: ['workouts', workoutId] });
  };

  const addOneMutation = useMutation({
    mutationFn: (payload: BulkExerciseInput) => addWorkoutExercise(workoutId, payload),
    onSuccess: () => {
      invalidateWorkout();
      setActionError(null);
      setSelectedCatalogId(null);
    },
    onError: () => setActionError('Não foi possível adicionar o exercício.'),
  });

  const addBulkMutation = useMutation({
    mutationFn: (items: BulkExerciseInput[]) => addWorkoutExercisesBulk(workoutId, items),
    onSuccess: () => {
      invalidateWorkout();
      setActionError(null);
    },
    onError: () => setActionError('Não foi possível repetir o treino.'),
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({
      entryId,
      payload,
    }: {
      entryId: number;
      payload: Parameters<typeof updateWorkoutExercise>[2];
    }) => updateWorkoutExercise(workoutId, entryId, payload),
    onSuccess: () => {
      invalidateWorkout();
      setActionError(null);
    },
    onError: () => setActionError('Não foi possível salvar o exercício.'),
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (entryId: number) => deleteWorkoutExercise(workoutId, entryId),
    onSuccess: () => {
      invalidateWorkout();
      setActionError(null);
    },
    onError: () => setActionError('Não foi possível remover o exercício.'),
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: () => deleteWorkout(workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'active-draft'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'pending-encounter'] });
      navigate('/workouts');
    },
    onError: () => setActionError('Não foi possível excluir o treino.'),
  });

  const proofMutation = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) =>
      uploadWorkoutProof(workoutId, file, caption),
    onSuccess: () => {
      invalidateWorkout();
      setProofError(null);
    },
    onError: () => setProofError('Não foi possível enviar a foto.'),
  });

  const hasProof = Boolean(workout?.proof_photo_url);

  const finishMutation = useMutation({
    mutationFn: async () =>
      (
        await workoutsFinishCreate({
          path: { id: String(workoutId) },
          body: { perceived_effort: effort },
          throwOnError: true,
        })
      ).data as WorkoutFinishResult,
    onSuccess: (finished) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'pending-encounter'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-goal'] });
      queryClient.invalidateQueries({ queryKey: ['my-pokemon'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'last-by-type', workoutType] });
      const workoutData = finished?.workout as WorkoutDetailWithEncounter | undefined;
      const species = workoutData?.encounter_species;
      if (species && workoutData?.id) {
        setEncounter(species, workoutData.id, workoutData.encounter_level ?? null);
        navigate('/encounter', {
          state: {
            workoutId: workoutData.id,
            species,
            encounterLevel: workoutData.encounter_level ?? null,
            dayConquered: true,
            weeklyGoalReward: Boolean(workoutData.weekly_goal_reward),
            teamRewards: finished.team_rewards,
          },
        });
      } else {
        setFinishError('Treino finalizado, mas não há Pokémon no catálogo.');
      }
    },
    onError: () =>
      setFinishError('Envie a foto de prova e adicione pelo menos 1 exercício antes de finalizar.'),
  });

  const addFromLast = (entry: LastWorkoutExercise) => {
    const exerciseId = entry.exercise?.id;
    if (!exerciseId) return;
    if (sessionExerciseIds.has(exerciseId)) return;
    addOneMutation.mutate({
      exercise: exerciseId,
      sets: entry.sets,
      reps: entry.reps,
      weight: entry.weight,
    });
  };

  const repeatLastWorkout = () => {
    const last = lastWorkoutQuery.data;
    if (!last?.exercises?.length) return;

    const payload: BulkExerciseInput[] = last.exercises
      .filter((e) => e.exercise?.id && !sessionExerciseIds.has(e.exercise.id))
      .map((e) => ({
        exercise: e.exercise!.id,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
      }));

    if (!payload.length) {
      setActionError('Todos os exercícios do último treino já estão na sessão.');
      return;
    }
    addBulkMutation.mutate(payload);
  };

  const addFromCatalog = () => {
    if (!selectedCatalogId) return;
    addOneMutation.mutate({
      exercise: selectedCatalogId,
      sets: Number(sets) || 3,
      reps: Number(reps) || 10,
      weight: weight || '0',
    });
  };

  const lastWorkout = lastWorkoutQuery.data;
  const isRefetchingWorkout = isQueryRefetching(workoutQuery);

  const isBusy =
    addOneMutation.isPending ||
    addBulkMutation.isPending ||
    finishMutation.isPending ||
    updateExerciseMutation.isPending ||
    deleteExerciseMutation.isPending ||
    deleteWorkoutMutation.isPending;

  if (workout?.workout_type === 'cardio') {
    return null;
  }

  return (
    <>
      <MobileHeader
        backTo="/workouts"
        subtitle={
          isDraft
            ? 'Rascunho — edite os exercícios'
            : workout?.ended_at
              ? formatDate(workout.ended_at)
              : 'Finalizado'
        }
        title={isDraft ? 'Registrar treino' : workoutTypeLabel(workoutType)}
      />
      <main className="space-y-4 px-4 pb-32 pt-4">
        <QueryRefetchBar visible={isRefetchingWorkout} />

        {workoutQuery.isPending ? (
          <div className="space-y-3">
            <LoadingCardSkeleton lines={4} />
            <LoadingCardSkeleton lines={3} />
            <LoadingCardSkeleton lines={2} />
          </div>
        ) : workoutQuery.isError ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-danger)]">Treino não encontrado.</p>
          </PixelCard>
        ) : (
        <>
        <PixelCard className="border-[var(--color-game-accent)] bg-gradient-to-br from-[var(--color-game-panel)] to-[var(--color-game-bg-light)]">
          <p className="text-game-title text-[var(--color-game-accent)]">
            {workoutTypeLabel(workoutType)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2">
              <p className="text-xl font-bold">{exerciseCount}</p>
              <p className="text-xs text-[var(--color-game-muted)]">exercícios</p>
            </div>
            <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-right">
              <p className="text-xl font-bold">{workout?.total_volume ?? 0}</p>
              <p className="text-xs text-[var(--color-game-muted)]">volume (kg)</p>
            </div>
          </div>
        </PixelCard>

        {isDraft && lastWorkout ? (
          <PixelCard className="border-[var(--color-game-info)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-game-title text-[var(--color-game-info)]">Último treino deste grupo</p>
                <p className="mt-1 text-xs text-[var(--color-game-muted)]">
                  {lastWorkout.ended_at ? formatDate(lastWorkout.ended_at) : '—'} · vol.{' '}
                  {lastWorkout.total_volume}
                </p>
              </div>
              <GameIcon className="shrink-0 text-[var(--color-game-info)]" name="workout" size={24} />
            </div>

            <PixelButton
              className="mt-3"
              disabled={isBusy}
              fullWidth
              onClick={repeatLastWorkout}
              variant="primary"
            >
              {addBulkMutation.isPending ? 'Carregando...' : 'Repetir treino inteiro'}
            </PixelButton>

            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {lastWorkout.exercises.map((entry) => {
                const exId = entry.exercise?.id;
                const alreadyAdded = exId ? sessionExerciseIds.has(exId) : false;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-2 border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] p-2',
                      alreadyAdded && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {entry.exercise?.name ?? entry.name}
                      </p>
                      <p className="text-xs text-[var(--color-game-muted)]">
                        {entry.sets}×{entry.reps} @ {entry.weight}kg
                      </p>
                    </div>
                    <button
                      className="min-h-10 min-w-10 border-2 border-[var(--color-game-border)] bg-[var(--color-game-accent)] px-2 text-sm font-bold text-[var(--color-game-border)] disabled:opacity-40"
                      disabled={alreadyAdded || isBusy || !exId}
                      onClick={() => addFromLast(entry)}
                      type="button"
                    >
                      +
                    </button>
                  </li>
                );
              })}
            </ul>
          </PixelCard>
        ) : null}

        {isDraft && lastWorkoutQuery.isSuccess && !lastWorkout ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-muted)]">
              Primeiro treino de {workoutTypeLabel(workoutType)}. Monta a sessão abaixo — na próxima vez
              você repete com 1 toque.
            </p>
          </PixelCard>
        ) : null}

        <PixelCard className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-game-title">
              {isDraft ? 'Exercícios do treino' : 'Exercícios'}
            </h2>
            <span className="text-xs text-[var(--color-game-muted)]">{sessionExercises.length} itens</span>
          </div>
          {!isDraft ? (
            <p className="text-xs text-[var(--color-game-muted)]">
              Toque em cada exercício para ver séries, reps e carga. Treinos finalizados não podem ser editados.
            </p>
          ) : (
            <p className="text-xs text-[var(--color-game-muted)]">
              Expanda para ver detalhes. Em rascunho você pode alterar ou excluir cada exercício.
            </p>
          )}
          {sessionExercises.length === 0 ? (
            <p className="text-sm text-[var(--color-game-muted)]">Nenhum exercício ainda.</p>
          ) : (
            <ul className="space-y-2">
              {sessionExercises.map((entry, index) => (
                <WorkoutExerciseRow
                  key={entry.id}
                  editable={isDraft}
                  entry={entry}
                  index={index}
                  isBusy={isBusy}
                  onDelete={(entryId) => deleteExerciseMutation.mutate(entryId)}
                  onUpdate={(entryId, payload) =>
                    updateExerciseMutation.mutate({ entryId, payload })
                  }
                />
              ))}
            </ul>
          )}
        </PixelCard>

        <PixelCard className="border-[var(--color-game-danger)]">
          <h2 className="text-game-title text-[var(--color-game-danger)]">
            {isDraft ? 'Descartar treino' : 'Excluir treino'}
          </h2>
          <p className="mt-1 text-xs text-[var(--color-game-muted)]">
            {isDraft
              ? 'Remove o rascunho e todos os exercícios. Não dá para desfazer.'
              : 'Remove este treino do histórico. Pokémon já capturados continuam na sua coleção.'}
          </p>
          <PixelButton
            className="mt-3"
            disabled={isBusy}
            fullWidth
            variant="danger"
            onClick={() => {
              const message = isDraft
                ? 'Excluir este treino em rascunho?'
                : 'Excluir este treino finalizado do histórico? Os Pokémon capturados permanecem na coleção.';
              if (window.confirm(message)) {
                deleteWorkoutMutation.mutate();
              }
            }}
          >
            {isDraft ? 'Descartar treino' : 'Excluir treino'}
          </PixelButton>
        </PixelCard>

        {isDraft ? (
          <PixelCard className="space-y-3">
            <h2 className="text-game-title text-[var(--color-game-info)]">Catálogo</h2>
            <input
              className={fieldClass}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar exercício..."
              value={search}
            />

            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  'border-2 px-2 py-1 text-[10px] font-bold uppercase',
                  muscleFilter === 'all'
                    ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)] text-[var(--color-game-border)]'
                    : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]',
                )}
                onClick={() => setMuscleFilter('all')}
                type="button"
              >
                Todos
              </button>
              {suggestedMuscleGroups.map((mg) => (
                <button
                  key={mg}
                  className={cn(
                    'border-2 px-2 py-1 text-[10px] font-bold uppercase',
                    muscleFilter === mg
                      ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)] text-[var(--color-game-border)]'
                      : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]',
                  )}
                  onClick={() => setMuscleFilter(mg)}
                  type="button"
                >
                  {MUSCLE_GROUP_LABELS[mg] ?? mg}
                </button>
              ))}
            </div>

            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {catalog.map((item) => {
                const added = sessionExerciseIds.has(item.id);
                const selected = selectedCatalogId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      className={cn(
                        'flex w-full items-center justify-between gap-2 border-2 px-3 py-2 text-left text-sm',
                        selected
                          ? 'border-[var(--color-game-accent)] bg-[var(--color-game-panel)]'
                          : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]',
                        added && 'opacity-50',
                      )}
                      disabled={added}
                      onClick={() => setSelectedCatalogId(item.id)}
                      type="button"
                    >
                      <span className="truncate font-semibold">{item.name}</span>
                      <span className="shrink-0 text-[10px] text-[var(--color-game-muted)]">
                        {MUSCLE_GROUP_LABELS[item.muscle_group ?? ''] ?? item.muscle_group}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedCatalogId ? (
              <div className="space-y-2 border-t-2 border-[var(--color-game-border)] pt-3">
                <p className="text-game-label">Séries · reps · carga (kg)</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    onChange={(e) => setSets(e.target.value)}
                    value={sets}
                  />
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    onChange={(e) => setReps(e.target.value)}
                    value={reps}
                  />
                  <input
                    className={fieldClass}
                    inputMode="decimal"
                    onChange={(e) => setWeight(e.target.value)}
                    value={weight}
                  />
                </div>
                <PixelButton disabled={isBusy} fullWidth onClick={addFromCatalog}>
                  Adicionar ao treino
                </PixelButton>
              </div>
            ) : null}
          </PixelCard>
        ) : null}

        {actionError ? <p className="text-sm text-[var(--color-game-danger)]">{actionError}</p> : null}

        {isDraft ? (
          <WorkoutProofCard
            error={proofError}
            isUploading={proofMutation.isPending}
            proofCaption={workout?.proof_caption}
            proofPhotoUrl={workout?.proof_photo_url}
            onUpload={(file, caption) => {
              setProofError(null);
              proofMutation.mutate({ file, caption });
            }}
          />
        ) : null}

        {isDraft ? (
          <PixelCard className="space-y-3">
            <h2 className="text-game-title">Finalizar</h2>
            <p className="text-xs text-[var(--color-game-muted)]">Esforço percebido (1–10)</p>
            <input
              className="w-full accent-[var(--color-game-accent)]"
              max={10}
              min={1}
              onChange={(e) => setEffort(Number(e.target.value))}
              type="range"
              value={effort}
            />
            <p className="text-center text-sm font-bold">{effort}/10</p>
            {finishError ? <p className="text-sm text-[var(--color-game-danger)]">{finishError}</p> : null}
            <PixelButton
              disabled={finishMutation.isPending || exerciseCount === 0 || isBusy || !hasProof}
              fullWidth
              onClick={() => {
                setFinishError(null);
                finishMutation.mutate();
              }}
            >
              {finishMutation.isPending ? 'Finalizando...' : 'Finalizar e gerar encontro'}
            </PixelButton>
            {!hasProof ? (
              <p className="text-center text-xs text-[var(--color-game-muted)]">
                Envie a foto de prova acima para desbloquear.
              </p>
            ) : null}
          </PixelCard>
        ) : null}
        </>
        )}
      </main>
    </>
  );
};

export default WorkoutDetailPage;
