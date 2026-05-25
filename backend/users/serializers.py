from rest_framework import serializers

from users.trainer_sprites import (
    DEFAULT_TRAINER_SPRITE,
    normalize_trainer_slug,
    trainer_sprite_for_user,
    trainer_sprite_url,
)

from .models import User
from .nicknames import nickname_is_available, normalize_nickname


class UserSerializer(serializers.ModelSerializer):
    trainer_sprite_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [  # noqa: RUF012
            "id",
            "email",
            "nickname",
            "display_name",
            "trainer_sprite",
            "trainer_sprite_url",
            "invite_code",
            "is_active",
            "is_staff",
            "is_superuser",
            "created",
            "modified",
            "last_login",
        ]
        read_only_fields = (
            "id",
            "created",
            "modified",
            "last_login",
            "is_staff",
            "is_superuser",
            "trainer_sprite_url",
            "display_name",
            "invite_code",
        )

    def get_trainer_sprite_url(self, obj) -> str:
        return trainer_sprite_url(trainer_sprite_for_user(obj)) or ""

    def get_display_name(self, obj) -> str:
        from social.services.friends import display_name

        return display_name(obj)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(max_length=24, required=False)

    class Meta:
        model = User
        fields = ("nickname", "trainer_sprite")

    def validate_nickname(self, value):
        try:
            normalized = normalize_nickname(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        user = self.instance
        exclude_id = user.pk if user is not None else None
        if not nickname_is_available(normalized, exclude_user_id=exclude_id):
            raise serializers.ValidationError("Este nickname já está em uso.")
        return normalized

    def validate_trainer_sprite(self, value):
        try:
            return normalize_trainer_slug(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={"input_type": "password"}, trim_whitespace=False)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nickname = serializers.CharField(max_length=24)
    password = serializers.CharField(min_length=8, write_only=True)
    trainer_sprite = serializers.CharField(required=False, allow_blank=True)
    invite_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=12,
        write_only=True,
    )

    def validate_nickname(self, value):
        try:
            normalized = normalize_nickname(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        if not nickname_is_available(normalized):
            raise serializers.ValidationError("Este nickname já está em uso.")
        return normalized

    def validate_trainer_sprite(self, value):
        if not value:
            return DEFAULT_TRAINER_SPRITE
        try:
            return normalize_trainer_sprite(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def create(self, validated_data):
        from profiles.services.weekly_goal import get_or_create_profile
        from users.services.invite import apply_invite

        trainer_sprite = validated_data.pop("trainer_sprite", DEFAULT_TRAINER_SPRITE)
        invite_code = (validated_data.pop("invite_code", "") or "").strip()
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            nickname=validated_data["nickname"],
            trainer_sprite=trainer_sprite,
        )
        get_or_create_profile(user)
        if invite_code:
            apply_invite(user, invite_code)
        return user
