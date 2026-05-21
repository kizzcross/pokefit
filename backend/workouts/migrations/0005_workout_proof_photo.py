from django.core.validators import FileExtensionValidator
from django.db import migrations, models

import workouts.models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0004_workout_encounter"),
    ]

    operations = [
        migrations.AddField(
            model_name="workout",
            name="proof_caption",
            field=models.CharField(blank=True, default="", max_length=140),
        ),
        migrations.AddField(
            model_name="workout",
            name="proof_photo",
            field=models.ImageField(
                blank=True,
                help_text="Photo proof that the workout was completed.",
                null=True,
                upload_to=workouts.models.workout_proof_upload_to,
                validators=[
                    FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"])
                ],
            ),
        ),
        migrations.AddField(
            model_name="workout",
            name="proof_uploaded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
