from unittest.mock import patch

from model_bakery import baker

from common.utils.tests import TestCaseUtils
from pokemon.models import EvolutionRule, PokemonSpecies
from pokemon.services.pokeapi_evolution import (
    import_evolution_chain_from_url,
    parse_evolution_chain,
    species_name_from_api_slug,
)


BULBASAUR_CHAIN = {
    "id": 1,
    "chain": {
        "species": {"name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon-species/1/"},
        "evolves_to": [
            {
                "species": {"name": "ivysaur", "url": "https://pokeapi.co/api/v2/pokemon-species/2/"},
                "evolution_details": [{"trigger": {"name": "level-up"}, "min_level": 16}],
                "evolves_to": [
                    {
                        "species": {
                            "name": "venusaur",
                            "url": "https://pokeapi.co/api/v2/pokemon-species/3/",
                        },
                        "evolution_details": [{"trigger": {"name": "level-up"}, "min_level": 32}],
                        "evolves_to": [],
                    }
                ],
            }
        ],
    },
}


class PokeapiEvolutionTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        for dex, name in ((1, "Bulbasaur"), (2, "Ivysaur"), (3, "Venusaur")):
            baker.make(PokemonSpecies, pokedex_id=dex, name=name, type_1="grass")

    def test_species_name_from_api_slug_aliases(self):
        self.assertEqual(species_name_from_api_slug("mr-mime"), "Mr. Mime")
        self.assertEqual(species_name_from_api_slug("nidoran-f"), "Nidoran♀")

    def test_parse_evolution_chain_drafts(self):
        drafts = parse_evolution_chain(BULBASAUR_CHAIN)
        self.assertEqual(len(drafts), 2)
        self.assertEqual(drafts[0].from_name, "Bulbasaur")
        self.assertEqual(drafts[0].to_name, "Ivysaur")
        self.assertEqual(drafts[0].min_level, 16)

    @patch("pokemon.services.pokeapi_evolution.fetch_pokeapi_json")
    def test_import_evolution_chain_creates_rules(self, fetch_mock):
        fetch_mock.return_value = BULBASAUR_CHAIN
        _, synced, skipped = import_evolution_chain_from_url(
            "https://pokeapi.co/api/v2/evolution-chain/1/"
        )
        self.assertEqual(synced, 2)
        self.assertEqual(skipped, 0)
        self.assertEqual(EvolutionRule.objects.count(), 2)
