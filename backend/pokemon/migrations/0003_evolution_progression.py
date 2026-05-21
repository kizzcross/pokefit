import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pokemon", "0002_rarity_tiers"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvolutionChain",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                ("pokeapi_id", models.PositiveIntegerField(unique=True)),
                ("url", models.URLField(max_length=512, unique=True)),
            ],
            options={
                "verbose_name": "evolution chain",
                "verbose_name_plural": "evolution chains",
            },
        ),
        migrations.AddField(
            model_name="pokemonspecies",
            name="evolution_chain",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="species",
                to="pokemon.evolutionchain",
            ),
        ),
        migrations.CreateModel(
            name="EvolutionRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("trigger", models.CharField(default="level-up", max_length=32)),
                ("min_level", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("min_affection", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("item_slug", models.CharField(blank=True, default="", max_length=64)),
                ("enabled", models.BooleanField(default=True)),
                ("priority", models.PositiveSmallIntegerField(default=0)),
                (
                    "chain",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rules",
                        to="pokemon.evolutionchain",
                    ),
                ),
                (
                    "from_species",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="evolution_rules_from",
                        to="pokemon.pokemonspecies",
                    ),
                ),
                (
                    "to_species",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="evolution_rules_to",
                        to="pokemon.pokemonspecies",
                    ),
                ),
            ],
            options={
                "ordering": ("priority", "id"),
            },
        ),
        migrations.AddConstraint(
            model_name="evolutionrule",
            constraint=models.UniqueConstraint(
                fields=(
                    "from_species",
                    "to_species",
                    "trigger",
                    "min_level",
                    "min_affection",
                    "item_slug",
                ),
                name="pokemon_evolution_rule_unique_edge",
            ),
        ),
    ]
