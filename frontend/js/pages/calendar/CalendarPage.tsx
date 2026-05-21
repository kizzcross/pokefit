import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import CalendarGrid from '@/js/components/calendar/CalendarGrid';
import GameIcon from '@/js/components/game/GameIcon';
import StatBar from '@/js/components/game/StatBar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
import { LoadingCardSkeleton, QueryRefetchBar, SectionLoading } from '@/js/components/ui/GameLoading';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import {
  buildMonthGrid,
  daysInMonth,
  fetchMyCalendar,
  localDateIso,
  type CalendarDay,
} from '@/js/lib/calendar';
import { workoutTypeLabel } from '@/js/lib/workout-labels';

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const CalendarPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const todayIso = localDateIso(now);

  const calendarQuery = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => fetchMyCalendar(year, month),
  });

  const data = calendarQuery.data;
  const cells = useMemo(
    () => buildMonthGrid(year, month, data?.days),
    [year, month, data?.days],
  );

  const shiftMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
    setSelected(null);
  };

  const monthGoal = 20;
  const daysTrained = data?.days_trained ?? 0;
  const progress = Math.min(100, Math.round((daysTrained / monthGoal) * 100));
  const totalDays = daysInMonth(year, month);
  const streakCurrent = data?.streak_current ?? 0;
  const streakMonth = data?.streak_best_in_month ?? 0;
  const streakRecord = data?.streak_best_all_time ?? 0;

  return (
    <>
      <MobileHeader backTo="/" title="Jornada" subtitle="Mapa de treinos" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isQueryRefetching(calendarQuery)} />

        {calendarQuery.isPending && !data ? (
          <LoadingCardSkeleton lines={4} />
        ) : (
        <PixelCard className="border-[var(--color-game-accent)]">
          <div className="flex items-center justify-between gap-2">
            <button
              className="pixel-btn pixel-btn-secondary min-h-10 min-w-10 px-2"
              onClick={() => shiftMonth(-1)}
              type="button"
            >
              ◀
            </button>
            <div className="text-center">
              <p className="text-game-title text-[var(--color-game-accent)]">
                {MONTH_NAMES[month - 1]}
              </p>
              <p className="text-xs text-[var(--color-game-muted)]">
                {year} · {totalDays} dias
              </p>
            </div>
            <button
              className="pixel-btn pixel-btn-secondary min-h-10 min-w-10 px-2"
              onClick={() => shiftMonth(1)}
              type="button"
            >
              ▶
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2 text-center">
              <p className="text-[10px] text-[var(--color-game-muted)]">Neste mês</p>
              <p className="text-xl font-bold text-[var(--color-game-accent)]">{daysTrained}</p>
              <p className="text-[9px] text-[var(--color-game-muted)]">dias treinados</p>
            </div>
            <div className="rounded-sm border-2 border-[var(--color-game-danger)]/60 bg-[var(--color-game-bg)] px-2 py-2 text-center">
              <p className="text-[10px] text-[var(--color-game-muted)]">Sequência</p>
              <p className="flex items-center justify-center gap-1 text-xl font-bold text-[var(--color-game-danger)]">
                <GameIcon name="missions" size={16} />
                {streakCurrent}
              </p>
              <p className="text-[9px] text-[var(--color-game-muted)]">ativa agora</p>
            </div>
            <div className="rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2 text-center">
              <p className="text-[10px] text-[var(--color-game-muted)]">Recorde</p>
              <p className="text-xl font-bold">{streakRecord}</p>
              <p className="text-[9px] text-[var(--color-game-muted)]">
                {streakMonth > 0 ? `${streakMonth} no mês` : 'histórico'}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-1 text-xs text-[var(--color-game-muted)]">
              Meta do mês: {daysTrained}/{monthGoal} dias
            </p>
            <StatBar label="" max={100} value={progress} />
          </div>

          {daysTrained === 0 && streakCurrent > 0 ? (
            <p className="mt-2 text-center text-[10px] text-[var(--color-game-muted)]">
              A sequência ativa veio de treinos em outros meses — este mês ainda está zerado.
            </p>
          ) : null}
        </PixelCard>
        )}

        <PixelCard>
          {calendarQuery.isError ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-[var(--color-game-danger)]">Não foi possível carregar o mês.</p>
              <PixelButton variant="secondary" onClick={() => calendarQuery.refetch()}>
                Tentar de novo
              </PixelButton>
            </div>
          ) : calendarQuery.isPending && !data ? (
            <SectionLoading label="Carregando calendário..." />
          ) : (
            <div className={calendarQuery.isFetching ? 'opacity-60 transition-opacity' : undefined}>
              <CalendarGrid
                cells={cells}
                selectedDate={selected?.date ?? null}
                todayIso={todayIso}
                onSelectDay={setSelected}
              />
            </div>
          )}
        </PixelCard>

        {selected ? (
          <PixelCard className="space-y-3 border-[var(--color-game-info)]">
            <h2 className="text-game-title">
              Dia {selected.date.split('-')[2]} — {MONTH_NAMES[month - 1]}
            </h2>
            {selected.workout_count === 0 ? (
              <p className="text-sm text-[var(--color-game-muted)]">
                {selected.has_draft
                  ? 'Treino em rascunho neste dia. Abra e finalize com foto de prova.'
                  : 'Nenhum treino conquistado neste dia.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {selected.workouts.map((w) => (
                  <li
                    key={w.id}
                    className="flex gap-3 border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] p-3"
                  >
                    {w.proof_photo_url ? (
                      <img
                        alt=""
                        className="h-14 w-14 border-4 border-[var(--color-game-border)] object-cover"
                        src={w.proof_photo_url}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center border-4 border-[var(--color-game-border)]">
                        <GameIcon name="workout" size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{workoutTypeLabel(w.workout_type)}</p>
                      <p className="text-xs text-[var(--color-game-muted)]">Vol. {w.total_volume}</p>
                      {w.encounter_species_name ? (
                        <p className="text-xs text-[var(--color-game-success)]">
                          {w.encounter_species_name}
                        </p>
                      ) : null}
                      <Link
                        className="mt-1 inline-block text-[10px] font-bold uppercase text-[var(--color-game-info)] no-underline"
                        to={`/workout/${w.id}`}
                      >
                        Ver treino
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PixelCard>
        ) : (
          <PixelCard className="text-center">
            <p className="text-sm text-[var(--color-game-muted)]">
              Toque em um dia do mapa para ver detalhes.
            </p>
          </PixelCard>
        )}

        <div className="grid grid-cols-2 gap-2">
          <PixelLink fullWidth to="/timeline" variant="secondary">
            Timeline
          </PixelLink>
          <PixelLink fullWidth to="/friends" variant="secondary">
            Amigos
          </PixelLink>
        </div>
      </main>
    </>
  );
};

export default CalendarPage;
