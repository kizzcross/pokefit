from __future__ import annotations

import uuid

from django.db import transaction
from django.utils import timezone

from gifts.choices import GiftKind, GiftStatus
from gifts.models import GiftNotification, GiftSpeciesOption
from pokemon.models import PokemonSpecies
from pokemon.services.grant import grant_pokemon_to_user


class GiftError(ValueError):
    pass


def _validate_species_ids(species_ids: list[int], *, gift_kind: str) -> list[PokemonSpecies]:
    unique_ids = list(dict.fromkeys(species_ids))
    if gift_kind == GiftKind.DIRECT:
        if len(unique_ids) != 1:
            raise GiftError("Presente direto exige exatamente 1 Pokémon.")
    elif gift_kind == GiftKind.CHOICE:
        if len(unique_ids) < 2 or len(unique_ids) > 3:
            raise GiftError("Presente com escolha exige 2 ou 3 Pokémon.")
    else:
        raise GiftError("Tipo de presente inválido.")

    species_list = list(PokemonSpecies.objects.filter(pk__in=unique_ids))
    if len(species_list) != len(unique_ids):
        raise GiftError("Um ou mais Pokémon não existem no catálogo.")
    by_id = {s.pk: s for s in species_list}
    return [by_id[pk] for pk in unique_ids]


@transaction.atomic
def send_gifts(
    *,
    sender,
    recipient_ids: list[int],
    message: str,
    gift_kind: str,
    species_ids: list[int],
) -> list[GiftNotification]:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    text = (message or "").strip()
    if not text:
        raise GiftError("Escreva uma mensagem para o presente.")
    if len(text) > 500:
        raise GiftError("Mensagem pode ter no máximo 500 caracteres.")

    unique_recipients = list(dict.fromkeys(recipient_ids))
    if not unique_recipients:
        raise GiftError("Selecione pelo menos um destinatário.")

    recipients = list(User.objects.filter(pk__in=unique_recipients, is_active=True))
    if len(recipients) != len(unique_recipients):
        raise GiftError("Um ou mais usuários não foram encontrados.")

    species_ordered = _validate_species_ids(species_ids, gift_kind=gift_kind)
    batch_id = uuid.uuid4()
    created: list[GiftNotification] = []

    for recipient in recipients:
        notification = GiftNotification.objects.create(
            batch_id=batch_id,
            sender=sender,
            recipient=recipient,
            message=text,
            gift_kind=gift_kind,
            status=GiftStatus.PENDING,
        )
        for order, species in enumerate(species_ordered):
            GiftSpeciesOption.objects.create(
                notification=notification,
                species=species,
                sort_order=order,
            )
        created.append(notification)

    return created


@transaction.atomic
def claim_gift(*, notification: GiftNotification, recipient, species_id: int | None = None):
    if notification.recipient_id != recipient.pk:
        raise GiftError("Este presente não é seu.")
    if notification.status != GiftStatus.PENDING:
        raise GiftError("Este presente já foi resgatado.")

    options = list(notification.species_options.select_related("species").order_by("sort_order"))
    if not options:
        raise GiftError("Presente inválido (sem Pokémon).")

    if notification.gift_kind == GiftKind.DIRECT:
        species = options[0].species
    else:
        if species_id is None:
            raise GiftError("Escolha um dos Pokémon do presente.")
        option_map = {opt.species_id: opt.species for opt in options}
        species = option_map.get(species_id)
        if species is None:
            raise GiftError("Pokémon escolhido não faz parte deste presente.")

    user_pokemon = grant_pokemon_to_user(recipient, species)
    notification.status = GiftStatus.CLAIMED
    notification.claimed_species = species
    notification.claimed_pokemon = user_pokemon
    notification.claimed_at = timezone.now()
    notification.save(
        update_fields=[
            "status",
            "claimed_species",
            "claimed_pokemon",
            "claimed_at",
            "modified",
        ],
    )
    return notification, user_pokemon
