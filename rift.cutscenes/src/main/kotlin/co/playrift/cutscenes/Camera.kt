package co.playrift.cutscenes

import rift.entities.Entity
import rift.scripting.Camera
import rift.world.Tile4

public const val TURN_CYCLES: Int = 60

private const val CUT = 100

public fun Camera.cutTo(from: Tile4, height: Int, at: Entity) {
  atOnce {
    moveTo(from, height, speed = 0, acceleration = CUT)
    lookAt(at, cycles = 0)
  }
}

public fun Camera.flyTo(from: Tile4, height: Int, speed: Int, at: Entity, follow: Boolean = false, cycles: Int = TURN_CYCLES) {
  atOnce {
    moveTo(from, height, speed)
    lookAt(at, cycles, follow = follow)
  }
}
