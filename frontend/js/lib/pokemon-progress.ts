/** Progress fields returned by the API on UserPokemon serializers. */

export type EvolutionPreview = {
  species_name: string;
  pokedex_id: number;
  trigger: string;
  requires_level?: number | null;
  requires_affection?: number | null;
};

export type PokemonProgressFields = {
  level?: number;
  experience?: number;
  experience_to_next_level?: number | null;
  experience_progress_percent?: number;
  affection?: number;
  affection_max?: number;
  affection_progress_percent?: number;
  can_evolve?: boolean;
  next_evolution?: EvolutionPreview | null;
};

export type TeamPokemonGain = {
  pokemon_id: number;
  display_name: string;
  xp_added: number;
  affection_added: number;
  level_before: number;
  level_after: number;
  evolved: boolean;
  evolved_to?: EvolutionPreview | null;
};

export type WorkoutTeamRewards = {
  gains: TeamPokemonGain[];
  empty_team: boolean;
};

export function evolutionRequirementLabel(preview: EvolutionPreview | null | undefined): string | null {
  if (!preview) return null;
  if (preview.requires_level != null) {
    return `Nv. ${preview.requires_level}`;
  }
  if (preview.requires_affection != null) {
    return `Carinho ${preview.requires_affection}`;
  }
  return null;
}
