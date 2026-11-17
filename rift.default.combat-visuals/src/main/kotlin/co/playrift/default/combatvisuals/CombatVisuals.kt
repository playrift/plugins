package co.playrift.default.combatvisuals

import rift.assets.OverheadSlot
import rift.assets.HealthBarDefinition
import rift.assets.HitsplatDefinition
import rift.assets.OverheadSpriteDefinition

/** What a player sees in combat. */
public object CombatVisuals {
  /** A hitsplat. */
  public enum class Hitsplat(private val handle: HitsplatDefinition) {
    damage(Assets.Hitsplat.hitsplat_16),
    damage_others(Assets.Hitsplat.hitsplat_17),
    damage_max(Assets.Hitsplat.hitsplat_43),
    block(Assets.Hitsplat.hitsplat_12),
    block_others(Assets.Hitsplat.hitsplat_13),
    poison(Assets.Hitsplat.hitsplat_65),
    poison_others(Assets.Hitsplat.hitsplat_66),
    poison_max(Assets.Hitsplat.hitsplat_2),
    venom(Assets.Hitsplat.hitsplat_5),
    disease(Assets.Hitsplat.hitsplat_4),
    disease_blocked(Assets.Hitsplat.hitsplat_3),
    heal(Assets.Hitsplat.hitsplat_6);

    /** Its base asset name. */
    public val baseName: String get() = handle.name

    /** Its hitsplat. */
    public val hitsplat: HitsplatDefinition get() = handle
  }

  /** A health bar family. */
  public enum class Family { health, shield, armour, charge }

  /** A health bar. */
  public enum class HealthBar(private val handle: HealthBarDefinition, /** Its family. */ public val family: Family, /** Its size, 1 to 8. */ public val size: Int) {
    health30(Assets.HealthBar.health_bar_0, Family.health, 1),
    health40(Assets.HealthBar.health_bar_2, Family.health, 2),
    health50(Assets.HealthBar.health_bar_16, Family.health, 3),
    health60(Assets.HealthBar.health_bar_17, Family.health, 4),
    health80(Assets.HealthBar.health_bar_18, Family.health, 5),
    health100(Assets.HealthBar.health_bar_19, Family.health, 6),
    health120(Assets.HealthBar.health_bar_20, Family.health, 7),
    health140(Assets.HealthBar.health_bar_21, Family.health, 8),
    shield30(Assets.HealthBar.health_bar_3, Family.shield, 1),
    shield40(Assets.HealthBar.health_bar_4, Family.shield, 2),
    shield50(Assets.HealthBar.health_bar_5, Family.shield, 3),
    shield60(Assets.HealthBar.health_bar_6, Family.shield, 4),
    shield80(Assets.HealthBar.health_bar_9, Family.shield, 5),
    shield100(Assets.HealthBar.health_bar_10, Family.shield, 6),
    shield120(Assets.HealthBar.health_bar_11, Family.shield, 7),
    shield140(Assets.HealthBar.health_bar_13, Family.shield, 8),
    armour30(Assets.HealthBar.health_bar_15, Family.armour, 1),
    armour40(Assets.HealthBar.health_bar_23, Family.armour, 2),
    armour50(Assets.HealthBar.health_bar_24, Family.armour, 3),
    armour60(Assets.HealthBar.health_bar_25, Family.armour, 4),
    armour80(Assets.HealthBar.health_bar_26, Family.armour, 5),
    armour100(Assets.HealthBar.health_bar_27, Family.armour, 6),
    armour120(Assets.HealthBar.health_bar_28, Family.armour, 7),
    armour140(Assets.HealthBar.health_bar_29, Family.armour, 8),
    charge30(Assets.HealthBar.health_bar_31, Family.charge, 1),
    charge40(Assets.HealthBar.health_bar_32, Family.charge, 2),
    charge50(Assets.HealthBar.health_bar_33, Family.charge, 3),
    charge60(Assets.HealthBar.health_bar_34, Family.charge, 4),
    charge80(Assets.HealthBar.health_bar_35, Family.charge, 5),
    charge100(Assets.HealthBar.health_bar_36, Family.charge, 6),
    charge120(Assets.HealthBar.health_bar_37, Family.charge, 7),
    charge140(Assets.HealthBar.health_bar_38, Family.charge, 8);

    /** Its base asset name. */
    public val baseName: String get() = handle.name

    /** Its health bar. */
    public val healthBar: HealthBarDefinition get() = handle

    public companion object {
      /** The health bar of a family and size. */
      public fun of(family: Family, size: Int): HealthBar =
        entries.firstOrNull { it.family == family && it.size == size } ?: throw IllegalArgumentException("a health bar's size is 1 to 8, not $size")
    }
  }

