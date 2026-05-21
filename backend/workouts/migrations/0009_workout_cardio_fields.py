from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0008_workout_encounter_level"),
    ]

    operations = [
        migrations.AddField(
            model_name="workout",
            name="cardio_duration_minutes",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Duration of the cardio session in minutes.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="workout",
            name="cardio_pace_seconds_per_km",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Average pace in seconds per kilometer (lower is faster).",
                null=True,
            ),
        ),
    ]
