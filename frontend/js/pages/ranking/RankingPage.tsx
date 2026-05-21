import GameIcon from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelCard from '@/js/components/ui/PixelCard';

const mockRanking = [
  { rank: 1, name: 'Ash K.', points: 4200 },
  { rank: 2, name: 'Misty', points: 3900 },
  { rank: 3, name: 'Brock', points: 3600 },
  { rank: 4, name: 'Você', points: 1200, me: true },
];

const RankingPage = () => {
  return (
    <>
      <MobileHeader backTo="/more" title="Ranking" />
      <main className="space-y-3 px-4 pb-28 pt-4">
        <PixelCard>
          <p className="text-sm text-[var(--color-game-muted)]">
            Ranking global em breve. Por enquanto, preview local.
          </p>
        </PixelCard>
        {mockRanking.map((entry) => (
          <PixelCard
            key={entry.rank}
            className={entry.me ? 'border-[var(--color-game-accent)]' : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {entry.rank <= 3 ? (
                  <GameIcon
                    className={
                      entry.rank === 1
                        ? 'text-[var(--color-game-accent)]'
                        : entry.rank === 2
                          ? 'text-[#b8c4e8]'
                          : 'text-[#c9a227]'
                    }
                    name="ranking"
                    size={22}
                  />
                ) : (
                  <span className="text-game-title text-[var(--color-game-accent)]">#{entry.rank}</span>
                )}
                <span className="font-semibold">{entry.name}</span>
              </div>
              <span className="text-sm">{entry.points} pts</span>
            </div>
          </PixelCard>
        ))}
      </main>
    </>
  );
};

export default RankingPage;
