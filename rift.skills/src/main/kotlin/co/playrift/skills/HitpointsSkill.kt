package co.playrift.skills

import rift.components.Hitpoints
import rift.components.Skill
import rift.ecs.NotPersisted
import rift.entities.Entity

public class HitpointsSkill(
  xp: Double? = null,
) : Skill("hitpoints", xp ?: 0.0) {
  private companion object {
    const val STARTING_LEVEL: Int = 10
  }

  private var startsAtStartingLevel: Boolean = xp == null

  private var starting: Boolean = false

  private val hitpoints: Hitpoints
    get() {
      val body = try { entity } catch (e: UninitializedPropertyAccessException) {
        error("HitpointsSkill is on no body yet: its level and current level are a body's Hitpoints")
      }
      return body.findComponent<Hitpoints>()
        ?: error("HitpointsSkill on $body: the body has no Hitpoints, which its level and current level are")
    }

  override var level: Int
    get() = hitpoints.max
    set(value) { hitpoints.max = value }

  @NotPersisted
  override var currentLevel: Int
    get() = hitpoints.current
    set(value) { hitpoints.current = value }

  override fun attached() {
    if (!startsAtStartingLevel) return

    startsAtStartingLevel = false
    starting = true
    xp = curve.xpFor(STARTING_LEVEL).toDouble()
    starting = false
  }

  override fun xpChanged(before: Double) {
    if (starting) return

    val reached = curve.levelFor(xp)
    if (reached != curve.levelFor(before)) hitpoints.max = reached
  }

  override fun refusal(entity: Entity): String? =
    if (entity.hasComponent<Hitpoints>()) null
    else "HitpointsSkill's level and current level are the body's Hitpoints, and this body has none: add Hitpoints(max = ...) first"
}
