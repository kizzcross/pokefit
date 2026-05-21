from django.contrib.auth import get_user_model
from rest_framework import serializers

from social.choices import FriendshipStatus
from social.models import Friendship, MAX_FRIENDS
from social.services.friends import can_send_friend_request, display_name

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    trainer_sprite_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "display_name", "trainer_sprite", "trainer_sprite_url")
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


class FriendRequestCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.strip().lower()
        try:
            target = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuário não encontrado com este e-mail.") from None

        requester = self.context["request"].user
        if target.pk == requester.pk:
            raise serializers.ValidationError("Você não pode adicionar a si mesmo.")

        if Friendship.objects.filter(
            from_user=target,
            to_user=requester,
            status=FriendshipStatus.BLOCKED,
        ).exists():
            raise serializers.ValidationError("Não foi possível enviar o pedido.")

        self.context["target_user"] = target
        return email

    def validate(self, attrs):
        requester = self.context["request"].user
        if not can_send_friend_request(requester):
            raise serializers.ValidationError(f"Limite de {MAX_FRIENDS} amigos atingido.")
        return attrs

    def create(self, validated_data):
        requester = self.context["request"].user
        target = self.context["target_user"]

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
