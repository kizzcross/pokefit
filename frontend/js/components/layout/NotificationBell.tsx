import { Link } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import PixelBadge from '@/js/components/ui/PixelBadge';
import { useAppNotifications } from '@/js/hooks/useAppNotifications';
import { cn } from '@/js/lib/utils';

type NotificationBellProps = {
  className?: string;
  to?: string;
};

const NotificationBell = ({ className, to = '/gifts' }: NotificationBellProps) => {
  const { giftCount } = useAppNotifications();

  return (
    <Link
      aria-label={
        giftCount > 0
          ? `Caixa de entrada: ${giftCount} presente${giftCount === 1 ? '' : 's'} pendente${giftCount === 1 ? '' : 's'}`
          : 'Caixa de entrada'
      }
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[var(--color-game-border)] bg-[var(--color-game-panel)] text-[var(--color-game-accent)] transition hover:border-[var(--color-game-accent)] hover:bg-[var(--color-game-bg-light)]',
        giftCount > 0 && 'border-[var(--color-game-danger)] text-[var(--color-game-danger)]',
        className,
      )}
      to={to}
    >
      <GameIcon name="bell" size={20} />
      <PixelBadge count={giftCount} />
    </Link>
  );
};

export default NotificationBell;
