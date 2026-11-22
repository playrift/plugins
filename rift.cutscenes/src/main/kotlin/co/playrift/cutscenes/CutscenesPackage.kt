package co.playrift.cutscenes

import rift.ecs.System
import rift.inputs.MapBuildCompleteInput
import rift.packages.RiftPackage
import rift.packages.on_event
import rift.packages.on_input
import rift.sequences.SequenceEnded

public object CutscenesPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  override fun load() {
    on_input<MapBuildCompleteInput> { subject -> subject.mapBuilt() }

    on_event<SequenceEnded> { subject -> subject.coverTimedOut() }
  }
}
