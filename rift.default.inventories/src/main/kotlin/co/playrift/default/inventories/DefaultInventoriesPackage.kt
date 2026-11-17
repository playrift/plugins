package co.playrift.default.inventories

import rift.ecs.System
import rift.packages.RiftPackage

/** The default inventories. */
public object DefaultInventoriesPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  override fun load() {}
}
