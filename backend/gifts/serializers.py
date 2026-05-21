from rest_framework import serializers

from gifts.choices import GiftKind, GiftStatus
from gifts.models import GiftNotification, GiftSpeciesOption
from pokemon.serializers import PokemonSpeciesSerializer


class GiftSpeciesOptionSerializer(serializers.ModelSerializer):
    species = PokemonSpeciesSerializer(read_only=True)

    class Meta:
        model = GiftSpeciesOption
        fields = ("id", "species", "sort_order")


class GiftSenderBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()
    email = serializers.EmailField()


class GiftNotificationSerializer(serializers.ModelSerializer):
    species_options = GiftSpeciesOptionSerializer(many=True, read_only=True)
    sender_display = serializers.SerializerMethodField()
    is_pending = serializers.SerializerMethodField()

    class Meta:
        model = GiftNotification
        fields = (
            "id",
            "batch_id",
            "message",
            "gift_kind",
            "status",
            "is_pending",
            "sender_display",
            "species_options",
            "claimed_at",
            "created",
        )
        read_only_fields = fields

    def get_sender_display(self, obj):
        from social.services.friends import display_name

        return {
            "id": obj.sender_id,
            "display_name": display_name(obj.sender),
            "email": obj.sender.email,
        }

    def get_is_pending(self, obj):
        return obj.status == GiftStatus.PENDING


class GiftSendSerializer(serializers.Serializer):
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        max_length=50,
    )
    message = serializers.CharField(max_length=500, trim_whitespace=True)
    gift_kind = serializers.ChoiceField(choices=GiftKind.choices)
    species_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        max_length=3,
    )


class GiftClaimSerializer(serializers.Serializer):
    species_id = serializers.IntegerField(required=False, allow_null=True)


class GiftSendResultSerializer(serializers.Serializer):
    sent_count = serializers.IntegerField()
    batch_id = serializers.UUIDField()
    notifications = GiftNotificationSerializer(many=True)
