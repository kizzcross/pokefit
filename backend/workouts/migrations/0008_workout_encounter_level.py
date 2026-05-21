import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0007_alter_workout_validation_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="workout",
            name="encounter_level",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Level of the wild Pokémon for this encounter.",
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
    ]
