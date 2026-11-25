package co.playrift.movement.direct

import co.playrift.actions.movement.WalkStartSystem
import co.playrift.actions.movement.WalkTo
import co.playrift.actions.queue.Action
import co.playrift.actions.queue.ActionMaintenanceSystem
import co.playrift.actions.queue.ActionOutcome
import co.playrift.actions.queue.ActionPriority
import co.playrift.actions.queue.ActionQueue
import co.playrift.actions.queue.ActionSystem
import co.playrift.actions.queue.CancelReason
import co.playrift.actions.queue.OfferResult
import co.playrift.actions.queue.createAction
import co.playrift.movement.pathfinding.bfs.BfsPathfinding
import co.playrift.movement.pathfinding.bfs.BfsPathfindingSystem
import rift.components.Position
import rift.components.WalkRequest
import rift.ecs.Anchor
import rift.entities.Actor
import rift.entities.Entity
import rift.testing.HeadlessWorld
import rift.world.LockLevel
import rift.world.Tile3
import rift.world.World
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class DirectWalkStartTest {
  companion object {
    private val SPAWN = Tile3(3200, 3200, 0)
    private val ONE_EAST = Tile3(3201, 3200, 0)
    private val ACROSS_THE_SQUARE = Tile3(3210, 3200, 0)

    private const val EAST = 0.25
    private const val NORTH_EAST = 0.125

    private const val SETTLE_LIMIT = 60
    private const val WALK_END_CYCLES = 2
    private const val STAND_IN_MODAL = "OpenModal"
    private const val STAND_IN_INTERACTION = "Interact"
    private const val STAND_IN_LOCK = "Locked"

    private val intents = HashMap<Entity, FakeMoveIntent>()

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.actions.queue", "rift.movement.pathfinding", "rift.movement.pathfinding.bfs", "rift.actions.movement", "rift.movement.direct")
      World.composeAnchor(Anchor.AfterInput, WalkStartSystem)
      World.composeAnchor(Anchor.MovementPlan, DirectWalkSystem)
      World.composeAnchor(Anchor.MovementRoute, BfsPathfindingSystem)
      World.composeAnchor(Anchor.AfterMovement, ActionSystem, ActionMaintenanceSystem)
      MoveIntents.intentOf = { entity -> intents[entity] }
    }
  }

  private fun walker(): Actor {
    val actor = HeadlessWorld.login().actor
    assertEquals(SPAWN, tileOf(actor))

    if (!actor.hasComponent<ActionQueue>()) actor.addComponent(ActionQueue())
    actor.addComponent(BfsPathfinding())
    intents[actor] = FakeMoveIntent(actor)
    return actor
  }

  private fun intentOf(actor: Actor): FakeMoveIntent = intents.getValue(actor)

  private fun queueOf(actor: Actor): ActionQueue = actor.getComponent<ActionQueue>()

  private fun tileOf(actor: Actor): Tile3 = actor.getComponent<Position>().tile

  private fun standInModal(): Action = createAction(name = STAND_IN_MODAL, priority = ActionPriority.Weak) {
    waitUntil { false }
  }

  private fun cancelledFor(action: Action): CancelReason? = (action.outcome as? ActionOutcome.Cancelled)?.reason

  private fun walkUntil(actor: Actor, tile: Tile3) {
    for (cycle in 1..SETTLE_LIMIT) {
      HeadlessWorld.cycle()
      if (tileOf(actor) == tile) return
    }
  }

  @Test
  fun `a stick start cancels a low-priority action, as a click closes the bank`() {
    val actor = walker()
    val modal = standInModal()
    assertSame(OfferResult.Accepted, queueOf(actor).offer(modal))
    HeadlessWorld.cycle()
    assertTrue(modal.started)

    intentOf(actor).push(EAST)
    HeadlessWorld.cycle()
    assertNotNull(cancelledFor(modal))
    assertEquals(ONE_EAST, tileOf(actor))
  }

  @Test
  fun `a stick start drops a queued walk and the interaction riding on it`() {
    val actor = walker()
    var interacted = false
    val walk = WalkTo(ACROSS_THE_SQUARE).then { createAction(name = STAND_IN_INTERACTION) { interacted = true } }
    queueOf(actor).offer(walk)
    HeadlessWorld.cycle()
    assertTrue(walk.started)

    val intent = intentOf(actor)
    intent.push(EAST)
    HeadlessWorld.cycle()
    intent.release()
    HeadlessWorld.cycle(SETTLE_LIMIT)

    assertEquals(CancelReason.Superseded, cancelledFor(walk))
    assertFalse(interacted)
  }

  @Test
  fun `a click after a stick start supersedes it and is walked`() {
    val actor = walker()
    val intent = intentOf(actor)
    intent.push(EAST)
    HeadlessWorld.cycle()
    assertEquals(ONE_EAST, tileOf(actor))

    assertFalse(World.collisionView(actor).isBlocked(ACROSS_THE_SQUARE))
    actor.replaceComponent(WalkRequest(ACROSS_THE_SQUARE))
    intent.release()
    HeadlessWorld.cycle()
    val click = queueOf(actor).before
    assertEquals("WalkTo", click?.name)

    walkUntil(actor, ACROSS_THE_SQUARE)
    assertEquals(ACROSS_THE_SQUARE, tileOf(actor))

    HeadlessWorld.cycle(WALK_END_CYCLES)
    assertEquals(ActionOutcome.Resolved, click?.outcome)
  }

  @Test
  fun `a body with no action queue still walks`() {
    val actor = walker()
    actor.removeComponent<ActionQueue>()
    intentOf(actor).push(EAST)

    HeadlessWorld.cycle()
    assertEquals(ONE_EAST, tileOf(actor))
  }

  @Test
  fun `turning the stick while it is held offers nothing new`() {
    val actor = walker()
    val intent = intentOf(actor)
    intent.push(EAST)
    HeadlessWorld.cycle()

    val modal = standInModal()
    queueOf(actor).offer(modal)
    HeadlessWorld.cycle()
    assertTrue(modal.started)

    intent.push(NORTH_EAST)
    HeadlessWorld.cycle(2)
    assertNull(modal.outcome)
  }

  @Test
  fun `a stick start the queue refuses walks nothing, as a refused click walks nothing`() {
    val actor = walker()
    val locked = createAction(name = STAND_IN_LOCK, priority = ActionPriority.Normal) {
      lock(LockLevel.Locked)
      waitUntil { false }
    }
    queueOf(actor).offer(locked)
    HeadlessWorld.cycle()
    assertTrue(locked.started)

    intentOf(actor).push(EAST)
    HeadlessWorld.cycle(2)
    assertEquals(SPAWN, tileOf(actor))
  }
}
