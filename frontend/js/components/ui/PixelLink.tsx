import { Link, type LinkProps } from 'react-router';

import { cn } from '@/js/lib/utils';

type PixelLinkProps = LinkProps & {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
};

const PixelLink = ({ className, variant = 'primary', fullWidth, children, ...props }: PixelLinkProps) => {
  return (
    <Link
      className={cn(
        'pixel-btn inline-flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-center no-underline',
        variant === 'primary' && 'pixel-btn-primary',
        variant === 'secondary' && 'pixel-btn-secondary',
        variant === 'danger' && 'bg-[var(--color-game-danger)] text-white',
        fullWidth && 'flex w-full',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
};

export default PixelLink;
