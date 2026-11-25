package co.playrift.movement.direct

import rift.components.Moving
import rift.components.Position
import rift.entities.Actor
import rift.testing.HeadlessWorld
import rift.world.StepType
import rift.world.Tile3
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import org.junit.jupiter.api.BeforeAll

class DirectWalkQueueTest {
  companion object {
    private val SPAWN = Tile3(3200, 3200, 0)
    private val ONE_EAST = Tile3(3201, 3200, 0)
    private val TWO_EAST = Tile3(3202, 3200, 0)
    private val THREE_EAST = Tile3(3203, 3200, 0)

    private const val EAST = 0.25
    private const val DRAIN_CYCLES = 4

    private val intents = HashMap<Actor, FakeMoveIntent>()

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.actions.queue", "rift.movement.direct")
      MoveIntents.intentOf = { entity -> intents[entity] }
    }
  }

  private fun walker(): Actor {
    val actor = HeadlessWorld.login().actor
    assertEquals(SPAWN, tileOf(actor))

    intents[actor] = FakeMoveIntent(actor)
    return actor
  }

  private fun tileOf(actor: Actor): Tile3 = actor.getComponent<Position>().tile

  private fun plan(actor: Actor, times: Int) {
    repeat(times) { DirectWalk.walk(actor, actor.getComponent<Position>()) }
  }

  @Test
  fun `with more than one of its own steps left it adds none`() {
    val actor = walker()
    intents.getValue(actor).push(EAST)

    plan(actor, 3)
    HeadlessWorld.cycle(DRAIN_CYCLES)
    assertEquals(TWO_EAST, tileOf(actor))
    assertFalse(actor.hasComponent<Moving>())
  }

  @Test
  fun `released, it finishes the step under way and clears the rest of its own`() {
    val actor = walker()
    val intent = intents.getValue(actor)
    intent.push(EAST)
    plan(actor, 2)

    intent.release()
    plan(actor, 1)
    HeadlessWorld.cycle(DRAIN_CYCLES)
    assertEquals(ONE_EAST, tileOf(actor))
    assertFalse(actor.hasComponent<Moving>())
  }

  @Test
  fun `steps it did not add are never cleared`() {
    val actor = walker()
    val intent = intents.getValue(actor)
    val moving = actor.addComponent(Moving())
    moving.addStep(ONE_EAST, StepType.Normal)
    moving.addStep(TWO_EAST, StepType.Normal)
    moving.addStep(THREE_EAST, StepType.Normal)

    intent.push(EAST)
    plan(actor, 1)
    intent.release()
    plan(actor, 1)
    HeadlessWorld.cycle(DRAIN_CYCLES)
    assertEquals(THREE_EAST, tileOf(actor))
  }
}
