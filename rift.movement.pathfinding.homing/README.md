# rift.movement.pathfinding.homing

Cheap pathfinding: walks straight toward the target and stops at the first wall. Good for crowds of NPCs.

## Usage

Installing the plugin gives no one homing pathfinding. Give it out one of two ways:

- **On a node**: in Forge, select an NPC, then **Add Component → HomingPathfinding**.
- **As a script**: in **Project › Project Settings… › Plugins › Installed**, select **Homing pathfinding**, click **Use template…** and pick **npcs-home**, then **Build**. Every NPC gets it as it's created.

```kotlin
import rift.entities.Npc
import co.playrift.movement.pathfinding.homing.HomingPathfinding

on_create<Npc> { npc ->
  npc.addComponent(HomingPathfinding())
}
```

A body has one pathfinder at a time, so adding this one replaces `BfsPathfinding`.
