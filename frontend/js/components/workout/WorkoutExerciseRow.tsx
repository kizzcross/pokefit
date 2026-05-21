import { useState } from 'react';

import GameIcon from '@/js/components/game/GameIcon';
import PixelButton from '@/js/components/ui/PixelButton';
import type { WorkoutExerciseEntry, WorkoutExerciseUpdate } from '@/js/lib/workout';
import { MUSCLE_GROUP_LABELS } from '@/js/lib/workout-labels';
import { cn } from '@/js/lib/utils';

const fieldClass =
  'w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]';

type WorkoutExerciseRowProps = {
  entry: WorkoutExerciseEntry;
  index: number;
  editable?: boolean;
  isBusy?: boolean;
  onUpdate?: (entryId: number, payload: WorkoutExerciseUpdate) => void;
  onDelete?: (entryId: number) => void;
};

const WorkoutExerciseRow = ({
  entry,
  index,
  editable = false,
  isBusy = false,
  onUpdate,
  onDelete,
}: WorkoutExerciseRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(String(entry.sets ?? 3));
  const [reps, setReps] = useState(String(entry.reps ?? 10));
  const [weight, setWeight] = useState(String(entry.weight ?? 0));

  const name = entry.exercise?.name ?? entry.name ?? 'Exercício';
  const muscle = entry.exercise?.muscle_group
    ? MUSCLE_GROUP_LABELS[entry.exercise.muscle_group] ?? entry.exercise.muscle_group
    : null;

  const saveEdit = () => {
    onUpdate?.(entry.id, {
      sets: Number(sets),
      reps: Number(reps),
      weight: Number(weight),
    });
    setEditing(false);
  };

  return (
    <li className="border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="text-game-label shrink-0 text-[var(--color-game-muted)]">#{index + 1}</span>

        {entry.exercise?.image_url ? (
          <img
            alt=""
            className="h-10 w-10 shrink-0 border-2 border-[var(--color-game-border)] object-cover"
            src={entry.exercise.image_url}
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--color-game-border)]">
            <GameIcon name="workout" size={18} />
          </div>
        )}

        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-[var(--color-game-muted)]">
            {entry.sets}×{entry.reps} @ {entry.weight} kg
            {entry.volume != null ? ` · vol ${entry.volume}` : ''}
          </p>
          {muscle ? <p className="text-[10px] text-[var(--color-game-info)]">{muscle}</p> : null}
        </button>

        <span className="text-[var(--color-game-muted)]">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t-2 border-[var(--color-game-border)] px-3 py-3">
          {editing && editable ? (
            <div className="space-y-2">
              <p className="text-game-label text-[var(--color-game-accent)]">Editar carga</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--color-game-muted)]">Séries</label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    onChange={(e) => setSets(e.target.value)}
                    value={sets}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-game-muted)]">Reps</label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    onChange={(e) => setReps(e.target.value)}
                    value={reps}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-game-muted)]">Kg</label>
                  <input
                    className={fieldClass}
                    inputMode="decimal"
                    onChange={(e) => setWeight(e.target.value)}
                    value={weight}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PixelButton disabled={isBusy} fullWidth onClick={saveEdit}>
                  Salvar
                </PixelButton>
                <PixelButton
                  disabled={isBusy}
                  fullWidth
                  variant="secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </PixelButton>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[10px] uppercase text-[var(--color-game-muted)]">Séries</dt>
                <dd className="font-bold">{entry.sets}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--color-game-muted)]">Repetições</dt>
                <dd className="font-bold">{entry.reps}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--color-game-muted)]">Carga</dt>
                <dd className="font-bold">{entry.weight} kg</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--color-game-muted)]">Volume</dt>
                <dd className="font-bold">{entry.volume ?? '—'}</dd>
              </div>
            </dl>
          )}

          {editable ? (
            <div className="grid grid-cols-2 gap-2">
              {!editing ? (
                <PixelButton
                  disabled={isBusy}
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    setSets(String(entry.sets ?? 3));
                    setReps(String(entry.reps ?? 10));
                    setWeight(String(entry.weight ?? 0));
                    setEditing(true);
                  }}
                >
                  Alterar
                </PixelButton>
              ) : null}
              <PixelButton
                className={cn(!editing && 'col-span-2')}
                disabled={isBusy}
                fullWidth
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Remover "${name}" deste treino?`)) {
                    onDelete?.(entry.id);
                  }
                }}
              >
                Excluir
              </PixelButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

export default WorkoutExerciseRow;
