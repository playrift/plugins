package co.playrift.movement.direct

import rift.components.DirectedBy
import rift.entities.Entity
import rift.world.World

internal class FakeMoveIntent(private val body: Entity) : MoveIntentReading {
  override var direction: Double = 0.0

  override var magnitude: Double = 0.0

  override var run: Boolean = false

  override var sequence: Int = 0

  override var lastAppliedSequence: Int = 0
    private set

  override var receivedAtTick: Int = 0

  var timesMarkedApplied: Int = 0
    private set

  override val none: Boolean
    get() = magnitude == 0.0

  override val active: Boolean
    get() = !none && body.findComponent<DirectedBy>()?.held != true

  override fun markApplied() {
    if (!active) return

    timesMarkedApplied++
    lastAppliedSequence = sequence
  }

  fun push(towards: Double, running: Boolean = false) {
    direction = towards
    magnitude = 1.0
    run = running
    sequence++
    receivedAtTick = World.cycle
  }

  fun release() {
    magnitude = 0.0
    sequence++
    receivedAtTick = World.cycle
  }
}
