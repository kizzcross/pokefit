from django.contrib.auth import get_user_model

from rest_framework import serializers
from users.nicknames import resolve_user_by_identifier

from social.choices import FriendshipStatus
from social.models import MAX_FRIENDS, Friendship
from social.services.friends import can_send_friend_request, display_name


User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    trainer_sprite_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "nickname", "display_name", "trainer_sprite", "trainer_sprite_url")
        read_only_fields = fields

    def get_display_name(self, obj):
        return display_name(obj)

    def get_trainer_sprite_url(self, obj):
        from users.trainer_sprites import trainer_sprite_for_user, trainer_sprite_url

        return trainer_sprite_url(trainer_sprite_for_user(obj))


class FriendshipSerializer(serializers.ModelSerializer):
    from_user = UserBriefSerializer(read_only=True)
    to_user = UserBriefSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ("id", "from_user", "to_user", "status", "created", "modified")
        read_only_fields = fields


class FriendRequestsResponseSerializer(serializers.Serializer):
    incoming = FriendshipSerializer(many=True)
    outgoing = FriendshipSerializer(many=True)


class TimelineWorkoutSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    workout_type = serializers.CharField()
    total_volume = serializers.CharField(required=False, allow_blank=True)
    perceived_effort = serializers.IntegerField(required=False, allow_null=True)
    proof_photo_url = serializers.CharField(required=False, allow_null=True)
    proof_caption = serializers.CharField(required=False, allow_blank=True)
    duration_minutes = serializers.IntegerField(required=False, allow_null=True)


class TimelineEncounterSerializer(serializers.Serializer):
    species_name = serializers.CharField()
    species_pokedex_id = serializers.IntegerField()
    species_sprite = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    captured = serializers.BooleanField(required=False)
    shiny = serializers.BooleanField(required=False)


class TimelinePokemonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()
    species_name = serializers.CharField()
    species_pokedex_id = serializers.IntegerField()
    species_sprite = serializers.CharField(required=False, allow_blank=True)
    shiny = serializers.BooleanField(required=False)


class TimelineEventSerializer(serializers.Serializer):
    type = serializers.CharField()
    at = serializers.CharField()
    actor = UserBriefSerializer()
    workout = TimelineWorkoutSerializer(required=False, allow_null=True)
    encounter = TimelineEncounterSerializer(required=False, allow_null=True)
    pokemon = TimelinePokemonSerializer(required=False, allow_null=True)


class TimelineFeedSerializer(serializers.Serializer):
    results = TimelineEventSerializer(many=True)
    count = serializers.IntegerField()
    next_cursor = serializers.CharField(allow_null=True, required=False)


class FriendRequestCreateSerializer(serializers.Serializer):
    """E-mail ou nickname: use `identifier` ou o campo legado `email`."""

    email = serializers.CharField(required=False, allow_blank=True)
    identifier = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        raw = (attrs.get("identifier") or attrs.get("email") or "").strip()
        if not raw:
            raise serializers.ValidationError(
                {"identifier": "Informe o e-mail ou nickname do amigo."}
            )

        try:
            target = resolve_user_by_identifier(raw)
        except ValueError as exc:
            field = "email" if "@" in raw else "identifier"
            raise serializers.ValidationError({field: str(exc)}) from exc

        requester = self.context["request"].user
        if target.pk == requester.pk:
            raise serializers.ValidationError(
                {"identifier": "Você não pode adicionar a si mesmo."}
            )

        if Friendship.objects.filter(
            from_user=target,
            to_user=requester,
            status=FriendshipStatus.BLOCKED,
        ).exists():
            raise serializers.ValidationError(
                {"identifier": "Não foi possível enviar o pedido."}
            )

        if not can_send_friend_request(requester):
            raise serializers.ValidationError(
                {"identifier": f"Limite de {MAX_FRIENDS} amigos atingido."}
            )

        attrs["target_user"] = target
        return attrs

    def create(self, validated_data):
        requester = self.context["request"].user
        target = validated_data["target_user"]

        existing = Friendship.objects.filter(from_user=requester, to_user=target).first()
        if existing:
            if existing.status == FriendshipStatus.ACCEPTED:
                raise serializers.ValidationError("Vocês já são amigos.")
            if existing.status == FriendshipStatus.PENDING:
                raise serializers.ValidationError("Pedido já enviado.")
            if existing.status == FriendshipStatus.BLOCKED:
                raise serializers.ValidationError("Não foi possível enviar o pedido.")
            existing.status = FriendshipStatus.PENDING
            existing.save(update_fields=["status", "modified"])
            return existing

        reverse = Friendship.objects.filter(from_user=target, to_user=requester).first()
        if reverse and reverse.status == FriendshipStatus.PENDING:
            reverse.status = FriendshipStatus.ACCEPTED
            reverse.save(update_fields=["status", "modified"])
            return reverse

        if reverse and reverse.status == FriendshipStatus.ACCEPTED:
            raise serializers.ValidationError("Vocês já são amigos.")

        return Friendship.objects.create(
            from_user=requester,
            to_user=target,
            status=FriendshipStatus.PENDING,
        )
