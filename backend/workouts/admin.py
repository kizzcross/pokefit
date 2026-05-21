from django.contrib import admin
from django.utils.html import format_html

from .models import Exercise, Workout, WorkoutExercise


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "muscle_group",
        "difficulty",
        "is_active",
        "image_preview",
        "created_by",
        "modified",
    )
    list_filter = ("muscle_group", "difficulty", "is_active")
    search_fields = ("name", "description", "equipment", "instructions")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created", "modified", "image_preview_large")
    raw_id_fields = ("created_by",)
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name",
                    "slug",
                    "description",
                    "instructions",
                    "muscle_group",
                    "difficulty",
                    "equipment",
                    "is_active",
                ),
            },
        ),
        (
            "Media",
            {
                "fields": ("image", "image_preview_large", "video_url"),
            },
        ),
        (
            "Audit",
            {
                "fields": ("created_by", "created", "modified"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if not obj.image:
            return "—"
        return format_html(
            '<img src="{}" style="height:48px;width:48px;object-fit:cover;border-radius:4px;" />',
            obj.image.url,
        )

    @admin.display(description="Image preview")
    def image_preview_large(self, obj):
        if not obj.image:
            return "No image uploaded."
        return format_html(
            '<img src="{}" style="max-height:240px;max-width:320px;object-fit:contain;" />',
            obj.image.url,
        )


class WorkoutExerciseInline(admin.TabularInline):
    model = WorkoutExercise
    extra = 0
    raw_id_fields = ("exercise",)
    readonly_fields = ("volume", "name", "created", "modified")


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "workout_type",
        "status",
        "started_at",
        "ended_at",
        "duration_minutes",
        "quality_score",
        "progress_score",
    )
    list_filter = ("status", "workout_type", "validation_type")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
    readonly_fields = ("created", "modified")
    inlines = (WorkoutExerciseInline,)


@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    list_display = ("id", "workout", "exercise", "name", "sets", "reps", "weight", "volume", "is_pr")
    search_fields = ("name", "exercise__name", "workout__user__email")
    raw_id_fields = ("workout", "exercise")
    readonly_fields = ("volume", "name", "created", "modified")
