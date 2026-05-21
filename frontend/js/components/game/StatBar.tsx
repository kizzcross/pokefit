import { cn } from '@/js/lib/utils';

type StatBarProps = {
  label: string;
  value: number;
  max?: number;
  color?: string;
};

const StatBar = ({ label, value, max = 100, color = 'bg-[var(--color-game-success)]' }: StatBarProps) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--color-game-muted)]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-3 border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
        <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default StatBar;
