import { create } from 'zustand';

import type { PokemonSpecies } from '@/js/api/types.gen';

export type { PokemonSpecies };

type EncounterState = {
  species: PokemonSpecies | null;
  workoutId: number | null;
};

type GameStore = {
  encounter: EncounterState;
  lastCaptureId: number | null;
  setEncounter: (species: PokemonSpecies, workoutId: number) => void;
  clearEncounter: () => void;
  setLastCaptureId: (id: number | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  encounter: { species: null, workoutId: null },
  lastCaptureId: null,
  setEncounter: (species, workoutId) =>
    set({ encounter: { species, workoutId } }),
  clearEncounter: () => set({ encounter: { species: null, workoutId: null } }),
  setLastCaptureId: (id) => set({ lastCaptureId: id }),
}));
