import StatBar from '@/js/components/game/StatBar';
import {
  evolutionRequirementLabel,
  type PokemonProgressFields,
} from '@/js/lib/pokemon-progress';
import { cn } from '@/js/lib/utils';

type PokemonProgressBarsProps = {
  pokemon: PokemonProgressFields;
  compact?: boolean;
  className?: string;
};

const PokemonProgressBars = ({ pokemon, compact = false, className }: PokemonProgressBarsProps) => {
  const xpPercent = pokemon.experience_progress_percent ?? 0;
  const affectionPercent = pokemon.affection_progress_percent ?? 0;
  const affectionMax = pokemon.affection_max ?? 255;
  const xpToNext = pokemon.experience_to_next_level;
  const atMaxLevel = xpToNext == null;
  const nextEvolution = pokemon.next_evolution;
  const reqLabel = evolutionRequirementLabel(nextEvolution);

  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-[var(--color-game-muted)]">
          <span>Experiência</span>
          <span className="text-[var(--color-game-accent)]">
            Lv. {pokemon.level ?? 1}
            {!atMaxLevel && xpToNext != null ? ` · ${xpToNext} XP` : atMaxLevel ? ' · MAX' : ''}
          </span>
        </div>
        <StatBar
          color="bg-[var(--color-game-accent)]"
          label="XP"
          max={100}
          value={xpPercent}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-[var(--color-game-muted)]">
          <span>Carinho</span>
          <span>
            {pokemon.affection ?? 0}/{affectionMax}
          </span>
        </div>
        <StatBar
          color="bg-[var(--color-game-info)]"
          label=""
          max={100}
          value={affectionPercent}
        />
      </div>

      {!compact && nextEvolution ? (
        <p className="text-[10px] text-[var(--color-game-muted)]">
          Próxima evolução:{' '}
          <span className="font-semibold text-[var(--color-game-text)]">
            {nextEvolution.species_name}
          </span>
          {reqLabel ? ` (${reqLabel})` : null}
          {pokemon.can_evolve ? (
            <span className="ml-1 text-[var(--color-game-success)]">· pronto!</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
};

export default PokemonProgressBars;
