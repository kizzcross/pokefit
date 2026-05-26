import { useState } from 'react';
import { Link } from 'react-router';

import type { TimelineEvent } from '@/js/lib/timeline';

import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import { userProfilePath } from '@/js/components/social/UserLink';
import WorkoutInteractions from '@/js/components/timeline/WorkoutInteractions';
import ImageLightbox from '@/js/components/ui/ImageLightbox';
import PixelCard from '@/js/components/ui/PixelCard';
import { useAuth } from '@/js/hooks/useAuth';
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const actorHeader = showActor ? (
    <Link
      className="mb-2 flex items-center gap-2 no-underline"
      to={userProfilePath(event.actor.id)}
    >
      <TrainerAvatar
        alt={event.actor.display_name}
        size="xs"
        slug={event.actor.trainer_sprite}
        src={event.actor.trainer_sprite_url}
      />
      <p className="text-xs font-semibold text-[var(--color-game-info)] hover:underline">
        {event.actor.display_name}
      </p>
    </Link>
  ) : null;

  if (event.type === 'pokemon_captured' && event.pokemon) {
    return (
      <PixelCard className="border-[var(--color-game-success)]">
        {actorHeader}
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
      {actorHeader}
      <div className="flex gap-3">
        {workout.proof_photo_url ? (
          <button
            aria-label="Ver foto em tamanho grande"
            className="h-16 w-16 shrink-0 cursor-zoom-in border-4 border-[var(--color-game-border)] p-0 transition hover:border-[var(--color-game-accent)]"
            onClick={() => setLightboxOpen(true)}
            type="button"
          >
            <img
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              src={workout.proof_photo_url}
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
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
              to={userProfilePath(event.actor.id)}
            >
              Ver perfil
            </Link>
          )}
        </div>
      </div>
      <WorkoutInteractions workoutId={workout.id} />

      {lightboxOpen && workout.proof_photo_url ? (
        <ImageLightbox
          alt={`Foto de ${event.actor.display_name}`}
          caption={workout.proof_caption ?? null}
          onClose={() => setLightboxOpen(false)}
          src={workout.proof_photo_url}
        />
      ) : null}
    </PixelCard>
  );
};

export default TimelineEventCard;
