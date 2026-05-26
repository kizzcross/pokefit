import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import MobileHeader from '@/js/components/layout/MobileHeader';
import TimelineEventCard from '@/js/components/timeline/TimelineEventCard';
import { LoadingCardSkeleton, PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { fetchMyTimeline, type TimelineFeedPage } from '@/js/lib/timeline';

const PAGE_SIZE = 6;

const TimelinePage = () => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['timeline', 'me', 'infinite'],
    queryFn: ({ pageParam }) =>
      fetchMyTimeline({ before: pageParam ?? undefined, limit: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TimelineFeedPage) => lastPage.next_cursor ?? undefined,
  });

  const events = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.results),
    [data],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '300px 0px 0px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, events.length]);

  return (
    <>
      <MobileHeader
        action={
          <button
            className="text-[10px] text-[var(--color-game-muted)]"
            disabled={isFetching}
            onClick={() => refetch()}
            type="button"
          >
            Atualizar
          </button>
        }
        backTo="/calendar"
        subtitle="Você e seus amigos"
        title="Timeline"
      />
      <main className="space-y-3 px-4 pb-28 pt-4">
        <PixelCard>
          <p className="text-sm text-[var(--color-game-muted)]">
            Treinos finalizados e capturas seus e dos seus amigos, em ordem cronológica.
          </p>
          <PixelLink className="mt-3" fullWidth to="/friends" variant="secondary">
            Ver amigos
          </PixelLink>
        </PixelCard>

        <QueryRefetchBar
          className="mb-2"
          visible={isQueryRefetching({ isPending, isFetching, data })}
        />

        {isPending ? (
          <PageLoading label="Carregando timeline..." />
        ) : events.length === 0 ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-muted)]">
              Nenhum evento ainda. Finalize um treino com foto de prova!
            </p>
            <PixelLink className="mt-3" fullWidth to="/workout/new">
              Iniciar treino
            </PixelLink>
          </PixelCard>
        ) : (
          <>
            {events.map((event, index) => (
              <TimelineEventCard
                key={`${event.type}-${event.actor.id}-${event.at}-${index}`}
                event={event}
                showActor
              />
            ))}

            <div ref={loadMoreRef} className="h-1" />

            {isFetchingNextPage ? (
              <LoadingCardSkeleton lines={2} />
            ) : !hasNextPage ? (
              <p className="py-4 text-center text-[10px] text-[var(--color-game-muted)]">
                — fim da timeline —
              </p>
            ) : null}
          </>
        )}
      </main>
    </>
  );
};

export default TimelinePage;
