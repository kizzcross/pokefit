import { Link } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import PixelCard from '@/js/components/ui/PixelCard';
import { useAuth } from '@/js/hooks/useAuth';
import type { TimelineEvent } from '@/js/lib/timeline';
import { workoutTypeLabel } from '@/js/lib/workout-labels';

type TimelineEventCardProps = {
  event: TimelineEvent;
  showActor?: boolean;
};

const formatWhen = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TimelineEventCard = ({ event, showActor = false }: TimelineEventCardProps) => {
  const { user } = useAuth();
  const isOwnEvent = user?.id === event.actor.id;

  if (event.type === 'pokemon_captured' && event.pokemon) {
    return (
      <PixelCard className="border-[var(--color-game-success)]">
        {showActor ? (
          <div className="mb-2 flex items-center gap-2">
            <TrainerAvatar
              alt={event.actor.display_name}
              size="xs"
              slug={event.actor.trainer_sprite}
              src={event.actor.trainer_sprite_url}
            />
            <p className="text-xs text-[var(--color-game-muted)]">{event.actor.display_name}</p>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <PokemonSprite
            alt={event.pokemon.display_name}
            pokedexId={event.pokemon.species_pokedex_id}
            size="sm"
            src={event.pokemon.species_sprite}
          />
          <div className="min-w-0 flex-1">
            <p className="text-game-label text-[var(--color-game-success)]">Captura</p>
            <p className="font-semibold">{event.pokemon.display_name}</p>
            <p className="text-xs text-[var(--color-game-muted)]">{formatWhen(event.at)}</p>
          </div>
          {event.pokemon.shiny ? <GameIcon name="shiny" size={18} /> : null}
        </div>
      </PixelCard>
    );
  }

  const workout = event.workout;
  if (!workout) return null;

  return (
    <PixelCard>
      {showActor ? (
        <div className="mb-2 flex items-center gap-2">
          <TrainerAvatar
            alt={event.actor.display_name}
            size="xs"
            slug={event.actor.trainer_sprite}
            src={event.actor.trainer_sprite_url}
          />
          <p className="text-xs text-[var(--color-game-muted)]">{event.actor.display_name}</p>
        </div>
      ) : null}
      <div className="flex gap-3">
        {workout.proof_photo_url ? (
          <img
            alt=""
            className="h-16 w-16 shrink-0 border-4 border-[var(--color-game-border)] object-cover"
            src={workout.proof_photo_url}
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
            <GameIcon name="workout" size={28} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-game-title text-[var(--color-game-accent)]">
            {workoutTypeLabel(workout.workout_type)}
          </p>
          <p className="text-xs text-[var(--color-game-muted)]">{formatWhen(event.at)}</p>
          {workout.total_volume ? (
            <p className="mt-1 text-sm">Vol. {workout.total_volume}</p>
          ) : null}
          {workout.proof_caption ? (
            <p className="mt-1 text-xs italic text-[var(--color-game-muted)]">{workout.proof_caption}</p>
          ) : null}
          {event.encounter?.species_name ? (
            <div className="mt-2 flex items-center gap-2">
              <PokemonSprite
                alt={event.encounter.species_name}
                pokedexId={event.encounter.species_pokedex_id}
                size="xs"
                className="!mx-0"
                src={event.encounter.species_sprite}
              />
              <span className="text-xs">
                {event.encounter.captured ? 'Capturado' : 'Encontro'}: {event.encounter.species_name}
              </span>
            </div>
          ) : null}
          {isOwnEvent ? (
            <Link
              className="mt-2 inline-block text-[10px] font-bold uppercase text-[var(--color-game-info)] no-underline"
              to={`/workout/${workout.id}`}
            >
              Ver treino
            </Link>
          ) : (
            <Link
              className="mt-2 inline-block text-[10px] font-bold uppercase text-[var(--color-game-info)] no-underline"
              to={`/friends/${event.actor.id}`}
            >
              Ver perfil
            </Link>
          )}
        </div>
      </div>
    </PixelCard>
  );
};

export default TimelineEventCard;
