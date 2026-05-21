import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
import { PageLoading } from '@/js/components/ui/GameLoading';
import TeamWorkoutRewardsCard from '@/js/components/pokemon/TeamWorkoutRewardsCard';
import { fetchPendingEncounter } from '@/js/lib/encounter';
import type { WorkoutTeamRewards } from '@/js/api/types.gen';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import { useGameStore } from '@/js/stores/game-store';

type LocationState = {
  workoutId?: number;
  species?: import('@/js/api/types.gen').PokemonSpecies;
  encounterLevel?: number | null;
  weeklyGoalReward?: boolean;
  teamRewards?: WorkoutTeamRewards;
};

const EncounterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? {};
  const setEncounter = useGameStore((s) => s.setEncounter);
  const stored = useGameStore((s) => s.encounter);

  const pendingQuery = useQuery({
    queryKey: ['workouts', 'pending-encounter'],
    queryFn: fetchPendingEncounter,
    enabled: !state.species,
  });

  const pending = pendingQuery.data;
  const species = state.species ?? pending?.species ?? stored.species;
  const workoutId = state.workoutId ?? pending?.workout_id ?? stored.workoutId;
  const encounterLevel =
    state.encounterLevel ?? pending?.encounter_level ?? stored.encounterLevel ?? null;
  const weeklyGoalReward =
    state.weeklyGoalReward ?? pending?.weekly_goal_reward ?? false;

  useEffect(() => {
    if (species && workoutId) {
      setEncounter(species, workoutId, encounterLevel);
    }
  }, [species, workoutId, encounterLevel, setEncounter]);

  const image = species ? resolvePokemonSpriteUrl(species) : null;

  if (pendingQuery.isPending && !species) {
    return (
      <>
        <MobileHeader backTo="/" title="Encontro selvagem" />
        <main className="px-4 pb-28 pt-8">
          <PageLoading label="Buscando encontro..." />
        </main>
      </>
    );
  }

  if (!pendingQuery.isPending && !species) {
    return (
      <>
        <MobileHeader backTo="/" title="Encontro selvagem" />
        <main className="px-4 pb-28 pt-8">
          <PixelCard className="text-center">
            <GameIcon className="mx-auto text-[var(--color-game-muted)]" name="workout" size={32} />
            <p className="mt-4 text-game-title text-[var(--color-game-muted)]">Nenhum encontro ativo</p>
            <p className="mt-2 text-sm text-[var(--color-game-muted)]">
              Finalize um treino com pelo menos um exercício para um Pokémon aparecer.
            </p>
            <PixelLink className="mt-6" fullWidth to="/workout/new" variant="primary">
              Iniciar treino
            </PixelLink>
          </PixelCard>
        </main>
      </>
    );
  }

  return (
    <>
      <MobileHeader backTo="/" title="Encontro selvagem" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        {state.teamRewards ? (
          <TeamWorkoutRewardsCard rewards={state.teamRewards} />
        ) : null}
        <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <PixelCard className="text-center">
            <p className="flex items-center justify-center gap-2 text-game-title text-[var(--color-game-danger)]">
              <GameIcon name="explore" size={20} />
              {weeklyGoalReward ? 'Meta semanal!' : 'Recompensa do treino!'}
            </p>
            <p className="mt-2 text-sm text-[var(--color-game-muted)]">
              {weeklyGoalReward
                ? 'Você bateu a meta da semana! Um lendário ou ultra raro apareceu.'
                : 'Um Pokémon selvagem surgiu após seu treino.'}
            </p>
            <div className="relative my-6 flex justify-center">
              {species ? (
                <PokemonSprite alt={species.name} pokedexId={species.pokedex_id} size="lg" src={image} />
              ) : (
                <PokemonSprite alt="wild" size="lg" src={null} />
              )}
              {encounterLevel != null ? (
                <span className="absolute -right-1 top-0 border-4 border-[var(--color-game-border)] bg-[var(--color-game-accent)] px-2 py-0.5 text-xs font-bold text-[var(--color-game-border)]">
                  Lv. {encounterLevel}
                </span>
              ) : null}
            </div>
            {species ? (
              <>
                <p className="text-game-title text-[var(--color-game-accent)]">{species.name}</p>
                {encounterLevel != null ? (
                  <p className="mt-1 text-xs text-[var(--color-game-muted)]">
                    Selvagem nível {encounterLevel}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[var(--color-game-muted)]">Carregando...</p>
            )}
            <div className="mt-6">
              <PixelButton
                disabled={!species || !workoutId}
                fullWidth
                onClick={() => navigate('/capture')}
              >
                Tentar captura
              </PixelButton>
            </div>
          </PixelCard>
        </motion.div>
      </main>
    </>
  );
};

export default EncounterPage;
