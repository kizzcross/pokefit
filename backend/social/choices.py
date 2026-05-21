from django.db import models
from django.utils.translation import gettext_lazy as _


class FriendshipStatus(models.TextChoices):
    PENDING = "pending", _("Pending")
    ACCEPTED = "accepted", _("Accepted")
    DECLINED = "declined", _("Declined")
    BLOCKED = "blocked", _("Blocked")