  /** An icon over a player's head. */
  public enum class Overhead(private val handle: OverheadSpriteDefinition, /** Where it shows over the head. */ public val slot: OverheadSlot) {
    protect_melee(Assets.OverheadSprite.protect_melee, OverheadSlot.Prayer),
    protect_ranged(Assets.OverheadSprite.protect_ranged, OverheadSlot.Prayer),
    protect_magic(Assets.OverheadSprite.protect_magic, OverheadSlot.Prayer),
    retribution(Assets.OverheadSprite.retribution, OverheadSlot.Prayer),
    smite(Assets.OverheadSprite.smite, OverheadSlot.Prayer),
    redemption(Assets.OverheadSprite.redemption, OverheadSlot.Prayer),
    protect_ranged_magic(Assets.OverheadSprite.protect_ranged_magic, OverheadSlot.Prayer),
    protect_melee_ranged(Assets.OverheadSprite.protect_melee_ranged, OverheadSlot.Prayer),
    protect_melee_magic(Assets.OverheadSprite.protect_melee_magic, OverheadSlot.Prayer),
    protect_all(Assets.OverheadSprite.protect_all, OverheadSlot.Prayer),
    wrath(Assets.OverheadSprite.wrath, OverheadSlot.Prayer),
    soul_split(Assets.OverheadSprite.soul_split, OverheadSlot.Prayer),
    deflect_melee(Assets.OverheadSprite.deflect_melee, OverheadSlot.Prayer),
    deflect_ranged(Assets.OverheadSprite.deflect_ranged, OverheadSlot.Prayer),
    deflect_magic(Assets.OverheadSprite.deflect_magic, OverheadSlot.Prayer),
    white_skull(Assets.OverheadSprite.white_skull, OverheadSlot.Skull),
    red_skull(Assets.OverheadSprite.red_skull, OverheadSlot.Skull),
    high_risk_skull(Assets.OverheadSprite.high_risk_skull, OverheadSlot.Skull),
    forinthry_surge_skull(Assets.OverheadSprite.forinthry_surge_skull, OverheadSlot.Skull),
    deadman_skull(Assets.OverheadSprite.deadman_skull, OverheadSlot.Skull),
    deadman_skull_keys_1(Assets.OverheadSprite.deadman_skull_keys_1, OverheadSlot.Skull),
    deadman_skull_keys_2(Assets.OverheadSprite.deadman_skull_keys_2, OverheadSlot.Skull),
    deadman_skull_keys_3(Assets.OverheadSprite.deadman_skull_keys_3, OverheadSlot.Skull),
    deadman_skull_keys_4(Assets.OverheadSprite.deadman_skull_keys_4, OverheadSlot.Skull),
    deadman_skull_keys_5(Assets.OverheadSprite.deadman_skull_keys_5, OverheadSlot.Skull),
    prayer_15(Assets.OverheadSprite.prayer_15, OverheadSlot.Prayer),
    prayer_16(Assets.OverheadSprite.prayer_16, OverheadSlot.Prayer),
    prayer_17(Assets.OverheadSprite.prayer_17, OverheadSlot.Prayer),
    prayer_18(Assets.OverheadSprite.prayer_18, OverheadSlot.Prayer),
    prayer_19(Assets.OverheadSprite.prayer_19, OverheadSlot.Prayer),
    prayer_20(Assets.OverheadSprite.prayer_20, OverheadSlot.Prayer),
    prayer_21(Assets.OverheadSprite.prayer_21, OverheadSlot.Prayer),
    prayer_22(Assets.OverheadSprite.prayer_22, OverheadSlot.Prayer),
    prayer_23(Assets.OverheadSprite.prayer_23, OverheadSlot.Prayer),
    skull_14(Assets.OverheadSprite.skull_14, OverheadSlot.Skull),
    skull_15(Assets.OverheadSprite.skull_15, OverheadSlot.Skull),
    skull_16(Assets.OverheadSprite.skull_16, OverheadSlot.Skull),
    skull_17(Assets.OverheadSprite.skull_17, OverheadSlot.Skull),
    skull_18(Assets.OverheadSprite.skull_18, OverheadSlot.Skull),
    skull_19(Assets.OverheadSprite.skull_19, OverheadSlot.Skull),
    skull_21(Assets.OverheadSprite.skull_21, OverheadSlot.Skull),
    skull_22(Assets.OverheadSprite.skull_22, OverheadSlot.Skull),
    skull_23(Assets.OverheadSprite.skull_23, OverheadSlot.Skull),
    skull_24(Assets.OverheadSprite.skull_24, OverheadSlot.Skull),
    skull_25(Assets.OverheadSprite.skull_25, OverheadSlot.Skull),
    skull_28(Assets.OverheadSprite.skull_28, OverheadSlot.Skull),
    skull_29(Assets.OverheadSprite.skull_29, OverheadSlot.Skull),
    skull_30(Assets.OverheadSprite.skull_30, OverheadSlot.Skull),
    skull_31(Assets.OverheadSprite.skull_31, OverheadSlot.Skull),
    skull_32(Assets.OverheadSprite.skull_32, OverheadSlot.Skull);

    /** Its overhead sprite's name. */
    public val baseName: String get() = handle.name

    /** Its overhead sprite. */
    public val overhead: OverheadSpriteDefinition get() = handle
  }
}
