package co.playrift.cutscenes

import rift.assets.Asset
import rift.assets.NpcDefinition
import rift.ecs.System
import rift.packages.RiftPackage

object CutscenesTestPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  val man: NpcDefinition get() = Asset.of(CutscenesTestPackage, "npc", "man")

  override fun load() {}
}
