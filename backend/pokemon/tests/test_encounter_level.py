from django.utils import timezone
from model_bakery import baker

from common.utils.tests import TestCaseUtils
from pokemon.choices import Rarity
from pokemon.models import PokemonSpecies, UserPokemon
from pokemon.services.encounter import assign_workout_encounter
from pokemon.services.encounter_level import (
    compute_trainer_tier,
    experience_for_encounter_level,
    roll_encounter_level,
)
from pokemon.services.grant import grant_pokemon_from_workout_encounter
from pokemon.services.progression import xp_total_for_level
from workouts.choices import WorkoutStatus
from workouts.models import Workout


class EncounterLevelTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        self.species = baker.make(
            PokemonSpecies,
            pokedex_id=25,
            name="pikachu",
            type_1="electric",
            rarity=Rarity.COMMON,
            base_hp=35,
            base_attack=55,
            base_defense=40,
            base_sp_attack=50,
            base_sp_defense=50,
            base_speed=90,
        )

    def test_trainer_tier_increases_with_workouts(self):
        self.assertEqual(compute_trainer_tier(self.user), 1)
        for _ in range(9):
            baker.make(Workout, user=self.user, status=WorkoutStatus.FINISHED)
        self.assertGreaterEqual(compute_trainer_tier(self.user), 3)

    def test_assign_workout_sets_encounter_level(self):
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            quality_score=80,
            progress_score=60,
            perceived_effort=8,
        )
        assign_workout_encounter(workout)
        workout.refresh_from_db()
        self.assertIsNotNone(workout.encounter_level)
        self.assertGreaterEqual(workout.encounter_level, 1)
        self.assertLessEqual(workout.encounter_level, 50)

    def test_capture_uses_encounter_level_and_xp(self):
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            encounter_level=12,
        )
        pokemon = grant_pokemon_from_workout_encounter(self.user, self.species, workout)
        self.assertEqual(pokemon.level, 12)
        self.assertGreaterEqual(pokemon.experience, xp_total_for_level(12))
        self.assertLess(pokemon.experience, xp_total_for_level(13))

    def test_experience_for_encounter_level_within_level_band(self):
        xp = experience_for_encounter_level(10)
        self.assertGreaterEqual(xp, xp_total_for_level(10))
        self.assertLess(xp, xp_total_for_level(11))

    def test_veteran_gets_higher_cap_than_novice(self):
        novice_workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            quality_score=50,
            progress_score=50,
            perceived_effort=5,
        )
        novice_level = roll_encounter_level(novice_workout, self.species)

        for _ in range(30):
            baker.make(Workout, user=self.user, status=WorkoutStatus.FINISHED)
        baker.make(
            UserPokemon,
            user=self.user,
            species=self.species,
            level=25,
            experience=xp_total_for_level(25),
            active_team_slot=1,
            captured_at=timezone.now(),
        )
        veteran_workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            quality_score=90,
            progress_score=90,
            perceived_effort=9,
            weekly_goal_reward=True,
        )
        legendary = baker.make(
            PokemonSpecies,
            pokedex_id=150,
            name="mewtwo",
            type_1="psychic",
            rarity=Rarity.LEGENDARY,
            base_hp=106,
            base_attack=110,
            base_defense=90,
            base_sp_attack=154,
            base_sp_defense=90,
            base_speed=130,
        )
        veteran_level = roll_encounter_level(veteran_workout, legendary)
        self.assertGreater(veteran_level, novice_level)
