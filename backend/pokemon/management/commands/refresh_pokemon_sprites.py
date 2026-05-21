from django.core.management.base import BaseCommand

from pokemon.models import PokemonSpecies
from pokemon.services.sprites import default_pixel_sprite_url, normalize_sprite_url


class Command(BaseCommand):
    help = "Fix broken sprite URLs (e.g. firered-leafgreen 404) using GitHub PokeAPI/sprites CDN."

    def handle(self, *args, **options):
        updated = 0
        for species in PokemonSpecies.objects.all().only("id", "pokedex_id", "sprite_url"):
            fixed = normalize_sprite_url(species.sprite_url, species.pokedex_id)
            if species.sprite_url != fixed:
                species.sprite_url = fixed
                species.save(update_fields=["sprite_url", "modified"])
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Sprites corrigidos: {updated} de {PokemonSpecies.objects.count()} "
                f"(padrão: {default_pixel_sprite_url(25)})."
            )
        )
