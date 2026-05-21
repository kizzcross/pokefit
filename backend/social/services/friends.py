from django.contrib.auth import get_user_model
from django.db.models import Q

from social.choices import FriendshipStatus
from social.models import Friendship, MAX_FRIENDS

User = get_user_model()


def display_name(user) -> str:
    nickname = getattr(user, "nickname", None) or ""
    if nickname:
        return nickname
    email = user.email or ""
    return email.split("@")[0] if "@" in email else email or f"Treinador {user.pk}"


def user_public_profile(user, *, include_email: bool = False) -> dict:
    from users.trainer_sprites import trainer_sprite_for_user, trainer_sprite_url

    payload = {
        "id": user.pk,
        "nickname": getattr(user, "nickname", "") or display_name(user),
        "display_name": display_name(user),
        "trainer_sprite": trainer_sprite_for_user(user),
        "trainer_sprite_url": trainer_sprite_url(trainer_sprite_for_user(user)),
    }
    if include_email:
        payload["email"] = user.email
    return payload


def are_friends(user_a, user_b) -> bool:
    if user_a.pk == user_b.pk:
        return True
    return Friendship.objects.filter(
        Q(from_user=user_a, to_user=user_b) | Q(from_user=user_b, to_user=user_a),
        status=FriendshipStatus.ACCEPTED,
    ).exists()


def is_blocked(viewer, other) -> bool:
    return Friendship.objects.filter(
        Q(from_user=other, to_user=viewer) | Q(from_user=viewer, to_user=other),
        status=FriendshipStatus.BLOCKED,
    ).exists()


def accepted_friend_ids(user) -> list[int]:
    pairs = Friendship.objects.filter(
        Q(from_user=user) | Q(to_user=user),
        status=FriendshipStatus.ACCEPTED,
    ).values_list("from_user_id", "to_user_id")
    ids = set()
    for from_id, to_id in pairs:
        ids.add(to_id if from_id == user.pk else from_id)
    return list(ids)


def count_accepted_friends(user) -> int:
    return len(accepted_friend_ids(user))


def can_send_friend_request(user) -> bool:
    return count_accepted_friends(user) < MAX_FRIENDS
