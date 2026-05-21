import GameIcon from '@/js/components/game/GameIcon';
import PixelCard from '@/js/components/ui/PixelCard';
import type { WorkoutTeamRewards } from '@/js/api/types.gen';
import { cn } from '@/js/lib/utils';

type TeamWorkoutRewardsCardProps = {
  rewards: WorkoutTeamRewards;
  className?: string;
};

const TeamWorkoutRewardsCard = ({ rewards, className }: TeamWorkoutRewardsCardProps) => {
  if (rewards.empty_team) {
    return (
      <PixelCard className={cn('border-[var(--color-game-info)]', className)}>
        <p className="text-game-title text-[var(--color-game-info)]">Time vazio</p>
        <p className="mt-1 text-sm text-[var(--color-game-muted)]">
          Coloque Pokémon no time (até 6) para ganhar XP e carinho ao treinar.
        </p>
      </PixelCard>
    );
  }

  if (rewards.gains.length === 0) {
    return null;
  }

  return (
    <PixelCard className={cn('border-[var(--color-game-success)]', className)}>
      <p className="text-game-title text-[var(--color-game-success)]">Time ganhou experiência!</p>
      <ul className="mt-3 space-y-2">
        {rewards.gains.map((gain) => {
          const leveledUp = gain.level_after > gain.level_before;
          return (
            <li
              key={gain.pokemon_id}
              className="border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{gain.display_name}</span>
                <span className="text-[10px] text-[var(--color-game-muted)]">
                  +{gain.xp_added} XP · +{gain.affection_added} ♥
                </span>
              </div>
              {leveledUp ? (
                <p className="mt-1 text-xs text-[var(--color-game-accent)]">
                  Subiu para o nível {gain.level_after}!
                </p>
              ) : null}
              {gain.evolved && gain.evolved_to ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-game-success)]">
                  <GameIcon name="capture" size={14} />
                  Evoluiu para {gain.evolved_to.species_name}!
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </PixelCard>
  );
};

export default TeamWorkoutRewardsCard;
