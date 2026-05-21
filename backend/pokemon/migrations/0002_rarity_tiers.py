from django.db import migrations, models


def migrate_legacy_rarity(apps, schema_editor):
    PokemonSpecies = apps.get_model("pokemon", "PokemonSpecies")
    PokemonSpecies.objects.filter(rarity="uncommon").update(rarity="rare")
    PokemonSpecies.objects.filter(rarity="epic").update(rarity="super_rare")


class Migration(migrations.Migration):

    dependencies = [
        ("pokemon", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(migrate_legacy_rarity, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="pokemonspecies",
            name="rarity",
            field=models.CharField(
                choices=[
                    ("common", "Common"),
                    ("rare", "Rare"),
                    ("super_rare", "Super Rare"),
                    ("legendary", "Legendary"),
                ],
                default="common",
                max_length=16,
            ),
        ),
    ]
