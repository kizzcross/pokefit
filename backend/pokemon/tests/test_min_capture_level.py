from common.utils.tests import TestCaseUtils
from model_bakery import baker
from workouts.choices import WorkoutStatus
from workouts.models import Workout

from pokemon.choices import Rarity
from pokemon.models import EvolutionChain, EvolutionRule, PokemonSpecies
from pokemon.services.encounter_level import roll_encounter_level
from pokemon.services.evolution_rules import get_min_capture_level
from pokemon.services.grant import (
    grant_pokemon_from_workout_encounter,
    grant_pokemon_to_user,
)


class MinCaptureLevelTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        self.chain = baker.make(
            EvolutionChain,
            pokeapi_id=7,
            url="https://pokeapi.co/api/v2/evolution-chain/7/",
        )
        self.dratini = baker.make(
            PokemonSpecies,
            pokedex_id=147,
            name="Dratini",
            type_1="dragon",
            rarity=Rarity.RARE,
            base_hp=41,
            base_attack=64,
            base_defense=45,
            base_sp_attack=50,
            base_sp_defense=50,
            base_speed=50,
            evolution_chain=self.chain,
        )
        self.dragonair = baker.make(
            PokemonSpecies,
            pokedex_id=148,
            name="Dragonair",
            type_1="dragon",
            rarity=Rarity.SUPER_RARE,
            base_hp=61,
            base_attack=84,
            base_defense=65,
            base_sp_attack=70,
            base_sp_defense=70,
            base_speed=70,
            evolution_chain=self.chain,
        )
        self.dragonite = baker.make(
            PokemonSpecies,
            pokedex_id=149,
            name="Dragonite",
            type_1="dragon",
            rarity=Rarity.LEGENDARY,
            base_hp=91,
            base_attack=134,
            base_defense=95,
            base_sp_attack=100,
            base_sp_defense=100,
            base_speed=80,
            evolution_chain=self.chain,
        )
        EvolutionRule.objects.create(
            chain=self.chain,
            from_species=self.dratini,
            to_species=self.dragonair,
            trigger="level-up",
            min_level=30,
            enabled=True,
            priority=1,
        )
        EvolutionRule.objects.create(
            chain=self.chain,
            from_species=self.dragonair,
            to_species=self.dragonite,
            trigger="level-up",
            min_level=55,
            enabled=True,
            priority=2,
        )

    def test_base_species_has_min_level_1(self):
        self.assertEqual(get_min_capture_level(self.dratini.pk), 1)

    def test_first_evolution_has_its_rule_min_level(self):
        self.assertEqual(get_min_capture_level(self.dragonair.pk), 30)

    def test_second_evolution_takes_highest_floor_in_chain(self):
        self.assertEqual(get_min_capture_level(self.dragonite.pk), 55)

    def test_disabled_rules_are_ignored(self):
        EvolutionRule.objects.filter(to_species=self.dragonite).update(enabled=False)
        self.assertEqual(get_min_capture_level(self.dragonite.pk), 1)

    def test_grant_pokemon_to_user_clamps_to_floor(self):
        pokemon = grant_pokemon_to_user(self.user, self.dragonite, level=1)
        self.assertEqual(pokemon.level, 55)

    def test_grant_pokemon_to_user_respects_higher_level_when_passed(self):
        pokemon = grant_pokemon_to_user(self.user, self.dragonite, level=70)
        self.assertEqual(pokemon.level, 70)

    def test_grant_from_workout_clamps_above_floor(self):
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            encounter_level=5,
        )
        pokemon = grant_pokemon_from_workout_encounter(self.user, self.dragonite, workout)
        self.assertEqual(pokemon.level, 55)

    def test_roll_encounter_level_never_below_floor(self):
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            quality_score=10,
            progress_score=10,
            perceived_effort=1,
        )
        # rookie trainer, terrible workout — would normally roll very low
        level = roll_encounter_level(workout, self.dragonite)
        self.assertGreaterEqual(level, 55)

    def test_roll_encounter_level_unconstrained_for_base_species(self):
        workout = baker.make(
            Workout,
            user=self.user,
            status=WorkoutStatus.FINISHED,
            quality_score=10,
            progress_score=10,
            perceived_effort=1,
        )
        level = roll_encounter_level(workout, self.dratini)
        self.assertGreaterEqual(level, 1)
        self.assertLessEqual(level, 30)
