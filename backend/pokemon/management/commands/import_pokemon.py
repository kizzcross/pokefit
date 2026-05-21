from django.core.management.base import BaseCommand, CommandError

from pokemon.services.pokeapi_import import (
    DEFAULT_REQUEST_TIMEOUT,
    ImportStatus,
    clear_pokemon_catalog,
    import_pokemon_species,
)

# PokéAPI national dex grows over time; import stops after consecutive misses.
DEFAULT_MAX_POKEDEX_ID = 1025
CONSECUTIVE_FAILURE_STOP = 25


class Command(BaseCommand):
    help = (
        "Import Pokémon species from PokéAPI (pixel sprites, rarity from base stats). "
        "Use --clear to wipe the catalog first."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Max Pokédex id to try (default: import until consecutive failures).",
        )
        parser.add_argument(
            "--start",
            type=int,
            default=1,
            help="First Pokédex id (default: 1).",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all species and user Pokémon before importing.",
        )
        parser.add_argument(
            "--timeout",
            type=int,
            default=DEFAULT_REQUEST_TIMEOUT,
            help=f"HTTP timeout in seconds (default: {DEFAULT_REQUEST_TIMEOUT}).",
        )

    def handle(self, *args, **options):
        start_id = options["start"]
        limit = options["limit"]
        timeout = options["timeout"]

        if start_id < 1:
            raise CommandError("--start must be at least 1.")
        if limit is not None and limit < start_id:
            raise CommandError("--limit must be >= --start.")
        if timeout < 1:
            raise CommandError("--timeout must be at least 1.")

        if options["clear"]:
            cleared = clear_pokemon_catalog()
            self.stdout.write(
                self.style.WARNING(
                    "Catálogo limpo: "
                    f"{cleared['species']} espécies, "
                    f"{cleared['user_pokemon']} capturas, "
                    f"{cleared['ivs']} IVs, {cleared['evs']} EVs."
                )
            )

        end_id = limit if limit is not None else DEFAULT_MAX_POKEDEX_ID
        created_count = 0
        updated_count = 0
        failed_count = 0
        consecutive_failures = 0

        for pokedex_id in range(start_id, end_id + 1):
            result = import_pokemon_species(pokedex_id, timeout=timeout)

            if result.status == ImportStatus.CREATED:
                created_count += 1
                consecutive_failures = 0
                self.stdout.write(
                    self.style.SUCCESS(
                        f"#{result.pokedex_id:04d} {result.name}: importado."
                    )
                )
            elif result.status == ImportStatus.UPDATED:
                updated_count += 1
                consecutive_failures = 0
                self.stdout.write(
                    self.style.WARNING(
                        f"#{result.pokedex_id:04d} {result.name}: atualizado."
                    )
                )
            else:
                failed_count += 1
                consecutive_failures += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"#{result.pokedex_id:04d}: falha — {result.error}"
                    )
                )
                if limit is None and consecutive_failures >= CONSECUTIVE_FAILURE_STOP:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Parando após {CONSECUTIVE_FAILURE_STOP} falhas seguidas."
                        )
                    )
                    break

        self.stdout.write("")
        self.stdout.write(
            f"Resumo: {created_count} importados, {updated_count} atualizados, {failed_count} falhas."
        )

        if failed_count and not (created_count or updated_count):
            raise CommandError(f"Import finished with {failed_count} failure(s) and no successes.")
