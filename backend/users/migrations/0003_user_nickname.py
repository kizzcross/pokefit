import re

from django.db import migrations, models

NICKNAME_RE = re.compile(r"^[a-z][a-z0-9_]{2,23}$")


def _slugify_local_part(email: str, user_id: int) -> str:
    local = (email or "").split("@")[0].lower()
    base = re.sub(r"[^a-z0-9_]", "", local.replace(".", "_").replace("-", "_"))
    if not base or not base[0].isalpha():
        base = "treinador"
    base = base[:20] or "treinador"
    candidate = base
    suffix = 1
    while len(candidate) < 3:
        candidate = f"{base}{suffix}"
        suffix += 1
    if not NICKNAME_RE.match(candidate):
        candidate = f"treinador{user_id}"
    return candidate


def populate_nicknames(apps, schema_editor):
    User = apps.get_model("users", "User")
    used: set[str] = set()
    for user in User.objects.order_by("id"):
        candidate = _slugify_local_part(user.email, user.pk)
        while candidate in used or User.objects.filter(nickname=candidate).exclude(pk=user.pk).exists():
            candidate = f"{candidate[:18]}_{user.pk}"[:24]
        used.add(candidate)
        user.nickname = candidate
        user.save(update_fields=["nickname"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_user_trainer_sprite"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="nickname",
            field=models.CharField(
                blank=True,
                help_text="Apelido único visível no app (3–24 caracteres, a-z, 0-9, _).",
                max_length=24,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_nicknames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="nickname",
            field=models.CharField(
                help_text="Apelido único visível no app (3–24 caracteres, a-z, 0-9, _).",
                max_length=24,
                unique=True,
            ),
        ),
    ]
