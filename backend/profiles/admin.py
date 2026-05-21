from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "training_stage",
        "goal",
        "weekly_frequency",
        "current_streak",
        "created",
        "modified",
    )
    list_filter = ("training_stage", "goal")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
    readonly_fields = ("created", "modified")
