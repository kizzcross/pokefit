"""Invite/referral utilities.

A user's `invite_code` is the unique slug shared via deep link
(`/login?invite=<code>`). When somebody signs up using that code:

- the new user becomes friends with the inviter (status=ACCEPTED);
- the inviter receives a gift containing a random Pokémon species,
  sent on behalf of the new user, so the existing gift inbox UX handles
  the reveal/claim.

The reward Pokémon is sampled across the entire species catalog
(any rarity, including legendaries) per product decision.
"""

from __future__ import annotations

import random
import secrets

from django.db import transaction


# Ambiguous-looking characters (0/O, 1/I/L) are excluded on purpose so the
# code stays readable when shared via text/voice.
_INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 8


class InviteError(ValueError):
    """Raised when an invite_code cannot be applied (unknown, self, etc.)."""


def generate_invite_code(length: int = INVITE_CODE_LENGTH) -> str:
    return "".join(secrets.choice(_INVITE_CODE_ALPHABET) for _ in range(length))


def generate_unique_invite_code(length: int = INVITE_CODE_LENGTH, max_attempts: int = 12) -> str:
    """Generate a code guaranteed to be unique in the `users.User` table."""
    from users.models import User

    for _ in range(max_attempts):
        code = generate_invite_code(length)
        if not User.objects.filter(invite_code=code).exists():
            return code
    # Fall back to a longer code; collision odds become astronomically low.
    return generate_invite_code(length + 4)


def normalize_invite_code(raw: str | None) -> str:
    return (raw or "").strip().upper()


def find_inviter(code: str | None):
    """Return the `User` matching `code` (case-insensitive), or `None`."""
    from users.models import User

    normalized = normalize_invite_code(code)
    if not normalized:
        return None
    return User.objects.filter(invite_code__iexact=normalized, is_active=True).first()


def _pick_invite_reward_species():
    """Pick a random species across the entire catalog (any rarity)."""
    from pokemon.models import PokemonSpecies

    species_ids = list(PokemonSpecies.objects.values_list("pk", flat=True))
    if not species_ids:
        return None
    species_id = random.choice(species_ids)
    return PokemonSpecies.objects.filter(pk=species_id).first()


def _ensure_friendship(user_a, user_b) -> None:
    """Create an ACCEPTED friendship between two users if none exists yet.

    Skips when the pair is already linked in either direction (any status),
    so it never overrides BLOCKED relationships either.
    """
    from django.db.models import Q

    from social.choices import FriendshipStatus
    from social.models import Friendship

    if user_a.pk == user_b.pk:
        return

    existing = Friendship.objects.filter(
        Q(from_user=user_a, to_user=user_b) | Q(from_user=user_b, to_user=user_a),
    ).first()
    if existing is not None:
        if existing.status != FriendshipStatus.ACCEPTED and existing.status != FriendshipStatus.BLOCKED:
            existing.status = FriendshipStatus.ACCEPTED
            existing.save(update_fields=["status", "modified"])
        return

    Friendship.objects.create(
        from_user=user_a,
        to_user=user_b,
        status=FriendshipStatus.ACCEPTED,
    )


@transaction.atomic
def apply_invite(invitee, raw_code: str | None):
    """Wire the invitee to the inviter, create the friendship, send the gift.

    Returns the inviter `User` (or `None` if the code was blank/unknown).
    Idempotent per invitee: a user can only be linked to one inviter.
    """
    from gifts.choices import GiftKind
    from gifts.services import send_gifts

    if invitee.invited_by_id is not None:
        return invitee.invited_by

    inviter = find_inviter(raw_code)
    if inviter is None:
        return None
    if inviter.pk == invitee.pk:
        return None

    invitee.invited_by = inviter
    invitee.save(update_fields=["invited_by", "modified"])

    _ensure_friendship(invitee, inviter)

    species = _pick_invite_reward_species()
    if species is None:
        # Catalog is empty (only possible on a fresh DB); skip the gift but
        # keep the referral link/friendship.
        return inviter

    from social.services.friends import display_name

    invitee_name = display_name(invitee)
    send_gifts(
        sender=invitee,
        recipient_ids=[inviter.pk],
        message=(
            f"@{invitee_name} acabou de entrar no Pokefit usando seu link! "
            "Aqui está um Pokémon de boas-vindas pra você."
        ),
        gift_kind=GiftKind.DIRECT,
        species_ids=[species.pk],
    )
    return inviter
