# rift.movement.click

Provides the bindings moving by clicking the world and minimap, and queuing walk intent.

This plugin is compatible with the `rift.movement.pathfinding.*` family of plugins, and it's also compatible with `rift.actions.movement`.

## Usage

Just install. You will need the pathfinding plugins to convert this intent into movement, or you will need to write your own system to convert this intent into a `Moving` component.

To programmatically trigger a walk intent, use the `WalkRequest` component.

```kotlin
import rift.components.WalkRequest

player.addComponent(WalkRequest(tile))
```
