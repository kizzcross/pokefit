import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import GameIcon from '@/js/components/game/GameIcon';

type ImageLightboxProps = {
  src: string;
  alt?: string;
  caption?: string | null;
  onClose: () => void;
};

const ImageLightbox = ({ src, alt = '', caption, onClose }: ImageLightboxProps) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
    >
      <button
        aria-label="Fechar"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg-light)] text-[var(--color-game-text)] transition hover:border-[var(--color-game-accent)]"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        type="button"
      >
        <GameIcon name="back" size={18} />
      </button>
      <img
        alt={alt}
        className="max-h-[85vh] max-w-full border-4 border-[var(--color-game-border)] object-contain"
        onClick={(event) => event.stopPropagation()}
        src={src}
      />
      {caption ? (
        <p
          className="mt-3 max-w-2xl text-center text-sm italic text-white"
          onClick={(event) => event.stopPropagation()}
        >
          {caption}
        </p>
      ) : null}
    </div>,
    document.body,
  );
};

export default ImageLightbox;
