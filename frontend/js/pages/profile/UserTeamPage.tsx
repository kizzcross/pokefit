import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import PokemonSprite from '@/js/components/game/PokemonSprite';
import StatBar from '@/js/components/game/StatBar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { LoadingCardSkeleton } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import { fetchUserProfile, fetchUserTeam } from '@/js/lib/profile';

const UserTeamPage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const isValidId = Number.isFinite(userId);

  const profileQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: isValidId,
    retry: false,
  });

  const teamQuery = useQuery({
    queryKey: ['user-team', userId],
    queryFn: () => fetchUserTeam(userId),
    enabled: isValidId && Boolean(profileQuery.data),
  });

  const backTo = `/users/${id}`;
  const title = profileQuery.data?.user.display_name
    ? `Time de ${profileQuery.data.user.display_name}`
    : 'Time ativo';
  const team = teamQuery.data?.results ?? [];

  if (profileQuery.isError) {
    return (
      <>
        <MobileHeader backTo="/friends" title="Time" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard className="border-[var(--color-game-danger)]">
            <p className="text-sm text-[var(--color-game-danger)]">
              Você não tem permissão para ver este time.
            </p>
          </PixelCard>
        </main>
      </>
    );
  }

  return (
    <>
      <MobileHeader backTo={backTo} title={title} />
      <main className="space-y-4 px-4 pb-28 pt-4">
        {teamQuery.isPending ? (
          <LoadingCardSkeleton lines={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => {
              const slot = index + 1;
              const member = team.find((p) => p.active_team_slot === slot);
              const image = resolvePokemonSpriteUrl(member?.species);
              return (
                <PixelCard key={slot} className="text-center">
                  <p className="text-[10px] text-[var(--color-game-muted)]">Slot {slot}</p>
                  <div className="my-2">
                    <PokemonSprite
                      alt={member?.display_name ?? 'empty'}
                      pokedexId={member?.species?.pokedex_id}
                      size="sm"
                      src={image}
                    />
                  </div>
                  <p className="text-xs font-semibold">{member?.display_name ?? 'Vazio'}</p>
                  {member ? (
                    <>
                      <p className="text-[10px] text-[var(--color-game-muted)]">
                        Lv. {member.level}
                      </p>
                      <div className="mt-1 px-1">
                        <StatBar
                          color="bg-[var(--color-game-accent)]"
                          label="XP"
                          max={100}
                          value={member.experience_progress_percent ?? 0}
                        />
                      </div>
                    </>
                  ) : null}
                </PixelCard>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};

export default UserTeamPage;
