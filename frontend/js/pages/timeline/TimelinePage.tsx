import { useQuery } from '@tanstack/react-query';

import TimelineEventCard from '@/js/components/timeline/TimelineEventCard';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { fetchMyTimeline } from '@/js/lib/timeline';

const TimelinePage = () => {
  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: ['timeline', 'me'],
    queryFn: fetchMyTimeline,
  });

  const events = data?.results ?? [];

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
        title="Timeline"
        subtitle="Você e seus amigos"
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

        <QueryRefetchBar className="mb-2" visible={isQueryRefetching({ isPending, isFetching, data })} />

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
          events.map((event, index) => (
            <TimelineEventCard
              key={`${event.type}-${event.actor.id}-${event.at}-${index}`}
              event={event}
              showActor
            />
          ))
        )}
      </main>
    </>
  );
};

export default TimelinePage;
