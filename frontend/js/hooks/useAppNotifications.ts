import { useQuery } from '@tanstack/react-query';

import { fetchPendingEncounter } from '@/js/lib/encounter';
import { fetchGiftPendingCount } from '@/js/lib/gifts';
import { fetchInteractionsNotifications } from '@/js/lib/interactions';
import { fetchFriendRequests } from '@/js/lib/social';

export type AppNotifications = {
  total: number;
  giftCount: number;
  hasPendingEncounter: boolean;
  friendRequestCount: number;
  interactionsCount: number;
  isLoading: boolean;
};

export function useAppNotifications(): AppNotifications {
  const giftQuery = useQuery({
    queryKey: ['gifts', 'pending-count'],
    queryFn: fetchGiftPendingCount,
  });

  const encounterQuery = useQuery({
    queryKey: ['workouts', 'pending-encounter'],
    queryFn: fetchPendingEncounter,
  });

  const friendsQuery = useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: fetchFriendRequests,
  });

  const interactionsQuery = useQuery({
    queryKey: ['notifications', 'interactions'],
    queryFn: fetchInteractionsNotifications,
  });

  const giftCount = giftQuery.data ?? 0;
  const hasPendingEncounter = Boolean(encounterQuery.data);
  const friendRequestCount = friendsQuery.data?.incoming?.length ?? 0;
  const interactionsCount = interactionsQuery.data?.count ?? 0;
  const total =
    giftCount +
    (hasPendingEncounter ? 1 : 0) +
    friendRequestCount +
    interactionsCount;

  return {
    total,
    giftCount,
    hasPendingEncounter,
    friendRequestCount,
    interactionsCount,
    isLoading:
      giftQuery.isPending ||
      encounterQuery.isPending ||
      friendsQuery.isPending ||
      interactionsQuery.isPending,
  };
}
