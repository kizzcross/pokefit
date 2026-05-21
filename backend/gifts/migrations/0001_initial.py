import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("pokemon", "0003_evolution_progression"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                ("batch_id", models.UUIDField(db_index=True, default=uuid.uuid4)),
                ("message", models.TextField(max_length=500)),
                (
                    "gift_kind",
                    models.CharField(
                        choices=[("direct", "Presente direto"), ("choice", "Escolher um Pokémon")],
                        max_length=16,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pendente"), ("claimed", "Resgatado")],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("claimed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "claimed_pokemon",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="pokemon.userpokemon",
                    ),
                ),
                (
                    "claimed_species",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="pokemon.pokemonspecies",
                    ),
                ),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gift_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "sender",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gifts_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created",),
            },
        ),
        migrations.CreateModel(
            name="GiftSpeciesOption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "notification",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="species_options",
                        to="gifts.giftnotification",
                    ),
                ),
                (
                    "species",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="pokemon.pokemonspecies",
                    ),
                ),
            ],
            options={
                "ordering": ("sort_order", "id"),
            },
        ),
        migrations.AddIndex(
            model_name="giftnotification",
            index=models.Index(fields=["recipient", "status", "-created"], name="gifts_giftn_recipie_idx"),
        ),
        migrations.AddConstraint(
            model_name="giftspeciesoption",
            constraint=models.UniqueConstraint(
                fields=("notification", "species"),
                name="gift_species_option_unique_per_notification",
            ),
        ),
    ]
