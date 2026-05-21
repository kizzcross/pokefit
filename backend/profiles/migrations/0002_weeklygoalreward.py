import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0005_workout_proof_photo"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("profiles", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeeklyGoalReward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                ("iso_year", models.PositiveSmallIntegerField()),
                ("iso_week", models.PositiveSmallIntegerField()),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weekly_goal_rewards",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workout",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="weekly_goal_reward",
                        to="workouts.workout",
                    ),
                ),
            ],
            options={
                "verbose_name": "weekly goal reward",
                "verbose_name_plural": "weekly goal rewards",
            },
        ),
        migrations.AddConstraint(
            model_name="weeklygoalreward",
            constraint=models.UniqueConstraint(
                fields=("user", "iso_year", "iso_week"),
                name="unique_weekly_goal_reward_per_user_week",
            ),
        ),
    ]
