import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Friendship",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("declined", "Declined"),
                            ("blocked", "Blocked"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                (
                    "from_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="friendships_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "to_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="friendships_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "friendship",
                "verbose_name_plural": "friendships",
                "ordering": ("-created",),
            },
        ),
        migrations.AddConstraint(
            model_name="friendship",
            constraint=models.UniqueConstraint(
                fields=("from_user", "to_user"),
                name="social_friendship_unique_pair",
            ),
        ),
        migrations.AddConstraint(
            model_name="friendship",
            constraint=models.CheckConstraint(
                condition=models.Q(("from_user", models.F("to_user")), _negated=True),
                name="social_friendship_no_self",
            ),
        ),
    ]
