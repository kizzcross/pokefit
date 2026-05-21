from django.db import models


class GiftStatus(models.TextChoices):
    PENDING = "pending", "Pendente"
    CLAIMED = "claimed", "Resgatado"


class GiftKind(models.TextChoices):
    DIRECT = "direct", "Presente direto"
    CHOICE = "choice", "Escolher um Pokémon"
