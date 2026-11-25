package co.playrift.movement.direct

import rift.components.MoveIntent
import rift.entities.Entity

internal interface MoveIntentReading {
  val direction: Double
  val magnitude: Double
  val run: Boolean
  val sequence: Int
  val lastAppliedSequence: Int
  val receivedAtTick: Int
  val none: Boolean
  val active: Boolean

  fun markApplied()
}

internal object MoveIntents {
  var intentOf: (Entity) -> MoveIntentReading? = { entity -> entity.findComponent<MoveIntent>()?.let(::EngineMoveIntent) }
}

private class EngineMoveIntent(private val moveIntent: MoveIntent) : MoveIntentReading {
  override val direction: Double get() = moveIntent.direction

  override val magnitude: Double get() = moveIntent.magnitude

  override val run: Boolean get() = moveIntent.run

  override val sequence: Int get() = moveIntent.sequence

  override val lastAppliedSequence: Int get() = moveIntent.lastAppliedSequence

  override val receivedAtTick: Int get() = moveIntent.receivedAtTick

  override val none: Boolean get() = moveIntent.none

  override val active: Boolean get() = moveIntent.active

  override fun markApplied() {
    moveIntent.markApplied()
  }
}
