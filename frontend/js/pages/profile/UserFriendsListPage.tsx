import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import MobileHeader from '@/js/components/layout/MobileHeader';
import UserLink from '@/js/components/social/UserLink';
import { LoadingCardSkeleton } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { fetchUserFriends, fetchUserProfile } from '@/js/lib/profile';

const UserFriendsListPage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const isValidId = Number.isFinite(userId);

  const profileQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: isValidId,
    retry: false,
  });

  const friendsQuery = useQuery({
    queryKey: ['user-friends', userId],
    queryFn: () => fetchUserFriends(userId),
    enabled: isValidId && Boolean(profileQuery.data),
  });

  const backTo = `/users/${id}`;
  const title = profileQuery.data?.user.display_name
    ? `Amigos de ${profileQuery.data.user.display_name}`
    : 'Amigos';
  const friends = friendsQuery.data ?? [];

  if (profileQuery.isError) {
    return (
      <>
        <MobileHeader backTo="/friends" title="Amigos" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard className="border-[var(--color-game-danger)]">
            <p className="text-sm text-[var(--color-game-danger)]">
              Você não tem permissão para ver esta lista de amigos.
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
        <PixelCard>
          <p className="text-sm text-[var(--color-game-muted)]">
            {friendsQuery.isPending ? '...' : `${friends.length} amigos`}
          </p>
        </PixelCard>

        {friendsQuery.isPending ? (
          <LoadingCardSkeleton lines={3} />
        ) : friends.length === 0 ? (
          <PixelCard>
            <p className="text-xs text-[var(--color-game-muted)]">
              Esse treinador ainda não tem amigos.
            </p>
          </PixelCard>
        ) : (
          <PixelCard>
            <ul className="space-y-2">
              {friends.map((friend) => (
                <li key={friend.id}>
                  <UserLink
                    avatarSize="xs"
                    className="w-full rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm"
                    showAvatar
                    user={friend}
                  />
                </li>
              ))}
            </ul>
          </PixelCard>
        )}
      </main>
    </>
  );
};

export default UserFriendsListPage;
