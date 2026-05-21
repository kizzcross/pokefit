from .views import PokemonSpeciesViewSet, UserPokemonViewSet


routes = [
    {"regex": r"pokemon-species", "viewset": PokemonSpeciesViewSet, "basename": "pokemon-species"},
    {"regex": r"my-pokemon", "viewset": UserPokemonViewSet, "basename": "my-pokemon"},
]
