package co.playrift.skills

import rift.ecs.System
import rift.packages.RiftPackage

public object SkillsPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  override fun load() {}
}
