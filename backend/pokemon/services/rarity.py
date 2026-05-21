from pokemon.choices import Rarity

# Base stat total (BST) tiers — stronger species = higher rarity.
BST_LEGENDARY_MIN = 520
BST_SUPER_RARE_MIN = 450
BST_RARE_MIN = 380


def base_stat_total(
    *,
    base_hp: int,
    base_attack: int,
    base_defense: int,
    base_sp_attack: int,
    base_sp_defense: int,
    base_speed: int,
) -> int:
    return (
        base_hp
        + base_attack
        + base_defense
        + base_sp_attack
        + base_sp_defense
        + base_speed
    )


def compute_rarity_from_base_stats(
    *,
    base_hp: int,
    base_attack: int,
    base_defense: int,
    base_sp_attack: int,
    base_sp_defense: int,
    base_speed: int,
) -> str:
    total = base_stat_total(
        base_hp=base_hp,
        base_attack=base_attack,
        base_defense=base_defense,
        base_sp_attack=base_sp_attack,
        base_sp_defense=base_sp_defense,
        base_speed=base_speed,
    )
    if total >= BST_LEGENDARY_MIN:
        return Rarity.LEGENDARY
    if total >= BST_SUPER_RARE_MIN:
        return Rarity.SUPER_RARE
    if total >= BST_RARE_MIN:
        return Rarity.RARE
    return Rarity.COMMON
