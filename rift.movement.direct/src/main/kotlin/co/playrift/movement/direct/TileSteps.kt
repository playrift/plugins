package co.playrift.movement.direct

import rift.world.Direction
import kotlin.math.abs
import kotlin.math.roundToInt

internal object TileSteps {
  private const val SECTORS = 8
  private const val SECTOR_TURN = 1.0 / SECTORS
  private const val HYSTERESIS_TURN = 10.0 / 360.0
  private const val KEEP_TURN = SECTOR_TURN / 2 + HYSTERESIS_TURN

  private val SECTOR_DIRECTIONS = listOf(
    Direction.North,
    Direction.NorthEast,
    Direction.East,
    Direction.SouthEast,
    Direction.South,
    Direction.SouthWest,
    Direction.West,
    Direction.NorthWest,
  )

  fun sectorOf(direction: Double, previous: Int?): Int {
    val nearest = Math.floorMod((direction * SECTORS).roundToInt(), SECTORS)
    if (previous == null) return nearest

    val fromPrevious = turnsBetween(direction, centreOf(previous))
    if (fromPrevious <= KEEP_TURN) return previous

    return nearest
  }

  fun directionOf(sector: Int): Direction = SECTOR_DIRECTIONS[Math.floorMod(sector, SECTORS)]

  fun next(sector: Int, direction: Double, canTraverse: (Direction) -> Boolean): Direction? {
    val straight = directionOf(sector)
    if (canTraverse(straight)) return straight

    val diagonal = Math.floorMod(sector, 2) == 1
    if (!diagonal) return null

    return slideHalves(sector, direction).firstOrNull(canTraverse)
  }

  private fun slideHalves(sector: Int, direction: Double): List<Direction> {
    val before = sector - 1
    val after = sector + 1
    val beforeIsNearer = turnsBetween(direction, centreOf(before)) <= turnsBetween(direction, centreOf(after))
    if (beforeIsNearer) return listOf(directionOf(before), directionOf(after))

    return listOf(directionOf(after), directionOf(before))
  }

  private fun centreOf(sector: Int): Double = Math.floorMod(sector, SECTORS) * SECTOR_TURN

  private fun turnsBetween(first: Double, second: Double): Double {
    val apart = abs(first - second) % 1.0

    return minOf(apart, 1.0 - apart)
  }
}
