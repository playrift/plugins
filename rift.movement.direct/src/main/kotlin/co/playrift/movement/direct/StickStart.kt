package co.playrift.movement.direct

import co.playrift.actions.queue.Action
import co.playrift.actions.queue.ActionPriority
import co.playrift.actions.queue.ActionQueue
import co.playrift.actions.queue.Lane
import co.playrift.actions.queue.OfferResult
import co.playrift.actions.queue.createAction
import rift.entities.Entity

internal object StickStart {
  private const val NAME = "DirectWalk"

  fun admitted(entity: Entity): Boolean {
    val actionQueue = entity.findComponent<ActionQueue>()
    if (actionQueue == null) return true

    val result = actionQueue.offer(startAction())

    return result == OfferResult.Accepted
  }

  private fun startAction(): Action = createAction(name = NAME, priority = ActionPriority.Weak, lane = Lane.Before) {}
}
