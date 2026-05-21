from rest_framework.pagination import LimitOffsetPagination


class PokemonSpeciesPagination(LimitOffsetPagination):
    default_limit = 80
    max_limit = 500
