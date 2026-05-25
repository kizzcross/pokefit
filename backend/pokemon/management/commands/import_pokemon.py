import time

from django.core.management.base import BaseCommand, CommandError

from pokemon.models import EvolutionChain, EvolutionRule, PokemonSpecies
from pokemon.services.pokeapi_evolution import import_evolution_chain_from_url
from pokemon.services.pokeapi_import import (
    DEFAULT_REQUEST_TIMEOUT,
    ImportStatus,
    clear_pokemon_catalog,
    import_pokemon_species,
)

# PokéAPI national dex grows over time; import stops after consecutive misses.
DEFAULT_MAX_POKEDEX_ID = 1025
CONSECUTIVE_FAILURE_STOP = 25
EVOLUTION_REQUEST_DELAY = 0.15


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
        parser.add_argument(
            "--skip-evolutions",
            action="store_true",
            help="Do not import evolution chains/rules after species (default: import).",
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

        if not options["skip_evolutions"]:
            self._import_evolution_chains(timeout=timeout)

    def _import_evolution_chains(self, *, timeout: int) -> None:
        chain_urls = list(
            PokemonSpecies.objects.exclude(evolution_chain_url="")
            .values_list("evolution_chain_url", flat=True)
            .distinct()
        )
        if not chain_urls:
            self.stdout.write(
                self.style.WARNING(
                    "Nenhuma URL de evolução nas species — nada para importar."
                )
            )
            return

        self.stdout.write("")
        self.stdout.write(f"Importando {len(chain_urls)} cadeia(s) evolutiva(s)...")

        chains_processed = 0
        rules_synced = 0
        rules_skipped = 0
        errors = 0

        for url in chain_urls:
            try:
                _, synced, skipped = import_evolution_chain_from_url(url)
                chains_processed += 1
                rules_synced += synced
                rules_skipped += skipped
                if synced:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"{url} → {synced} regra(s), {skipped} ignorada(s)"
                        )
                    )
                elif skipped:
                    self.stdout.write(
                        self.style.WARNING(
                            f"{url} → 0 regras criadas ({skipped} pulada(s) por species "
                            "ausentes no DB — importe mais Pokémon e rode de novo)"
                        )
                    )
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f"Falha em {url}: {exc}"))
            time.sleep(EVOLUTION_REQUEST_DELAY * (1 if timeout >= 5 else 0))

        total_chains = EvolutionChain.objects.count()
        total_rules = EvolutionRule.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Evolução: {chains_processed} cadeias processadas, "
                f"{rules_synced} regras sincronizadas, {rules_skipped} ignoradas, "
                f"{errors} erros. Total no DB: {total_chains} chains, {total_rules} rules."
            )
        )
