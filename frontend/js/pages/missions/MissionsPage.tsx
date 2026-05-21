import { motion } from 'framer-motion';

import GameIcon from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';

const missions = [
  { id: 1, title: 'Primeiro treino', progress: 0, target: 1, reward: '+50 XP' },
  { id: 2, title: 'Capturar 3 Pokémon', progress: 0, target: 3, reward: 'Ovo raro' },
  { id: 3, title: 'Montar time completo', progress: 0, target: 6, reward: 'Badge Ouro' },
];

const MissionsPage = () => {
  return (
    <>
      <MobileHeader backTo="/more" title="Missões" />
      <main className="space-y-3 px-4 pb-28 pt-4">
        {missions.map((mission, index) => (
          <motion.div
            key={mission.id}
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -12 }}
            transition={{ delay: index * 0.05 }}
          >
            <PixelCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-game-title text-[var(--color-game-info)]">
                    <GameIcon name="missions" size={18} />
                    {mission.title}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-game-muted)]">
                    {mission.progress}/{mission.target}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--color-game-accent)]">{mission.reward}</span>
              </div>
              <div className="mt-3 h-3 border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
                <div
                  className="h-full bg-[var(--color-game-info)]"
                  style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                />
              </div>
              <PixelButton className="mt-3" disabled fullWidth variant="secondary">
                Em breve
              </PixelButton>
            </PixelCard>
          </motion.div>
        ))}
      </main>
    </>
  );
};

export default MissionsPage;
