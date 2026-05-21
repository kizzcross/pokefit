import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pokemon", "0002_rarity_tiers"),
        ("workouts", "0003_alter_workoutexercise_name_exercise_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="workout",
            name="encounter_species",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="workout_encounters",
                to="pokemon.pokemonspecies",
            ),
        ),
        migrations.AddField(
            model_name="workout",
            name="encounter_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("pending", "Pending"),
                    ("captured", "Captured"),
                    ("fled", "Fled"),
                ],
                default="",
                max_length=16,
            ),
        ),
    ]
