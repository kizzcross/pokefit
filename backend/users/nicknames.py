"""Nickname normalization, validation and user lookup."""

from __future__ import annotations

import re

from django.contrib.auth import get_user_model

User = get_user_model()

NICKNAME_RE = re.compile(r"^[a-z][a-z0-9_]{2,23}$")
RESERVED_NICKNAMES = frozenset(
    {
        "admin",
        "api",
        "login",
        "logout",
        "me",
        "register",
        "root",
        "staff",
        "support",
        "timeline",
        "treinador",
    }
)


def normalize_nickname(raw: str) -> str:
    """Lowercase slug; raises ValueError with a user-facing message."""
    value = (raw or "").strip().lower()
    if not value:
        raise ValueError("Informe um nickname.")
    if len(value) < 3:
        raise ValueError("Nickname precisa ter pelo menos 3 caracteres.")
    if len(value) > 24:
        raise ValueError("Nickname pode ter no máximo 24 caracteres.")
    if not NICKNAME_RE.match(value):
        raise ValueError(
            "Use só letras minúsculas, números e _. Deve começar com letra (ex: kizz_cross)."
        )
    if value in RESERVED_NICKNAMES:
        raise ValueError("Este nickname não está disponível.")
    return value


def nickname_is_available(nickname: str, *, exclude_user_id: int | None = None) -> bool:
    qs = User.objects.filter(nickname=nickname)
    if exclude_user_id is not None:
        qs = qs.exclude(pk=exclude_user_id)
    return not qs.exists()


def resolve_user_by_identifier(identifier: str) -> User:
    """Find user by email (contains @) or nickname."""
    raw = (identifier or "").strip()
    if not raw:
        raise ValueError("Informe um e-mail ou nickname.")

    if "@" in raw:
        try:
            return User.objects.get(email__iexact=raw.lower())
        except User.DoesNotExist as exc:
            raise ValueError("Usuário não encontrado com este e-mail.") from exc

    nickname = normalize_nickname(raw)
    try:
        return User.objects.get(nickname=nickname)
    except User.DoesNotExist as exc:
        raise ValueError("Usuário não encontrado com este nickname.") from exc
