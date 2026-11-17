# rift.movement.pathfinding.bfs

Smart pathfinding using a Breadth-First Search (BFS) algorithm. Based on the rsmod pathfinding library.

## Usage

Give it to players one of two ways:

- **On the Player node**: in Forge, select the **Player** node, **Add Component → BfsPathfinding**.
- **As a script**: in Forge, with the plugin turned on, open **Project Settings → Plugins → Installed**, select BFS pathfinding, click **Use template…** and pick `players-pathfind.rift`. It adds this script to
  your project, which gives the component to every player as they log in:

```kotlin
import rift.entities.Actor
import co.playrift.movement.pathfinding.bfs.BfsPathfinding

on_create<Actor> { player ->
  player.addComponent(BfsPathfinding())
}
```

For an NPC, select it and **Add Component → BfsPathfinding**.
