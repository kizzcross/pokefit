from django.core.management.base import BaseCommand

from pokemon.choices import PokemonType
from pokemon.models import PokemonSpecies
from pokemon.services.rarity import compute_rarity_from_base_stats
from pokemon.services.sprites import default_pixel_sprite_url

GEN1_NAMES = [
    "Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard", "Squirtle", "Wartortle",
    "Blastoise", "Caterpie", "Metapod", "Butterfree", "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto",
    "Pidgeot", "Rattata", "Raticate", "Spearow", "Fearow", "Ekans", "Arbok", "Pikachu", "Raichu", "Sandshrew",
    "Sandslash", "Nidoran♀", "Nidorina", "Nidoqueen", "Nidoran♂", "Nidorino", "Nidoking", "Clefairy", "Clefable",
    "Vulpix", "Ninetales", "Jigglypuff", "Wigglytuff", "Zubat", "Golbat", "Oddish", "Gloom", "Vileplume", "Paras",
    "Parasect", "Venonat", "Venomoth", "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck", "Golduck", "Mankey",
    "Primeape", "Growlithe", "Arcanine", "Poliwag", "Poliwhirl", "Poliwrath", "Abra", "Kadabra", "Alakazam",
    "Machop", "Machoke", "Machamp", "Bellsprout", "Weepinbell", "Victreebel", "Tentacool", "Tentacruel", "Geodude",
    "Graveler", "Golem", "Ponyta", "Rapidash", "Slowpoke", "Slowbro", "Magnemite", "Magneton", "Farfetch'd",
    "Doduo", "Dodrio", "Seel", "Dewgong", "Grimer", "Muk", "Shellder", "Cloyster", "Gastly", "Haunter", "Gengar",
    "Onix", "Drowzee", "Hypno", "Krabby", "Kingler", "Voltorb", "Electrode", "Exeggcute", "Exeggutor", "Cubone",
    "Marowak", "Hitmonlee", "Hitmonchan", "Lickitung", "Koffing", "Weezing", "Rhyhorn", "Rhydon", "Chansey", "Tangela",
    "Kangaskhan", "Horsea", "Seadra", "Goldeen", "Seaking", "Staryu", "Starmie", "Mr. Mime", "Scyther", "Jynx",
    "Electabuzz", "Magmar", "Pinsir", "Tauros", "Magikarp", "Gyarados", "Lapras", "Ditto", "Eevee", "Vaporeon",
    "Jolteon", "Flareon", "Porygon", "Omanyte", "Omastar", "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno",
    "Zapdos", "Moltres", "Dratini", "Dragonair", "Dragonite", "Mewtwo", "Mew",
]

TYPE_HINTS = {
    1: (PokemonType.GRASS, PokemonType.POISON),
    4: (PokemonType.FIRE, ""),
    7: (PokemonType.WATER, ""),
    25: (PokemonType.ELECTRIC, ""),
    143: (PokemonType.NORMAL, ""),
    150: (PokemonType.PSYCHIC, ""),
    151: (PokemonType.PSYCHIC, ""),
}

# Approximate Gen 1 base stats (for offline rarity when API is unavailable).
GEN1_BASE_STATS: dict[int, dict[str, int]] = {
    25: dict(base_hp=35, base_attack=55, base_defense=40, base_sp_attack=50, base_sp_defense=50, base_speed=90),
    6: dict(base_hp=78, base_attack=84, base_defense=78, base_sp_attack=109, base_sp_defense=85, base_speed=100),
    150: dict(base_hp=106, base_attack=110, base_defense=90, base_sp_attack=154, base_sp_defense=90, base_speed=130),
    151: dict(base_hp=100, base_attack=100, base_defense=100, base_sp_attack=100, base_sp_defense=100, base_speed=100),
}

def _default_base_stats(pokedex_id: int) -> dict[str, int]:
    if pokedex_id in GEN1_BASE_STATS:
        return GEN1_BASE_STATS[pokedex_id]
    return {
        "base_hp": 45 + (pokedex_id % 50),
        "base_attack": 49 + (pokedex_id % 60),
        "base_defense": 49 + (pokedex_id % 55),
        "base_sp_attack": 65 + (pokedex_id % 50),
        "base_sp_defense": 65 + (pokedex_id % 50),
        "base_speed": 45 + (pokedex_id % 60),
    }


class Command(BaseCommand):
    help = "Seed Gen 1 Pokémon locally (pixel sprites, rarity from base stats)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Last Pokédex id to seed (default: all 151).",
        )

    def handle(self, *args, **options):
        limit = options["limit"] or len(GEN1_NAMES)
        limit = min(limit, len(GEN1_NAMES))
        created = 0
        updated = 0

        for pokedex_id in range(1, limit + 1):
            name = GEN1_NAMES[pokedex_id - 1]
            type_1, type_2 = TYPE_HINTS.get(pokedex_id, (PokemonType.NORMAL, ""))
            base_stats = _default_base_stats(pokedex_id)
            sprite = default_pixel_sprite_url(pokedex_id)
            rarity = compute_rarity_from_base_stats(**base_stats)

            species, was_created = PokemonSpecies.objects.update_or_create(
                pokedex_id=pokedex_id,
                defaults={
                    "name": name,
                    "type_1": type_1,
                    "type_2": type_2,
                    **base_stats,
                    "sprite_url": sprite,
                    "official_artwork_url": "",
                    "evolution_chain_url": "",
                    "rarity": rarity,
                    "workout_pools": {},
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"#{pokedex_id:03d} {species.name}: importado"))
            else:
                updated += 1
                self.stdout.write(self.style.WARNING(f"#{pokedex_id:03d} {species.name}: atualizado"))

        self.stdout.write(
            self.style.SUCCESS(f"\nResumo: {created} importados, {updated} atualizados (offline seed).")
        )
