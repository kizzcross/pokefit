import { cn } from '@/js/lib/utils';

type PixelBadgeProps = {
  count: number;
  className?: string;
  max?: number;
};

const PixelBadge = ({ count, className, max = 9 }: PixelBadgeProps) => {
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);

  return (
    <span
      aria-hidden
      className={cn(
        'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center border-2 border-[var(--color-game-border)] bg-[var(--color-game-danger)] px-1 text-[9px] font-bold leading-none text-white shadow-[1px_1px_0_0_var(--color-game-border)]',
        className,
      )}
    >
      {label}
    </span>
  );
};

export default PixelBadge;
