import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/js/lib/utils';

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
};

const PixelButton = ({
  className,
  variant = 'primary',
  fullWidth,
  children,
  ...props
}: PixelButtonProps) => {
  return (
    <button
      className={cn(
        'pixel-btn min-h-12 px-4 py-3 disabled:opacity-50 disabled:pointer-events-none',
        variant === 'primary' && 'pixel-btn-primary',
        variant === 'secondary' && 'pixel-btn-secondary',
        variant === 'danger' && 'bg-[var(--color-game-danger)] text-white',
        fullWidth && 'w-full',
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
};

export default PixelButton;
