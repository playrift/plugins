package co.playrift.movement.direct

import rift.ecs.System
import rift.packages.RiftPackage

public object DirectMovementPackage : RiftPackage {
  override val systems: List<System<*, *>> = listOf(DirectWalkSystem)

  override fun load() {}
}
