from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0005_workout_proof_photo"),
    ]

    operations = [
        migrations.AddField(
            model_name="workout",
            name="weekly_goal_reward",
            field=models.BooleanField(
                default=False,
                help_text="Encontro lendário/ultra raro por bater a meta semanal neste treino.",
            ),
        ),
    ]
