package co.playrift.movement.direct

import rift.components.Position
import rift.ecs.AnonymousSystem
import rift.ecs.ComponentsTwo
import rift.ecs.system
import rift.entities.EntityTypeActor

public val DirectWalkSystem: AnonymousSystem<ComponentsTwo<EntityTypeActor, Position>> = system<ComponentsTwo<EntityTypeActor, Position>> {
  name = "DirectWalkSystem"
  run { (_, position) ->
    DirectWalk.walk(position.entity, position)
  }
}
