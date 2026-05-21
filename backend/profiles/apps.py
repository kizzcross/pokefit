from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "profiles"
    verbose_name = "profiles"

    def ready(self):
        import profiles.signals  # noqa: F401
