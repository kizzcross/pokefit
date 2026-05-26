import { cn } from '@/js/lib/utils';

type Props = {
  className?: string;
};

const PokemonDisclaimer = ({ className }: Props) => {
  return (
    <p
      className={cn(
        'mx-auto max-w-md px-2 text-center text-[10px] leading-relaxed text-[var(--color-game-muted)]/70',
        className,
      )}
    >
      This is a personal, non-commercial fan project and is not affiliated with, endorsed, or
      sponsored by The Pokémon Company, Nintendo, Game Freak, or Creatures Inc. Pokémon and all
      related intellectual property belong to their respective owners.
    </p>
  );
};

export default PokemonDisclaimer;
