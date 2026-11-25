package co.playrift.movement.direct

import rift.components.Facing
import rift.components.Moving
import rift.components.Position
import rift.components.Running
import rift.entities.Entity
import rift.world.CollisionView
import rift.world.StepType
import rift.world.Tile3
import rift.world.World

internal object DirectWalk {
  private const val WALK_STEPS = 1
  private const val RUN_STEPS = 2
  private const val MOST_STEPS_LEFT_TO_PLAN = 1

  fun walk(entity: Entity, position: Position) {
    val intent = MoveIntents.intentOf(entity)
    if (intent == null || !held(intent)) {
      release(entity)
      return
    }

    val walking = entity.findComponent<DirectWalking>() ?: entity.addComponent(DirectWalking())
    if (!walking.started) start(entity, walking)
    if (walking.refused) return

    step(entity, position, intent, walking)
  }

  private fun held(intent: MoveIntentReading): Boolean = intent.active

  private fun release(entity: Entity) {
    val walking = entity.findComponent<DirectWalking>()
    if (walking == null) return

    walking.sector = null
    walking.started = false
    walking.refused = false

    val moving = entity.findComponent<Moving>()
    val stepsLeft = ownStepsLeft(walking, moving)
    if (moving == null || stepsLeft <= 1) return

    val underWay = walking.planned.first()
    moving.clear()
    moving.addStep(underWay, walking.plannedType)
    walking.planned.clear()
    walking.planned.add(underWay)
  }

  private fun start(entity: Entity, walking: DirectWalking) {
    walking.started = true
    walking.refused = !StickStart.admitted(entity)
  }

  private fun step(entity: Entity, position: Position, intent: MoveIntentReading, walking: DirectWalking) {
    val moving = entity.findComponent<Moving>()
    if (moving != null && moving !== walking.moving && (moving.target != null || moving.hasDestination())) {
      walking.moving = null
      walking.planned.clear()
      return
    }

    val stepsLeft = ownStepsLeft(walking, moving)
    if (stepsLeft > MOST_STEPS_LEFT_TO_PLAN) return

    val sector = TileSteps.sectorOf(intent.direction, walking.sector)
    walking.sector = sector

    val running = entity.hasComponent<Running>() || intent.run
    val stepCount = if (running) RUN_STEPS else WALK_STEPS
    val stepType = if (running) StepType.ForcedRun else StepType.Normal
    val from = walking.planned.lastOrNull() ?: position.tile
    val tiles = plan(from, stepCount, sector, intent.direction, World.collisionView(entity))

    if (tiles.isEmpty() && stepsLeft == 0) face(entity, position, from, sector)
    if (tiles.isNotEmpty()) queue(entity, moving, walking, tiles, stepType)

    applied(intent, walking)
  }

  private fun plan(from: Tile3, stepCount: Int, sector: Int, direction: Double, collisionView: CollisionView): List<Tile3> {
    if (stepCount == 0) return emptyList()

    val next = TileSteps.next(sector, direction) { step -> collisionView.canTraverse(from, step) }
    if (next == null) return emptyList()

    val tile = from.transform(next.getDeltaX(), next.getDeltaZ())

    return listOf(tile) + plan(tile, stepCount - 1, sector, direction, collisionView)
  }

  private fun queue(entity: Entity, moving: Moving?, walking: DirectWalking, tiles: List<Tile3>, stepType: StepType) {
    val own = ownMoving(entity, moving, walking)
    for (tile in tiles) own.addStep(tile, stepType)

    walking.planned.addAll(tiles)
    walking.plannedType = stepType
  }

  private fun ownMoving(entity: Entity, moving: Moving?, walking: DirectWalking): Moving {
    if (moving != null && moving === walking.moving) return moving

    val fresh = Moving()
    if (moving == null) entity.addComponent(fresh) else entity.replaceComponent(fresh)

    walking.moving = fresh
    walking.planned.clear()
    return fresh
  }

  private fun ownStepsLeft(walking: DirectWalking, moving: Moving?): Int {
    if (moving == null || moving !== walking.moving) {
      walking.planned.clear()
      return 0
    }

    val stepsLeft = moving.stepsLeft
    while (walking.planned.size > stepsLeft) walking.planned.removeFirst()

    return stepsLeft
  }

  private fun face(entity: Entity, position: Position, from: Tile3, sector: Int) {
    val direction = TileSteps.directionOf(sector)
    if (position.facingAngle == direction.angle) return

    entity.replaceComponent(Facing(square = from.transform(direction.getDeltaX(), direction.getDeltaZ())))
  }

  private fun applied(intent: MoveIntentReading, walking: DirectWalking) {
    if (intent.sequence == intent.lastAppliedSequence) return

    intent.markApplied()
    walking.lastAppliedSequence = intent.sequence
  }
}
