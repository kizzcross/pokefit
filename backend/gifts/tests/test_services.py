from model_bakery import baker

from common.utils.tests import TestCaseUtils
from gifts.choices import GiftKind, GiftStatus
from gifts.services import GiftError, claim_gift, send_gifts
from pokemon.models import PokemonSpecies, UserPokemon


class GiftServicesTest(TestCaseUtils):
    def setUp(self):
        super().setUp()
        self.recipient = baker.make(
            "users.User",
            email="gift_recipient@test.com",
            nickname="gift_recipient",
            invited_by=None,
            _fill_optional=True,
        )
        self.species_a = baker.make(
            PokemonSpecies,
            pokedex_id=10,
            name="caterpie",
            type_1="bug",
            base_hp=45,
            base_attack=30,
            base_defense=35,
            base_sp_attack=20,
            base_sp_defense=20,
            base_speed=45,
        )
        self.species_b = baker.make(
            PokemonSpecies,
            pokedex_id=11,
            name="metapod",
            type_1="bug",
            base_hp=50,
            base_attack=20,
            base_defense=55,
            base_sp_attack=25,
            base_sp_defense=25,
            base_speed=30,
        )

    def test_send_direct_gift_and_claim(self):
        notifications = send_gifts(
            sender=self.user,
            recipient_ids=[self.recipient.pk],
            message="Parabéns pelo treino!",
            gift_kind=GiftKind.DIRECT,
            species_ids=[self.species_a.pk],
        )
        self.assertEqual(len(notifications), 1)
        gift = notifications[0]
        self.assertEqual(gift.status, GiftStatus.PENDING)

        gift, pokemon = claim_gift(notification=gift, recipient=self.recipient)
        self.assertEqual(gift.status, GiftStatus.CLAIMED)
        self.assertEqual(pokemon.species_id, self.species_a.pk)
        self.assertTrue(UserPokemon.objects.filter(user=self.recipient, pk=pokemon.pk).exists())

    def test_send_choice_gift_requires_pick(self):
        notifications = send_gifts(
            sender=self.user,
            recipient_ids=[self.recipient.pk],
            message="Escolha seu presente",
            gift_kind=GiftKind.CHOICE,
            species_ids=[self.species_a.pk, self.species_b.pk],
        )
        gift = notifications[0]
        with self.assertRaises(GiftError):
            claim_gift(notification=gift, recipient=self.recipient, species_id=None)

        gift, pokemon = claim_gift(
            notification=gift,
            recipient=self.recipient,
            species_id=self.species_b.pk,
        )
        self.assertEqual(pokemon.species_id, self.species_b.pk)

    def test_send_self_gift(self):
        notifications = send_gifts(
            sender=self.user,
            recipient_ids=[self.user.pk],
            message="presente pra mim",
            gift_kind=GiftKind.DIRECT,
            species_ids=[self.species_a.pk],
        )
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0].recipient_id, self.user.pk)
        self.assertEqual(notifications[0].sender_id, self.user.pk)
