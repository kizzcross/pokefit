import { Link } from 'react-router';

import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import { cn } from '@/js/lib/utils';

export type UserLinkData = {
  id: number;
  display_name?: string | null;
  nickname?: string | null;
  trainer_sprite?: string | null;
  trainer_sprite_url?: string | null;
};

type Props = {
  user: UserLinkData | null | undefined;
  className?: string;
  showAvatar?: boolean;
  avatarSize?: 'xs' | 'sm' | 'md';
  fallbackLabel?: string;
};

export const userProfilePath = (userId: number) => `/users/${userId}`;

const UserLink = ({
  user,
  className,
  showAvatar = false,
  avatarSize = 'xs',
  fallbackLabel = 'Treinador',
}: Props) => {
  const label = user?.display_name || user?.nickname || fallbackLabel;
  if (!user || !Number.isFinite(user.id)) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link
      className={cn(
        'inline-flex items-center gap-2 font-semibold text-[var(--color-game-info)] no-underline hover:underline',
        className,
      )}
      to={userProfilePath(user.id)}
    >
      {showAvatar ? (
        <TrainerAvatar
          alt={label}
          size={avatarSize}
          slug={user.trainer_sprite ?? undefined}
          src={user.trainer_sprite_url ?? undefined}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
};

export default UserLink;
