import time

from django.core.management.base import BaseCommand

from pokemon.models import EvolutionRule, PokemonSpecies
from pokemon.services.pokeapi_evolution import (
    backfill_evolution_chain_urls,
    import_evolution_chain_from_url,
)


class Command(BaseCommand):
    help = "Import evolution rules from PokéAPI for species that have evolution_chain_url."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Max chains to import (0 = all).",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.15,
            help="Seconds between PokéAPI requests.",
        )
        parser.add_argument(
            "--skip-backfill",
            action="store_true",
            help="Do not fetch missing evolution_chain_url from PokéAPI first.",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        delay = options["delay"]

        if not options["skip_backfill"]:
            missing_before = PokemonSpecies.objects.filter(evolution_chain_url="").count()
            self.stdout.write(
                f"Species without evolution_chain_url: {missing_before}. Backfilling from PokéAPI..."
            )
            backfill_stats = backfill_evolution_chain_urls(limit=limit or 0)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Backfill: {backfill_stats['updated']} URLs saved, "
                    f"{backfill_stats['failed']} failed (of {backfill_stats['scanned']} scanned)."
                )
            )
            if backfill_stats["updated"] == 0 and missing_before > 0:
                self.stdout.write(
                    self.style.WARNING(
                        "Nenhuma URL obtida da PokéAPI. Verifique internet ou rode: "
                        "python manage.py import_pokemon --limit 151"
                    )
                )

        urls = list(
            PokemonSpecies.objects.exclude(evolution_chain_url="")
            .values_list("evolution_chain_url", flat=True)
            .distinct()
        )
        if limit:
            urls = urls[:limit]

        if not urls:
            self.stdout.write(
                self.style.WARNING(
                    "Nenhuma URL de cadeia evolutiva. Rode: "
                    "python manage.py import_pokemon --limit 151"
                )
            )
            return

        seen: set[str] = set()
        imported = 0
        rules_synced = 0
        rules_skipped = 0
        errors = 0

        for url in urls:
            if not url or url in seen:
                continue
            seen.add(url)
            try:
                _, synced, skipped = import_evolution_chain_from_url(url)
                imported += 1
                rules_synced += synced
                rules_skipped += skipped
                self.stdout.write(
                    self.style.SUCCESS(f"{url} → {synced} regra(s), {skipped} ignorada(s)")
                )
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f"Failed {url}: {exc}"))
            time.sleep(delay)

        total_rules = EvolutionRule.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {imported} chains, {rules_synced} rules synced, "
                f"{rules_skipped} skipped (species missing in DB), {errors} errors. "
                f"Total rules in DB: {total_rules}."
            )
        )
