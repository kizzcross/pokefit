from django.contrib import admin

from .models import GiftNotification, GiftSpeciesOption


class GiftSpeciesOptionInline(admin.TabularInline):
    model = GiftSpeciesOption
    extra = 0


@admin.register(GiftNotification)
class GiftNotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "sender", "gift_kind", "status", "created")
    list_filter = ("status", "gift_kind")
    search_fields = ("recipient__email", "recipient__nickname", "sender__email", "message")
    inlines = [GiftSpeciesOptionInline]
