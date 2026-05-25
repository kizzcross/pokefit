import secrets

import django.db.models.deletion
from django.db import migrations, models


_INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_INVITE_CODE_LENGTH = 8


def _generate_code(length: int = _INVITE_CODE_LENGTH) -> str:
    return "".join(secrets.choice(_INVITE_CODE_ALPHABET) for _ in range(length))


def backfill_invite_codes(apps, schema_editor):
    User = apps.get_model("users", "User")
    used: set[str] = set(
        User.objects.exclude(invite_code__isnull=True)
        .exclude(invite_code="")
        .values_list("invite_code", flat=True)
    )
    for user in User.objects.filter(invite_code__isnull=True).order_by("id"):
        for _ in range(16):
            candidate = _generate_code()
            if candidate not in used and not User.objects.filter(invite_code=candidate).exists():
                break
        else:
            candidate = _generate_code(_INVITE_CODE_LENGTH + 4)
        used.add(candidate)
        user.invite_code = candidate
        user.save(update_fields=["invite_code"])


def backfill_invite_codes_blank(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.update(invite_code="")


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_user_nickname"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="invite_code",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text=(
                    "Código pessoal de convite. Quem se cadastrar com este código vira amigo "
                    "e dá um presente ao dono."
                ),
                max_length=12,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="invited_by",
            field=models.ForeignKey(
                blank=True,
                help_text="Usuário cujo invite_code foi usado neste cadastro.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="referrals",
                to="users.user",
            ),
        ),
        migrations.RunPython(backfill_invite_codes, backfill_invite_codes_blank),
        migrations.AlterField(
            model_name="user",
            name="invite_code",
            field=models.CharField(
                db_index=True,
                help_text=(
                    "Código pessoal de convite. Quem se cadastrar com este código vira amigo "
                    "e dá um presente ao dono."
                ),
                max_length=12,
                unique=True,
            ),
        ),
    ]
