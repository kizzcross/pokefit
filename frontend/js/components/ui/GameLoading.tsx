import { ReactNode } from 'react';

import PixelCard from '@/js/components/ui/PixelCard';
import { cn } from '@/js/lib/utils';

type GameLoadingProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export const GameLoading = ({ label = 'Carregando...', className, compact = false }: GameLoadingProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3',
      compact ? 'py-4' : 'py-10',
      className,
    )}
    role="status"
    aria-live="polite"
  >
    <div className="flex items-end gap-1.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="inline-block h-3 w-3 border-2 border-[var(--color-game-border)] bg-[var(--color-game-accent)]"
          style={{
            animation: 'game-loading-bounce 0.9s ease-in-out infinite',
            animationDelay: `${index * 0.12}s`,
          }}
        />
      ))}
    </div>
    {label ? <p className="text-game-label text-[var(--color-game-muted)]">{label}</p> : null}
  </div>
);

export const PageLoading = ({ label }: { label?: string }) => (
  <GameLoading className="min-h-[45vh]" label={label} />
);

export const SectionLoading = ({ label }: { label?: string }) => (
  <GameLoading compact label={label} />
);

export const QueryRefetchBar = ({ visible, className }: { visible: boolean; className?: string }) => {
  if (!visible) return null;
  return (
    <p
      className={cn(
        'text-center text-[10px] font-bold uppercase tracking-wide text-[var(--color-game-info)] animate-pulse',
        className,
      )}
    >
      Atualizando...
    </p>
  );
};

export const LoadingCardSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <PixelCard className="animate-pulse space-y-3" aria-hidden>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className="h-4 rounded-sm bg-[var(--color-game-panel)]"
        style={{ width: `${Math.max(40, 100 - index * 18)}%` }}
      />
    ))}
  </PixelCard>
);

export const LoadingGridSkeleton = ({ count = 4, cols = 2 }: { count?: number; cols?: 2 | 3 }) => (
  <div
    className={cn('grid gap-3', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}
    aria-hidden
  >
    {Array.from({ length: count }).map((_, index) => (
      <PixelCard key={index} className="animate-pulse min-h-28" />
    ))}
  </div>
);

type QueryGateProps = {
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  loadingLabel?: string;
  children: ReactNode;
};

export const QueryGate = ({
  isPending,
  isError,
  errorMessage = 'Não foi possível carregar.',
  onRetry,
  loadingLabel,
  children,
}: QueryGateProps) => {
  if (isPending) {
    return <PageLoading label={loadingLabel} />;
  }

  if (isError) {
    return (
      <PixelCard className="text-center">
        <p className="text-sm text-[var(--color-game-danger)]">{errorMessage}</p>
        {onRetry ? (
          <button
            className="mt-3 text-[10px] font-bold uppercase text-[var(--color-game-info)]"
            onClick={onRetry}
            type="button"
          >
            Tentar de novo
          </button>
        ) : null}
      </PixelCard>
    );
  }

  return children;
};
