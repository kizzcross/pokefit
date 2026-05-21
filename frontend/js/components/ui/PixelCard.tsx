import { HTMLAttributes } from 'react';

import { cn } from '@/js/lib/utils';

const PixelCard = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('pixel-panel rounded-sm p-4', className)} {...props}>
      {children}
    </div>
  );
};

export default PixelCard;
