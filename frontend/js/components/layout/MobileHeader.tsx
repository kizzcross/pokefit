import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import { cn } from '@/js/lib/utils';

type MobileHeaderProps = {
  title: string;
  subtitle?: string;
  /**
   * Fallback destination when there is no history to pop (e.g. user opened
   * the page directly via URL). The back button always tries `navigate(-1)`
   * first and only falls back to this path when there isn't a previous entry.
   */
  backTo?: string;
  action?: ReactNode;
};

const MobileHeader = ({ title, subtitle, backTo, action }: MobileHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const hasHistory = location.key !== 'default';
    if (hasHistory) {
      navigate(-1);
      return;
    }
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b-4 border-[var(--color-game-border)] bg-[var(--color-game-bg-light)] px-4 py-3">
      <div className="flex items-center gap-3">
        {backTo ? (
          <button
            aria-label="Voltar"
            className="pixel-btn pixel-btn-secondary flex min-h-10 min-w-10 items-center justify-center px-2 py-2"
            onClick={handleBack}
            type="button"
          >
            <GameIcon name="back" size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <div className="flex-1">
          <h1 className="text-game-title text-[var(--color-game-accent)]">{title}</h1>
          {subtitle ? <p className="text-game-muted">{subtitle}</p> : null}
        </div>
        <div className={cn('flex shrink-0 items-center justify-end', !action && 'w-10')}>
          {action}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
