from django.core.management.base import BaseCommand, CommandError

from workouts.services.wger_import import (
    DEFAULT_REQUEST_TIMEOUT,
    ImportStatus,
    import_wger_exercise,
    iter_wger_exerciseinfo,
    resolve_language_id,
)


class Command(BaseCommand):
    help = (
        "Import gym exercises from wger (https://wger.de/api/v2/) into the existing Exercise catalog. "
        "Idempotent via slug wger-<id>."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of exercises to process from wger (default: all).",
        )
        parser.add_argument(
            "--language",
            type=str,
            default="pt",
            help="Translation language code: pt, en, de, es (default: pt).",
        )
        parser.add_argument(
            "--source",
            type=str,
            default="wger",
            help="Data source (only 'wger' is supported).",
        )
        parser.add_argument(
            "--include-cardio",
            action="store_true",
            help="Also import cardio exercises (skipped by default).",
        )
        parser.add_argument(
            "--timeout",
            type=int,
            default=DEFAULT_REQUEST_TIMEOUT,
            help=f"HTTP timeout in seconds (default: {DEFAULT_REQUEST_TIMEOUT}).",
        )

    def handle(self, *args, **options):
        source = (options["source"] or "wger").strip().lower()
        if source != "wger":
            raise CommandError(f"Unsupported source '{source}'. Only 'wger' is implemented.")

        limit = options["limit"]
        timeout = options["timeout"]
        gym_only = not options["include_cardio"]

        if limit is not None and limit < 1:
            raise CommandError("--limit must be at least 1.")
        if timeout < 1:
            raise CommandError("--timeout must be at least 1.")

        try:
            language_id = resolve_language_id(options["language"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            f"Importando de wger (idioma={options['language']}, "
            f"limit={'todos' if limit is None else limit}, gym_only={gym_only})..."
        )

        try:
            exercise_infos = iter_wger_exerciseinfo(
                language_id=language_id,
                limit=limit,
                timeout=timeout,
            )
        except Exception as exc:
            raise CommandError(f"Failed to fetch exercises from wger: {exc}") from exc

        if not exercise_infos:
            raise CommandError("No exercises returned from wger.")

        created = updated = skipped = failed = 0

        for exercise_info in exercise_infos:
            result = import_wger_exercise(
                exercise_info,
                language_id=language_id,
                gym_only=gym_only,
            )

            if result.status == ImportStatus.CREATED:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"[criado] {result.name} (wger-{result.wger_id})"))
            elif result.status == ImportStatus.UPDATED:
                updated += 1
                self.stdout.write(self.style.WARNING(f"[atualizado] {result.name} (wger-{result.wger_id})"))
            elif result.status == ImportStatus.SKIPPED:
                skipped += 1
                self.stdout.write(
                    self.style.NOTICE(f"[ignorado] wger-{result.wger_id}: {result.reason}")
                )
            else:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(f"[erro] wger-{result.wger_id}: {result.reason}")
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Resumo: {created} criados, {updated} atualizados, "
                f"{skipped} ignorados, {failed} erros "
                f"(processados {len(exercise_infos)})."
            )
        )

        if failed and not (created or updated):
            raise CommandError(f"Import finished with {failed} failure(s) and no successes.")
