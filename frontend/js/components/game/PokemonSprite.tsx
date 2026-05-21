import { useEffect, useState } from 'react';

import { defaultPixelSpriteUrl } from '@/js/lib/pokemon-sprites';
import { cn } from '@/js/lib/utils';

type PokemonSpriteProps = {
  src?: string | null;
  pokedexId?: number;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeStyles = {
  xs: {
    box: 'h-10 w-10 border-2 p-0.5',
    img: 'p-0',
  },
  sm: {
    box: 'h-20 w-20 border-4 p-1',
    img: 'p-0.5',
  },
  md: {
    box: 'h-28 w-28 border-4 p-1.5',
    img: 'p-1',
  },
  lg: {
    box: 'h-40 w-40 border-4 p-2',
    img: 'p-1.5',
  },
} as const;

const PokemonSprite = ({ src, pokedexId, alt, size = 'md', className }: PokemonSpriteProps) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const displaySrc = imgSrc ?? src;
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'mx-auto flex shrink-0 items-center justify-center border-[var(--color-game-border)] bg-[var(--color-game-bg-light)]',
        styles.box,
        className,
      )}
    >
      {displaySrc ? (
        <img
          alt={alt}
          className={cn('h-full w-full object-contain', styles.img)}
          onError={() => {
            if (pokedexId) {
              setImgSrc(defaultPixelSpriteUrl(pokedexId));
            }
          }}
          src={displaySrc}
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <span className="text-game-label text-[var(--color-game-muted)]">?</span>
      )}
    </div>
  );
};

export default PokemonSprite;
