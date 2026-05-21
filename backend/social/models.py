from django.conf import settings
from django.db import models
from django.db.models import Q

from common.models import IndexedTimeStampedModel

from .choices import FriendshipStatus

MAX_FRIENDS = 50


class Friendship(IndexedTimeStampedModel):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendships_sent",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendships_received",
    )
    status = models.CharField(
        max_length=16,
        choices=FriendshipStatus.choices,
        default=FriendshipStatus.PENDING,
    )

    class Meta:
        verbose_name = "friendship"
        verbose_name_plural = "friendships"
        constraints = [
            models.UniqueConstraint(
                fields=["from_user", "to_user"],
                name="social_friendship_unique_pair",
            ),
            models.CheckConstraint(
                condition=~Q(from_user=models.F("to_user")),
                name="social_friendship_no_self",
            ),
        ]
        ordering = ("-created",)

    def __str__(self):
        return f"{self.from_user_id} → {self.to_user_id} ({self.status})"
