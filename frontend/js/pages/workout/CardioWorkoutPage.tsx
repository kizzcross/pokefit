import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { workoutsRetrieve } from '@/js/api';
import type { WorkoutDetailWithEncounter } from '@/js/lib/encounter';
import GameIcon from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import { LoadingCardSkeleton, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import WorkoutProofCard from '@/js/components/workout/WorkoutProofCard';
import {
  fetchCardioReference,
  finishCardioWorkout,
  formatPace,
  partsFromPaceSeconds,
  previewCardioSession,
  saveCardioSession,
  type CardioPreview,
  type CardioSessionInput,
} from '@/js/lib/cardio';
import { uploadWorkoutProof } from '@/js/lib/workout';
import { formatDate } from '@/js/lib/utils';
import { useGameStore } from '@/js/stores/game-store';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';

const fieldClass =
  'w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--color-game-accent)]';

const tierStyles: Record<CardioPreview['tier'], string> = {
  improved: 'text-[var(--color-game-accent)]',
  steady: 'text-[var(--color-game-info)]',
  slower: 'text-[var(--color-game-danger)]',
};

const CardioWorkoutPage = () => {
  const { id } = useParams();
  const workoutId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setEncounter = useGameStore((s) => s.setEncounter);

  const [durationMinutes, setDurationMinutes] = useState('30');
  const [paceMinutes, setPaceMinutes] = useState('6');
  const [paceSeconds, setPaceSeconds] = useState('0');
  const [effort, setEffort] = useState(7);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CardioPreview | null>(null);

  const workoutQuery = useQuery({
    queryKey: ['workouts', workoutId],
    queryFn: async () => (await workoutsRetrieve({ path: { id: String(workoutId) } })).data,
    enabled: Number.isFinite(workoutId),
  });

  const workout = workoutQuery.data;
  const isDraft = workout?.status === 'draft';
  const hasProof = Boolean(workout?.proof_photo_url);

  const referenceQuery = useQuery({
    queryKey: ['workouts', workoutId, 'cardio-reference'],
    queryFn: () => fetchCardioReference(workoutId),
    enabled: Number.isFinite(workoutId) && workout?.workout_type === 'cardio',
  });

  useEffect(() => {
    if (!workout?.cardio_pace_seconds_per_km) return;
    const parts = partsFromPaceSeconds(workout.cardio_pace_seconds_per_km);
    setPaceMinutes(String(parts.minutes));
    setPaceSeconds(String(parts.seconds));
    if (workout.cardio_duration_minutes) {
      setDurationMinutes(String(workout.cardio_duration_minutes));
    }
  }, [workout?.cardio_pace_seconds_per_km, workout?.cardio_duration_minutes]);

  const sessionPayload = useMemo((): CardioSessionInput | null => {
    const duration = Number(durationMinutes);
    const pMin = Number(paceMinutes);
    const pSec = Number(paceSeconds);
    if (!duration || duration < 1 || Number.isNaN(pMin) || Number.isNaN(pSec)) return null;
    return {
      duration_minutes: duration,
      pace_minutes: pMin,
      pace_seconds: pSec,
    };
  }, [durationMinutes, paceMinutes, paceSeconds]);

  const previewMutation = useMutation({
    mutationFn: () => {
      if (!sessionPayload) throw new Error('invalid');
      return previewCardioSession(workoutId, sessionPayload);
    },
    onSuccess: (data) => setPreview(data),
  });

  useEffect(() => {
    if (!sessionPayload || !isDraft) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => previewMutation.mutate(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPayload?.duration_minutes, sessionPayload?.pace_minutes, sessionPayload?.pace_seconds, isDraft]);

  const proofMutation = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) =>
      uploadWorkoutProof(workoutId, file, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workoutId] });
      setProofError(null);
    },
    onError: () => setProofError('Não foi possível enviar a foto.'),
  });

  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!sessionPayload) throw new Error('Preencha duração e ritmo.');
      if (isDraft) await saveCardioSession(workoutId, sessionPayload);
      return finishCardioWorkout(workoutId, {
        ...sessionPayload,
        perceived_effort: effort,
      });
    },
    onSuccess: (finished) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'pending-encounter'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-goal'] });
      queryClient.invalidateQueries({ queryKey: ['my-pokemon'] });
      const workoutData = finished.workout as WorkoutDetailWithEncounter | undefined;
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
            cardioSummary: finished.cardio_summary,
          },
        });
      } else {
        setFinishError('Cardio finalizado, mas não há Pokémon no catálogo.');
      }
    },
    onError: () =>
      setFinishError('Envie a foto de prova e preencha duração e ritmo (pace) antes de finalizar.'),
  });

  const reference = referenceQuery.data;
  const isRefetching = isQueryRefetching(workoutQuery);

  useEffect(() => {
    if (workout && workout.workout_type !== 'cardio' && Number.isFinite(workoutId)) {
      navigate(`/workout/${workoutId}`, { replace: true });
    }
  }, [workout, workoutId, navigate]);

  if (workout && workout.workout_type !== 'cardio') {
    return null;
  }

  return (
    <>
      <MobileHeader
        backTo="/workouts"
        subtitle={
          isDraft
            ? 'Corrida / cardio — ritmo define o encontro'
            : workout?.ended_at
              ? formatDate(workout.ended_at)
              : 'Finalizado'
        }
        title="Cardio"
      />
      <main className="space-y-4 px-4 pb-32 pt-4">
        <QueryRefetchBar visible={isRefetching} />

        {workoutQuery.isPending ? (
          <LoadingCardSkeleton lines={4} />
        ) : workoutQuery.isError ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-danger)]">Treino não encontrado.</p>
          </PixelCard>
        ) : (
          <>
            <PixelCard className="border-[var(--color-game-info)]">
              <div className="flex items-start gap-3">
                <GameIcon className="shrink-0 text-[var(--color-game-info)]" name="workout" size={28} />
                <div>
                  <p className="text-game-title text-[var(--color-game-info)]">Como funciona</p>
                  <p className="mt-1 text-xs text-[var(--color-game-muted)]">
                    Informe o tempo da sessão e seu ritmo médio (min/km). A raridade do Pokémon depende de
                    quão você foi em relação ao{' '}
                    {reference?.has_previous_cardio ? 'último cardio' : 'ritmo de referência (6:00/km)'}.
                  </p>
                </div>
              </div>
            </PixelCard>

            {reference ? (
              <PixelCard>
                <p className="text-game-label text-[var(--color-game-muted)]">Referência de ritmo</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-game-accent)]">
                  {reference.reference_pace_display}
                  <span className="ml-2 text-sm font-normal text-[var(--color-game-muted)]">/ km</span>
                </p>
                {reference.has_previous_cardio && reference.last_cardio_pace_display ? (
                  <p className="mt-2 text-xs text-[var(--color-game-muted)]">
                    Último cardio: {reference.last_cardio_pace_display}/km
                    {reference.last_cardio_duration_minutes
                      ? ` · ${reference.last_cardio_duration_minutes} min`
                      : ''}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-game-muted)]">
                    Primeiro cardio — comparado com 6:00/km.
                  </p>
                )}
              </PixelCard>
            ) : null}

            {isDraft ? (
              <>
                <PixelCard>
                  <p className="text-game-title text-[var(--color-game-accent)]">Sessão</p>
                  <label className="mt-3 block text-xs font-bold uppercase text-[var(--color-game-muted)]">
                    Duração (minutos)
                  </label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    min={1}
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />

                  <p className="mt-4 text-xs font-bold uppercase text-[var(--color-game-muted)]">
                    Ritmo médio (min : seg por km)
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      aria-label="Minutos por km"
                      className={fieldClass}
                      inputMode="numeric"
                      min={2}
                      max={20}
                      type="number"
                      value={paceMinutes}
                      onChange={(e) => setPaceMinutes(e.target.value)}
                    />
                    <input
                      aria-label="Segundos por km"
                      className={fieldClass}
                      inputMode="numeric"
                      min={0}
                      max={59}
                      type="number"
                      value={paceSeconds}
                      onChange={(e) => setPaceSeconds(e.target.value)}
                    />
                  </div>
                  {sessionPayload ? (
                    <p className="mt-2 text-sm text-[var(--color-game-muted)]">
                      Ritmo:{' '}
                      <strong className="text-[var(--color-game-text)]">
                        {formatPace(
                          sessionPayload.pace_minutes * 60 + sessionPayload.pace_seconds,
                        )}
                      </strong>{' '}
                      / km
                    </p>
                  ) : null}
                </PixelCard>

                {preview ? (
                  <PixelCard className="border-[var(--color-game-accent)]">
                    <p className="text-game-label text-[var(--color-game-muted)]">Prévia do encontro</p>
                    <p className={`mt-1 text-sm font-semibold ${tierStyles[preview.tier]}`}>
                      {preview.message}
                    </p>
                    <p className="mt-2 text-xs text-[var(--color-game-muted)]">
                      Score de progresso: {preview.progress_score}/100 — quanto maior, mais chance de
                      Pokémon raros.
                    </p>
                  </PixelCard>
                ) : null}

                <WorkoutProofCard
                  error={proofError}
                  isUploading={proofMutation.isPending}
                  proofCaption={workout?.proof_caption}
                  proofPhotoUrl={workout?.proof_photo_url}
                  onUpload={(file, caption) => proofMutation.mutate({ file, caption })}
                />

                <PixelCard>
                  <label className="text-xs font-bold uppercase text-[var(--color-game-muted)]">
                    Esforço percebido (1–10)
                  </label>
                  <input
                    className="mt-2 w-full accent-[var(--color-game-accent)]"
                    max={10}
                    min={1}
                    type="range"
                    value={effort}
                    onChange={(e) => setEffort(Number(e.target.value))}
                  />
                  <p className="mt-1 text-center text-lg font-bold">{effort}</p>
                </PixelCard>

                {finishError ? (
                  <p className="text-sm text-[var(--color-game-danger)]">{finishError}</p>
                ) : null}

                <PixelButton
                  disabled={!hasProof || !sessionPayload || finishMutation.isPending}
                  fullWidth
                  onClick={() => {
                    setFinishError(null);
                    finishMutation.mutate();
                  }}
                >
                  Finalizar cardio e encontrar Pokémon
                </PixelButton>
              </>
            ) : (
              <PixelCard>
                <p className="text-game-title">Treino finalizado</p>
                {workout?.cardio_pace_display ? (
                  <p className="mt-2 text-sm">
                    Ritmo: <strong>{workout.cardio_pace_display}</strong>/km ·{' '}
                    {workout.cardio_duration_minutes ?? workout.duration_minutes} min
                  </p>
                ) : null}
                {workout?.encounter_species ? (
                  <PixelButton
                    className="mt-3"
                    fullWidth
                    onClick={() => navigate('/encounter')}
                    variant="secondary"
                  >
                    Ver encontro
                  </PixelButton>
                ) : null}
              </PixelCard>
            )}
          </>
        )}
      </main>
    </>
  );
};

export default CardioWorkoutPage;
