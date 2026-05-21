import uuid

from django.conf import settings
from django.db import models

from common.models import IndexedTimeStampedModel

from .choices import GiftKind, GiftStatus


class GiftNotification(IndexedTimeStampedModel):
    batch_id = models.UUIDField(default=uuid.uuid4, db_index=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gifts_sent",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gift_notifications",
    )
    message = models.TextField(max_length=500)
    gift_kind = models.CharField(max_length=16, choices=GiftKind.choices)
    status = models.CharField(
        max_length=16,
        choices=GiftStatus.choices,
        default=GiftStatus.PENDING,
        db_index=True,
    )
    claimed_species = models.ForeignKey(
        "pokemon.PokemonSpecies",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    claimed_pokemon = models.ForeignKey(
        "pokemon.UserPokemon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    claimed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created",)
        indexes = [
            models.Index(fields=["recipient", "status", "-created"]),
        ]

    def __str__(self):
        return f"Gift to {self.recipient_id} ({self.status})"


class GiftSpeciesOption(models.Model):
    notification = models.ForeignKey(
        GiftNotification,
        on_delete=models.CASCADE,
        related_name="species_options",
    )
    species = models.ForeignKey(
        "pokemon.PokemonSpecies",
        on_delete=models.PROTECT,
        related_name="+",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["notification", "species"],
                name="gift_species_option_unique_per_notification",
            ),
        ]

    def __str__(self):
        return f"{self.species.name} (gift #{self.notification_id})"
