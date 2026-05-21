import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import type { CalendarDay } from '@/js/lib/calendar';
import { WEEKDAY_LABELS } from '@/js/lib/calendar';
import { cn } from '@/js/lib/utils';

const WORKOUT_BORDER: Record<string, string> = {
  chest_triceps: 'border-[#e85d4c]',
  back_biceps: 'border-[#5bc0eb]',
  legs: 'border-[#7ae582]',
  shoulders: 'border-[#f4d35e]',
  arms: 'border-[#c9a227]',
  cardio: 'border-[#b8c4e8]',
  full_body: 'border-[var(--color-game-accent)]',
  mobility: 'border-[#9b8cff]',
};

type CalendarGridProps = {
  cells: (CalendarDay | null)[];
  selectedDate: string | null;
  todayIso: string;
  onSelectDay: (day: CalendarDay) => void;
};

const CalendarGrid = ({ cells, selectedDate, todayIso, onSelectDay }: CalendarGridProps) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-[10px] font-bold uppercase text-[var(--color-game-muted)]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[4.25rem] rounded-sm bg-[var(--color-game-bg)]/40"
              />
            );
          }

          const dayNum = Number(day.date.split('-')[2]);
          const isToday = day.date === todayIso;
          const isSelected = day.date === selectedDate;
          const isFuture = day.date > todayIso;
          const conquered = day.workout_count > 0;
          const capture = day.has_capture;
          const shiny = day.has_shiny;
          const primaryType = day.workouts[0]?.workout_type ?? '';
          const typeBorder = WORKOUT_BORDER[primaryType] ?? 'border-[var(--color-game-border)]';

          return (
            <button
              key={day.date}
              className={cn(
                'relative flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-sm border-4 p-0.5 transition active:scale-95',
                conquered
                  ? `bg-[var(--color-game-accent)]/30 shadow-[2px_2px_0_0_var(--color-game-border)] ${typeBorder}`
                  : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]',
                day.has_draft && !conquered && 'border-dashed border-[var(--color-game-muted)]',
                isFuture && !conquered && 'opacity-45',
                isToday && 'ring-2 ring-[var(--color-game-info)] ring-offset-1 ring-offset-[var(--color-game-panel)]',
                isSelected && !isToday && 'ring-2 ring-[var(--color-game-success)]',
              )}
              onClick={() => onSelectDay(day)}
              type="button"
            >
              <span
                className={cn(
                  'text-[11px] font-bold leading-none',
                  conquered ? 'text-[var(--color-game-text)]' : 'text-[var(--color-game-muted)]',
                  isToday && 'text-[var(--color-game-info)]',
                )}
              >
                {dayNum}
              </span>

              {conquered ? (
                capture && day.workouts[0]?.encounter_species_pokedex_id ? (
                  <PokemonSprite
                    alt=""
                    className="!mx-0"
                    pokedexId={day.workouts[0].encounter_species_pokedex_id}
                    size="xs"
                    src={day.workouts[0].encounter_species_sprite ?? undefined}
                  />
                ) : (
                  <GameIcon className="text-[var(--color-game-accent)]" name="workout" size={14} />
                )
              ) : day.has_draft ? (
                <span className="text-[9px] font-bold text-[var(--color-game-muted)]">!</span>
              ) : (
                <span className="h-1 w-1 rounded-full bg-[var(--color-game-border)]" />
              )}

              {shiny ? (
                <GameIcon
                  className="absolute -right-0.5 -top-0.5 text-[var(--color-game-accent)]"
                  name="shiny"
                  size={10}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 border-t-2 border-[var(--color-game-border)] pt-3 text-[9px] text-[var(--color-game-muted)]">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 border-2 border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/30" />
          Treinou
        </span>
        <span className="inline-flex items-center gap-1">
          <GameIcon name="workout" size={10} />
          Sem captura
        </span>
        <span className="inline-flex items-center gap-1">
          <GameIcon name="shiny" size={10} />
          Shiny
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 border-2 border-dashed border-[var(--color-game-muted)]" />
          Rascunho
        </span>
      </div>
    </div>
  );
};

export default CalendarGrid;
