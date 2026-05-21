import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0002_weeklygoalreward"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WeeklyGoal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                ("iso_year", models.PositiveSmallIntegerField()),
                ("iso_week", models.PositiveSmallIntegerField()),
                (
                    "target",
                    models.PositiveSmallIntegerField(
                        help_text="Treinos finalizados necessários nesta semana.",
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(7),
                        ],
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weekly_goals",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "weekly goal",
                "verbose_name_plural": "weekly goals",
            },
        ),
        migrations.AddConstraint(
            model_name="weeklygoal",
            constraint=models.UniqueConstraint(
                fields=("user", "iso_year", "iso_week"),
                name="unique_weekly_goal_per_user_week",
            ),
        ),
    ]
