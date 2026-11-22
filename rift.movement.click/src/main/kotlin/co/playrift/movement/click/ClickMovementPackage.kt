package co.playrift.movement.click

import rift.components.Position
import rift.components.Running
import rift.components.WalkRequest
import rift.ecs.System
import rift.entities.Actor
import rift.entities.Entity
import rift.packages.RiftPackage
import rift.packages.on_minimap_click
import rift.packages.on_ui_component_click
import rift.packages.on_world_click
import rift.ui.UIName
import rift.world.Tile3

public object ClickMovementPackage : RiftPackage {
  override val systems: List<System<*, *>> = listOf(ClickWalkSystem)

  private val RUN_ORB = UIName("orbs").component("orbs_runbutton")

  override fun load() {
    on_world_click { subject ->
      request(subject, tile)
    }

    on_minimap_click { subject ->
      request(subject, tile)
    }

    on_ui_component_click(RUN_ORB) { subject ->
      toggleRunning(subject)
    }
  }

  private fun toggleRunning(subject: Entity) {
    val actor = subject as? Actor
    if (actor == null) return

    if (actor.hasComponent<Running>()) actor.removeComponent<Running>() else actor.addComponent(Running())
  }

  private fun request(subject: Entity, tile: Tile3) {
    val position = subject.findComponent<Position>() ?: return
    if (tile == position.tile) return
    subject.replaceComponent(WalkRequest(tile))
  }
}
