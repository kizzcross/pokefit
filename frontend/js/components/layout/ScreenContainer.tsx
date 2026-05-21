import { HTMLAttributes } from 'react';

import { cn } from '@/js/lib/utils';

const ScreenContainer = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('mx-auto w-full max-w-md bg-[var(--color-game-bg)]', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default ScreenContainer;
