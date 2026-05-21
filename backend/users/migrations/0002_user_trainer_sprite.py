from django.db import migrations, models

import users.trainer_sprites


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="trainer_sprite",
            field=models.CharField(
                default=users.trainer_sprites.DEFAULT_TRAINER_SPRITE,
                help_text="Slug do sprite de treinador (Pokémon Showdown).",
                max_length=128,
            ),
        ),
    ]
