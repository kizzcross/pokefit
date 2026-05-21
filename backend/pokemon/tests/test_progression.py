from decimal import Decimal

from django.utils import timezone
from model_bakery import baker

from common.utils.tests import TestCaseUtils
from pokemon.constants import AFFECTION_MAX, MAX_POKEMON_LEVEL
from pokemon.models import EvolutionChain, EvolutionRule, PokemonSpecies, UserPokemon
from pokemon.services.progression import (
    apply_workout_rewards,
    xp_gain_for_workout,
    xp_total_for_level,
)
from workouts.choices import WorkoutStatus
from workouts.models import Workout


class ProgressionServiceTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        self.species = baker.make(
            PokemonSpecies,
            pokedex_id=1,
            name="bulbasaur",
            type_1="grass",
            base_hp=45,
            base_attack=49,
            base_defense=49,
            base_sp_attack=65,
            base_sp_defense=65,
            base_speed=45,
        )
        self.ivysaur = baker.make(
            PokemonSpecies,
            pokedex_id=2,
            name="ivysaur",
            type_1="grass",
            base_hp=60,
            base_attack=62,
            base_defense=63,
            base_sp_attack=80,
            base_sp_defense=80,
            base_speed=60,
        )
        chain = baker.make(EvolutionChain, pokeapi_id=1, url="https://pokeapi.co/api/v2/evolution-chain/1/")
        baker.make(
            EvolutionRule,
            chain=chain,
            from_species=self.species,
            to_species=self.ivysaur,
            trigger="level-up",
            min_level=16,
            enabled=True,
        )

    def _make_team_pokemon(self, **kwargs):
        defaults = {
            "user": self.user,
            "species": self.species,
            "level": 15,
            "experience": xp_total_for_level(15),
            "affection": 0,
            "captured_at": timezone.now(),
            "active_team_slot": 1,
        }
        defaults.update(kwargs)
        return baker.make(UserPokemon, **defaults)

    def test_xp_gain_for_workout(self):
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            perceived_effort=8,
            quality_score=80,
            progress_score=60,
        )
        baker.make("workouts.WorkoutExercise", workout=workout, _quantity=3)
        gain = xp_gain_for_workout(workout)
        self.assertGreater(gain, 40)

    def test_apply_workout_rewards_levels_up_and_evolves(self):
        pokemon = self._make_team_pokemon()
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            perceived_effort=8,
            quality_score=90,
            progress_score=90,
        )
        baker.make("workouts.WorkoutExercise", workout=workout, _quantity=5)

        rewards = apply_workout_rewards(self.user, workout)
        self.assertFalse(rewards.empty_team)
        self.assertEqual(len(rewards.gains), 1)
        gain = rewards.gains[0]
        self.assertGreater(gain.xp_added, 0)
        self.assertGreater(gain.affection_added, 0)
        self.assertTrue(gain.evolved)
        self.assertEqual(gain.evolved_to.species_name, "ivysaur")

        pokemon.refresh_from_db()
        self.assertEqual(pokemon.species_id, self.ivysaur.pk)
        self.assertGreaterEqual(pokemon.level, 16)

    def test_empty_team_returns_flag(self):
        workout = baker.make(Workout, user=self.user, status=WorkoutStatus.FINISHED)
        rewards = apply_workout_rewards(self.user, workout)
        self.assertTrue(rewards.empty_team)
        self.assertEqual(rewards.gains, [])

    def test_affection_caps_at_max(self):
        pokemon = self._make_team_pokemon(affection=AFFECTION_MAX - 1)
        workout = baker.make(Workout, user=self.user, status=WorkoutStatus.FINISHED, perceived_effort=10)
        apply_workout_rewards(self.user, workout)
        pokemon.refresh_from_db()
        self.assertEqual(pokemon.affection, AFFECTION_MAX)
