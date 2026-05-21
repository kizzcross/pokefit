import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { capturePokemon } from '@/js/lib/api';
import { declineEncounter } from '@/js/lib/encounter';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import { formatRarity } from '@/js/lib/utils';
import { useGameStore } from '@/js/stores/game-store';

const CapturePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const encounter = useGameStore((s) => s.encounter);
  const clearEncounter = useGameStore((s) => s.clearEncounter);
  const setLastCaptureId = useGameStore((s) => s.setLastCaptureId);
  const species = encounter.species;
  const workoutId = encounter.workoutId;

  const captureMutation = useMutation({
    mutationFn: async () => {
      if (!species?.id || !workoutId) throw new Error('missing encounter');
      return capturePokemon({
        species_id: species.id,
        source_workout_id: workoutId,
      });
    },
    onSuccess: (pokemon) => {
      queryClient.invalidateQueries({ queryKey: ['my-pokemon'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'pending-encounter'] });
      clearEncounter();
      setLastCaptureId(pokemon?.id ?? null);
      navigate('/capture/success', { state: { pokemon } });
    },
  });

  const fleeMutation = useMutation({
    mutationFn: async () => {
      if (!workoutId) throw new Error('missing workout');
      return declineEncounter(workoutId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'pending-encounter'] });
      clearEncounter();
      navigate('/');
    },
  });

  if (!species || !workoutId) {
    return (
      <>
        <MobileHeader backTo="/" title="Captura" />
        <main className="px-4 pb-28 pt-8">
          <PixelCard>
            <p className="text-sm">Nenhum encontro ativo.</p>
            <PixelButton className="mt-4" fullWidth onClick={() => navigate('/encounter')}>
              Ver encontros
            </PixelButton>
          </PixelCard>
        </main>
      </>
    );
  }

  const image = resolvePokemonSpriteUrl(species);
  const errorMessage =
    (captureMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    (fleeMutation.error ? 'Não foi possível fugir.' : null);

  return (
    <>
      <MobileHeader backTo="/encounter" title="Captura" />
      <main className="px-4 pb-28 pt-4">
        <motion.div
          animate={{ rotate: [0, -2, 2, 0], y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <PixelCard className="text-center">
            <p className="text-game-title text-[var(--color-game-accent)]">{species.name}</p>
            <div className="my-4">
              <PokemonSprite alt={species.name} pokedexId={species.pokedex_id} size="lg" src={image} />
            </div>
            <p className="text-sm capitalize text-[var(--color-game-muted)]">
              {species.type_1}
              {species.type_2 ? ` / ${species.type_2}` : ''}
            </p>
            <p className="mt-2 text-xs">Raridade: {formatRarity(species.rarity)}</p>
          </PixelCard>
        </motion.div>

        <div className="mt-4 grid gap-3">
          <PixelButton
            disabled={captureMutation.isPending || fleeMutation.isPending}
            fullWidth
            onClick={() => captureMutation.mutate()}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <GameIcon name="capture" size={18} />
              {captureMutation.isPending ? 'Capturando...' : 'Capturar!'}
            </span>
          </PixelButton>
          <PixelButton
            disabled={captureMutation.isPending || fleeMutation.isPending}
            fullWidth
            onClick={() => fleeMutation.mutate()}
            variant="secondary"
          >
            {fleeMutation.isPending ? 'Fugindo...' : 'Fugir'}
          </PixelButton>
        </div>

        {errorMessage ? <p className="mt-3 text-sm text-[var(--color-game-danger)]">{errorMessage}</p> : null}
      </main>
    </>
  );
};

export default CapturePage;
