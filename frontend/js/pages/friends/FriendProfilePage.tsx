import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import CalendarGrid from '@/js/components/calendar/CalendarGrid';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import TimelineEventCard from '@/js/components/timeline/TimelineEventCard';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { LoadingCardSkeleton, PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { buildMonthGrid, fetchUserCalendar, localDateIso } from '@/js/lib/calendar';
import { fetchUserTimeline } from '@/js/lib/timeline';

const FriendProfilePage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState<'timeline' | 'calendar'>('timeline');

  const timelineQuery = useQuery({
    queryKey: ['timeline', userId],
    queryFn: () => fetchUserTimeline(userId),
    enabled: Number.isFinite(userId) && tab === 'timeline',
  });

  const calendarQuery = useQuery({
    queryKey: ['calendar', userId, year, month],
    queryFn: () => fetchUserCalendar(userId, year, month),
    enabled: Number.isFinite(userId) && tab === 'calendar',
  });

  const profileUser = timelineQuery.data?.user ?? calendarQuery.data?.user;
  const displayName = profileUser?.display_name ?? 'Amigo';
  const cells = useMemo(
    () => buildMonthGrid(year, month, calendarQuery.data?.days),
    [calendarQuery.data?.days, year, month],
  );

  return (
    <>
      <MobileHeader
        action={
          profileUser ? (
            <TrainerAvatar
              alt={displayName}
              size="xs"
              slug={profileUser.trainer_sprite}
              src={profileUser.trainer_sprite_url}
            />
          ) : null
        }
        backTo="/friends"
        subtitle="Perfil"
        title={displayName}
      />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar
          visible={
            tab === 'timeline'
              ? isQueryRefetching(timelineQuery)
              : isQueryRefetching(calendarQuery)
          }
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            className={`pixel-btn min-h-10 ${tab === 'timeline' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
            onClick={() => setTab('timeline')}
            type="button"
          >
            Timeline
          </button>
          <button
            className={`pixel-btn min-h-10 ${tab === 'calendar' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
            onClick={() => setTab('calendar')}
            type="button"
          >
            Jornada
          </button>
        </div>

        {tab === 'timeline' ? (
          timelineQuery.isPending ? (
            <PageLoading label="Carregando timeline..." />
          ) : (
            <div className="space-y-3">
              {(timelineQuery.data?.results ?? []).map((event, index) => (
                <TimelineEventCard
                  key={`${event.type}-${event.at}-${index}`}
                  event={event}
                  showActor={false}
                />
              ))}
            </div>
          )
        ) : calendarQuery.isPending ? (
          <div className="space-y-3">
            <LoadingCardSkeleton lines={2} />
            <LoadingCardSkeleton lines={4} />
          </div>
        ) : (
          <>
            <PixelCard>
              <p className="text-game-label text-[var(--color-game-muted)]">Streak</p>
              <p className="text-xl font-bold text-[var(--color-game-accent)]">
                {calendarQuery.data?.streak_current ?? 0}
              </p>
            </PixelCard>
            <PixelCard className={calendarQuery.isFetching ? 'opacity-60 transition-opacity' : undefined}>
              <CalendarGrid
                cells={cells}
                selectedDate={null}
                todayIso={localDateIso(now)}
                onSelectDay={() => {}}
              />
            </PixelCard>
          </>
        )}
      </main>
    </>
  );
};

export default FriendProfilePage;
