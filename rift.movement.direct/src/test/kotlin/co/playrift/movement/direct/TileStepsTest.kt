package co.playrift.movement.direct

import rift.world.Direction
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TileStepsTest {
  companion object {
    private const val DEGREES_A_TURN = 360.0

    private val SECTORS = listOf(
      0.0 to Direction.North,
      0.125 to Direction.NorthEast,
      0.25 to Direction.East,
      0.375 to Direction.SouthEast,
      0.5 to Direction.South,
      0.625 to Direction.SouthWest,
      0.75 to Direction.West,
      0.875 to Direction.NorthWest,
    )
  }

  private fun turns(degrees: Double): Double = degrees / DEGREES_A_TURN

  private fun quantised(direction: Double, previous: Int?): Direction = TileSteps.directionOf(TileSteps.sectorOf(direction, previous))

  @Test
  fun `each of the eight sectors steps its own way`() {
    for ((direction, expected) in SECTORS) {
      val sector = TileSteps.sectorOf(direction, null)

      assertEquals(expected, TileSteps.directionOf(sector), "at $direction of a turn")
      assertEquals(expected, TileSteps.next(sector, direction) { true }, "at $direction of a turn")
    }

    assertEquals(Direction.North, quantised(turns(350.0), null))
    assertEquals(Direction.NorthEast, quantised(turns(30.0), null))
  }

  @Test
  fun `near a boundary it keeps the sector it had until about ten degrees past it, either way`() {
    val north = TileSteps.sectorOf(0.0, null)
    val northEast = TileSteps.sectorOf(0.125, null)

    assertEquals(Direction.North, quantised(turns(30.0), north))
    assertEquals(Direction.NorthEast, quantised(turns(33.0), north))

    assertEquals(Direction.NorthEast, quantised(turns(15.0), northEast))
    assertEquals(Direction.North, quantised(turns(12.0), northEast))

    assertEquals(Direction.North, quantised(turns(15.0), null))
  }

  @Test
  fun `blocked diagonally, it slides along the cardinal half nearer the stick first, then the other`() {
    val northEast = TileSteps.sectorOf(0.125, null)

    assertEquals(Direction.North, TileSteps.next(northEast, turns(40.0)) { it != Direction.NorthEast })
    assertEquals(Direction.East, TileSteps.next(northEast, turns(50.0)) { it != Direction.NorthEast })
    assertEquals(Direction.East, TileSteps.next(northEast, turns(40.0)) { it == Direction.East })
    assertEquals(Direction.North, TileSteps.next(northEast, turns(50.0)) { it == Direction.North })
  }

  @Test
  fun `blocked outright, there is no step`() {
    val east = TileSteps.sectorOf(0.25, null)
    val northEast = TileSteps.sectorOf(0.125, null)

    assertNull(TileSteps.next(east, 0.25) { it != Direction.East })
    assertNull(TileSteps.next(northEast, 0.125) { false })
  }
}
