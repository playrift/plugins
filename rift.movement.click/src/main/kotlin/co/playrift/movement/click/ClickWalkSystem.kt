package co.playrift.movement.click

import rift.components.DirectedBy
import rift.components.Moving
import rift.components.WalkRequest
import rift.ecs.AnonymousSystem
import rift.ecs.ComponentsOne
import rift.ecs.system

/** Walks to the clicked tile. */
public val ClickWalkSystem: AnonymousSystem<ComponentsOne<WalkRequest>> = system<ComponentsOne<WalkRequest>> {
  name = "ClickWalkSystem"
  run { (request) ->
    val entity = request.entity
    entity.removeComponent<WalkRequest>()
    if (entity.findComponent<DirectedBy>()?.held == true) return@run

    entity.replaceComponent(Moving(target = request.tile))
  }
}
