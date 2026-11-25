package co.playrift.movement.direct

import co.playrift.movement.pathfinding.bfs.BfsPathfinding
import co.playrift.movement.pathfinding.bfs.BfsPathfindingSystem
import rift.components.DirectedBy
import rift.components.Moving
import rift.components.Position
import rift.components.Running
import rift.ecs.Anchor
import rift.ecs.FacingSystem
import rift.entities.Actor
import rift.entities.Director
import rift.entities.Entity
import rift.sequences.SequenceBuilder
import rift.testing.HeadlessWorld
import rift.world.Direction
import rift.world.Tile3
import rift.world.World
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class DirectWalkTest {
  companion object {
    private val SPAWN = Tile3(3200, 3200, 0)
    private val ONE_EAST = Tile3(3201, 3200, 0)
    private val TWO_EAST = Tile3(3202, 3200, 0)
    private val THREE_EAST = Tile3(3203, 3200, 0)
    private val ACROSS_THE_SQUARE = Tile3(3210, 3200, 0)
    private val BEFORE_THE_WALL = Tile3(3229, 3200, 0)

    private const val NORTH = 0.0
    private const val NORTH_EAST = 0.125
    private const val EAST = 0.25

    private const val SETTLE_LIMIT = 60
    private const val HELD_SCENE = "held_scene"

    private val intents = HashMap<Entity, FakeMoveIntent>()

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.actions.queue", "rift.movement.pathfinding", "rift.movement.pathfinding.bfs", "rift.movement.direct")
      World.composeAnchor(Anchor.MovementPlan, DirectWalkSystem)
      World.composeAnchor(Anchor.MovementRoute, BfsPathfindingSystem)
      World.composeAnchor(Anchor.Main, FacingSystem)
      MoveIntents.intentOf = { entity -> intents[entity] }
    }
  }

  private fun walker(): Actor {
    val actor = HeadlessWorld.login().actor
    assertEquals(SPAWN, tileOf(actor))

    intents[actor] = FakeMoveIntent(actor)
    return actor
  }

  private fun intentOf(actor: Actor): FakeMoveIntent = intents.getValue(actor)

  private fun tileOf(actor: Actor): Tile3 = actor.getComponent<Position>().tile

  private fun walkUntil(actor: Actor, tile: Tile3) {
    for (cycle in 1..SETTLE_LIMIT) {
      HeadlessWorld.cycle()
      if (tileOf(actor) == tile) return
    }
  }

  @Test
  fun `a held intent walks one tile a tick the way it points`() {
    val actor = walker()
    intentOf(actor).push(EAST)

    HeadlessWorld.cycle()
    assertEquals(ONE_EAST, tileOf(actor))

    HeadlessWorld.cycle()
    assertEquals(TWO_EAST, tileOf(actor))
  }

  @Test
  fun `blocked outright, the player turns to face that way and does not step`() {
    val actor = walker()
    assertFalse(World.collisionView(actor).canTraverse(BEFORE_THE_WALL, Direction.East))

    intentOf(actor).push(EAST)
    walkUntil(actor, BEFORE_THE_WALL)
    assertEquals(BEFORE_THE_WALL, tileOf(actor))

    val position = actor.getComponent<Position>()
    position.facingAngle = Direction.West.angle

    HeadlessWorld.cycle(2)
    assertEquals(BEFORE_THE_WALL, tileOf(actor))
    assertEquals(Direction.East.angle, position.facingAngle)
  }

  @Test
  fun `with the run orb on it takes two steps a tick`() {
    val actor = walker()
    actor.addComponent(Running())
    intentOf(actor).push(EAST)

    HeadlessWorld.cycle()
    assertEquals(TWO_EAST, tileOf(actor))
    assertTrue(actor.hasComponent<Running>())
  }

  @Test
  fun `with the intent asking to run it takes two steps a tick, and never turns the run orb on`() {
    val actor = walker()
    intentOf(actor).push(EAST, running = true)

    HeadlessWorld.cycle()
    assertEquals(TWO_EAST, tileOf(actor))
    assertFalse(actor.hasComponent<Running>())
  }

  @Test
  fun `released, the player stops once the step under way is done`() {
    val actor = walker()
    val intent = intentOf(actor)
    intent.push(EAST)
    HeadlessWorld.cycle(3)
    assertEquals(THREE_EAST, tileOf(actor))

    intent.release()
    HeadlessWorld.cycle(3)
    assertEquals(THREE_EAST, tileOf(actor))
    assertFalse(actor.hasComponent<Moving>())
  }

  @Test
  fun `a click route that replaced its walk is walked to its end, the intent released`() {
    val actor = walker()
    actor.addComponent(BfsPathfinding())
    val intent = intentOf(actor)
    intent.push(EAST)
    HeadlessWorld.cycle()
    assertEquals(ONE_EAST, tileOf(actor))

    actor.replaceComponent(Moving(target = ACROSS_THE_SQUARE))
    intent.release()
    walkUntil(actor, ACROSS_THE_SQUARE)
    assertEquals(ACROSS_THE_SQUARE, tileOf(actor))
  }

  @Test
  fun `a click route is not fought by an intent still held`() {
    val actor = walker()
    actor.addComponent(BfsPathfinding())
    val intent = intentOf(actor)
    intent.push(EAST)
    HeadlessWorld.cycle()

    actor.replaceComponent(Moving(target = ACROSS_THE_SQUARE))
    intent.push(NORTH)
    walkUntil(actor, ACROSS_THE_SQUARE)
    assertEquals(ACROSS_THE_SQUARE, tileOf(actor))
  }

  @Test
  fun `a body a scene holds is not walked`() {
    val actor = walker()
    val director = Director.create(SequenceBuilder(HELD_SCENE).apply { step("hold") { manual() } }.build())
    actor.addComponent(DirectedBy(director.uuid, null, true))
    val intent = intentOf(actor)
    intent.push(EAST)

    HeadlessWorld.cycle(3)
    assertEquals(SPAWN, tileOf(actor))
    assertNotEquals(intent.sequence, intent.lastAppliedSequence)
  }

  @Test
  fun `acting on an intent advances its last applied sequence through the seam`() {
    val actor = walker()
    val intent = intentOf(actor)
    intent.push(EAST)
    assertNotEquals(intent.sequence, intent.lastAppliedSequence)

    HeadlessWorld.cycle()
    assertEquals(intent.sequence, intent.lastAppliedSequence)

    intent.push(NORTH_EAST)
    HeadlessWorld.cycle()
    assertEquals(intent.sequence, intent.lastAppliedSequence)
    assertEquals(2, intent.timesMarkedApplied)
  }
}
