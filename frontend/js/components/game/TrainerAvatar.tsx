import { cn } from '@/js/lib/utils';
import { trainerSpriteUrl } from '@/js/lib/trainer-sprites';

type TrainerAvatarProps = {
  slug?: string | null;
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  xs: 'h-9 w-9 border-2',
  sm: 'h-12 w-12 border-[3px]',
  md: 'h-16 w-16 border-4',
  lg: 'h-24 w-24 border-4',
};

const TrainerAvatar = ({
  slug,
  src,
  alt = 'Treinador',
  size = 'sm',
  className,
}: TrainerAvatarProps) => {
  const imageSrc = src ?? trainerSpriteUrl(slug);

  return (
    <div
      className={cn(
        'flex shrink-0 items-end justify-center overflow-hidden border-[var(--color-game-border)] bg-[var(--color-game-bg-light)]',
        sizeMap[size],
        className,
      )}
    >
      {imageSrc ? (
        <img
          alt={alt}
          className="h-[85%] w-[85%] object-contain object-bottom"
          src={imageSrc}
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <span className="pb-1 text-[10px] font-bold text-[var(--color-game-muted)]">?</span>
      )}
    </div>
  );
};

export default TrainerAvatar;
