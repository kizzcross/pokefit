import { create } from 'zustand';

import type { PokemonSpecies } from '@/js/api/types.gen';

export type { PokemonSpecies };

type EncounterState = {
  species: PokemonSpecies | null;
  workoutId: number | null;
  encounterLevel: number | null;
};

type GameStore = {
  encounter: EncounterState;
  lastCaptureId: number | null;
  setEncounter: (species: PokemonSpecies, workoutId: number, encounterLevel?: number | null) => void;
  clearEncounter: () => void;
  setLastCaptureId: (id: number | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  encounter: { species: null, workoutId: null, encounterLevel: null },
  lastCaptureId: null,
  setEncounter: (species, workoutId, encounterLevel = null) =>
    set({ encounter: { species, workoutId, encounterLevel: encounterLevel ?? null } }),
  clearEncounter: () =>
    set({ encounter: { species: null, workoutId: null, encounterLevel: null } }),
  setLastCaptureId: (id) => set({ lastCaptureId: id }),
}));
