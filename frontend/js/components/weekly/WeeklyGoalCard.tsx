import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { LoadingCardSkeleton } from '@/js/components/ui/GameLoading';
import { useAuth } from '@/js/hooks/useAuth';
import type { WeeklyGoalStatus } from '@/js/lib/weekly-goal';
import { saveWeeklyGoal } from '@/js/lib/weekly-goal';
import { cn } from '@/js/lib/utils';

type WeeklyGoalCardProps = {
  data?: WeeklyGoalStatus;
  isLoading?: boolean;
};

const formatWeekRange = (start: string, end: string) => {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
};

const HpBar = ({
  current,
  max,
  percent,
  goalMet,
}: {
  current: number;
  max: number;
  percent: number;
  goalMet: boolean;
}) => {
  const fillColor = goalMet
    ? 'from-[var(--color-game-accent)] to-[#e8c040]'
    : percent >= 66
      ? 'from-[#5ad66a] to-[var(--color-game-success)]'
      : percent >= 33
        ? 'from-[#4aa8d8] to-[var(--color-game-info)]'
        : 'from-[#e85d4c] to-[#c94a3d]';

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-game-muted)]">
          Progresso
        </span>
        <span
          className={cn(
            'font-display text-sm font-bold tabular-nums',
            goalMet ? 'text-[var(--color-game-accent)]' : 'text-[var(--color-game-text)]',
          )}
        >
          <span className="text-[var(--color-game-success)]">{current}</span>
          <span className="text-[var(--color-game-muted)]"> / </span>
          <span>{max}</span>
        </span>
      </div>
      <div className="relative h-5 border-4 border-[var(--color-game-border)] bg-[#0f1020] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.5)]">
        <div
          className={cn('h-full bg-gradient-to-r transition-all duration-700', fillColor)}
          style={{ width: `${Math.max(8, percent)}%` }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-end px-1">
          <span className="text-[9px] font-bold text-white/90 drop-shadow-[1px_1px_0_#000]">
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
};

const TrainerSpotlight = ({
  displayName,
  trainerSprite,
  trainerSpriteUrl,
  badge,
}: {
  displayName: string;
  trainerSprite?: string | null;
  trainerSpriteUrl?: string | null;
  badge?: ReactNode;
}) => (
  <div className="relative flex shrink-0 flex-col items-center">
    <div className="relative border-4 border-[var(--color-game-border)] bg-gradient-to-b from-[#3e4771] to-[var(--color-game-bg)] px-3 pb-1 pt-3 shadow-[4px_4px_0_0_var(--color-game-border)]">
      <TrainerAvatar
        alt={displayName}
        className="!mx-0 !border-0 !bg-transparent"
        size="lg"
        slug={trainerSprite}
        src={trainerSpriteUrl}
      />
      {badge ? (
        <div className="absolute -right-2 -top-2 border-2 border-[var(--color-game-border)] bg-[var(--color-game-accent)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--color-game-border)]">
          {badge}
        </div>
      ) : null}
    </div>
    <div className="mt-2 max-w-[5.5rem] truncate text-center text-[10px] font-bold text-[var(--color-game-text)]">
      {displayName}
    </div>
  </div>
);

const RewardBadge = ({ claimed }: { claimed: boolean }) => (
  <div
    className={cn(
      'flex items-center gap-2 border-4 px-2 py-2',
      claimed
        ? 'border-[var(--color-game-success)] bg-[var(--color-game-success)]/15'
        : 'border-[var(--color-game-accent-dark)] bg-[var(--color-game-accent)]/10',
    )}
  >
    <GameIcon
      className={claimed ? 'text-[var(--color-game-success)]' : 'text-[var(--color-game-accent)]'}
      name={claimed ? 'shiny' : 'pokeball'}
      size={22}
    />
    <p className="text-[9px] font-bold leading-tight text-[var(--color-game-muted)]">
      {claimed ? (
        <>
          <span className="text-[var(--color-game-success)]">Recompensa obtida</span>
          <br />
          lendário / ultra raro
        </>
      ) : (
        <>
          <span className="text-[var(--color-game-accent)]">Ao completar:</span>
          <br />
          lendário ou ultra raro
        </>
      )}
    </p>
  </div>
);

