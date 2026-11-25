package co.playrift.movement.direct

import rift.components.Moving
import rift.ecs.Component
import rift.world.StepType
import rift.world.Tile3

internal class DirectWalking : Component() {
  var sector: Int? = null

  var moving: Moving? = null

  val planned: ArrayDeque<Tile3> = ArrayDeque()

  var plannedType: StepType = StepType.Normal

  var lastAppliedSequence: Int? = null

  var started: Boolean = false

  var refused: Boolean = false
}
