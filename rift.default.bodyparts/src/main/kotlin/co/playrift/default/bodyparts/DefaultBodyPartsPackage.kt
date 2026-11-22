package co.playrift.default.bodyparts

import rift.ecs.System
import rift.packages.RiftPackage

public object DefaultBodyPartsPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  override fun load() {}
}