const WeeklyGoalCard = ({ data, isLoading }: WeeklyGoalCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draftTarget, setDraftTarget] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayName = user?.display_name ?? user?.email?.split('@')[0] ?? 'Treinador';

  const saveMutation = useMutation({
    mutationFn: saveWeeklyGoal,
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['weekly-goal'] });
    },
    onError: () => setSaveError('Não foi possível salvar a meta. Talvez você já tenha definido esta semana.'),
  });

  if (isLoading || !data) {
    return <LoadingCardSkeleton lines={4} />;
  }

  const pickerValue = draftTarget ?? data.suggested_target ?? 3;

  if (!data.has_active_goal) {
    return (
      <PixelCard className="overflow-hidden border-[var(--color-game-info)] p-0">
        <div className="bg-gradient-to-r from-[var(--color-game-info)]/20 via-transparent to-[var(--color-game-accent)]/10 px-4 py-3">
          <p className="text-game-title text-[var(--color-game-info)]">Novo desafio semanal</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-game-muted)]">
            {formatWeekRange(data.week_start, data.week_end)}
          </p>
        </div>

        <div className="flex gap-4 p-4">
          <TrainerSpotlight
            displayName={displayName}
            trainerSprite={user?.trainer_sprite}
            trainerSpriteUrl={user?.trainer_sprite_url}
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="text-sm text-[var(--color-game-muted)]">
              Quantos treinos você vai fechar esta semana? Depois de salvar, fica fixo até domingo.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <PixelButton
                className="min-h-11 min-w-11 text-xl"
                disabled={pickerValue <= 1 || saveMutation.isPending}
                variant="secondary"
                onClick={() => setDraftTarget(Math.max(1, pickerValue - 1))}
              >
                −
              </PixelButton>
              <div className="min-w-[4.5rem] border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-center shadow-[3px_3px_0_0_var(--color-game-border)]">
                <p className="font-display text-3xl text-[var(--color-game-accent)]">{pickerValue}</p>
                <p className="text-[8px] uppercase text-[var(--color-game-muted)]">treinos</p>
              </div>
              <PixelButton
                className="min-h-11 min-w-11 text-xl"
                disabled={pickerValue >= 7 || saveMutation.isPending}
                variant="secondary"
                onClick={() => setDraftTarget(Math.min(7, pickerValue + 1))}
              >
                +
              </PixelButton>
            </div>

            {saveError ? <p className="mt-2 text-xs text-[var(--color-game-danger)]">{saveError}</p> : null}

            <PixelButton
              className="mt-3"
              disabled={saveMutation.isPending}
              fullWidth
              onClick={() => saveMutation.mutate(pickerValue)}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Comprometer meta'}
            </PixelButton>
          </div>
        </div>
      </PixelCard>
    );
  }

  const percent = data.progress_percent;
  const target = data.target ?? 0;

  let statusText = `Faltam ${Math.max(0, target - data.current)} treino(s) para a recompensa.`;
  let statusAccent = 'text-[var(--color-game-muted)]';
  if (data.reward_claimed) {
    statusText = 'Parabéns! Você liberou o encontro lendário esta semana.';
    statusAccent = 'text-[var(--color-game-success)]';
  } else if (data.pending_legendary_encounter) {
    statusText = 'Meta completa! Finalize um treino para o Pokémon aparecer.';
    statusAccent = 'text-[var(--color-game-accent)]';
  } else if (data.goal_met) {
    statusText = 'Último passo: um treino e o lendário surge!';
    statusAccent = 'text-[var(--color-game-accent)]';
  }

  return (
    <PixelCard className="overflow-hidden border-[var(--color-game-accent-dark)] p-0">
      <div
        className={cn(
          'border-b-4 border-[var(--color-game-border)] px-4 py-2',
          data.goal_met
            ? 'bg-gradient-to-r from-[var(--color-game-accent)]/30 to-[var(--color-game-danger)]/20'
            : 'bg-gradient-to-r from-[var(--color-game-panel)] to-[var(--color-game-bg)]',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-game-title text-[var(--color-game-accent)]">Meta semanal</p>
          {data.goal_locked ? (
            <span className="flex items-center gap-1 border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-0.5 text-[8px] font-bold uppercase text-[var(--color-game-muted)]">
              <GameIcon name="missions" size={10} />
              Ativa
            </span>
          ) : null}
        </div>
        <p className="text-[10px] text-[var(--color-game-muted)]">
          {formatWeekRange(data.week_start, data.week_end)}
        </p>
      </div>

      <div className="flex gap-3 p-4">
        <TrainerSpotlight
          badge={`${target}x`}
          displayName={displayName}
          trainerSprite={user?.trainer_sprite}
          trainerSpriteUrl={user?.trainer_sprite_url}
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <HpBar
            current={data.hp_current}
            goalMet={data.goal_met}
            max={data.hp_max}
            percent={percent}
          />

          <p className={cn('text-xs leading-snug', statusAccent)}>{statusText}</p>

          <RewardBadge claimed={data.reward_claimed} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)]/80 px-4 py-2">
        <p className="text-[9px] text-[var(--color-game-muted)]">
          Meta bloqueada até o fim da semana
        </p>
        <Link
          className="text-[9px] font-bold uppercase text-[var(--color-game-info)] no-underline hover:underline"
          to="/profile"
        >
          Trocar ícone
        </Link>
      </div>
    </PixelCard>
  );
};

export default WeeklyGoalCard;
