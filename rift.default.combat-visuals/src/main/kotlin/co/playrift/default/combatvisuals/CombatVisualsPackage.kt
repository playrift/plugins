package co.playrift.default.combatvisuals

import rift.ecs.System
import rift.packages.RiftPackage

/** The combat visuals. */
public object CombatVisualsPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  /** The head-icon sprite each slot names. */
  public val SPRITES: Map<String, String> = linkedMapOf(
    "head_icons_pk" to Assets.Sprite.headicons_pk.name,
    "head_icons_prayer" to Assets.Sprite.headicons_prayer.name,
    "head_icons_hint" to Assets.Sprite.headicons_hint.name,
  )

  override fun load() {
    CombatVisuals.Hitsplat.entries.forEach { it.hitsplat.id }
    CombatVisuals.HealthBar.entries.forEach { it.healthBar.width }
    CombatVisuals.Overhead.entries.forEach { check(it.overhead.slot == it.slot) { "rift.default.combat-visuals: overhead sprite '${it.baseName}' is not worn in the ${it.slot.word} slot" } }
  }
}
