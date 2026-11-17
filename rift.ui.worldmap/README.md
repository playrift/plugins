# rift.ui.worldmap

The world map UI, linked with your games world maps files.

## Usage

Install it beside the default UI. Then open it from your scripts:

```kotlin
import co.playrift.ui.worldmap.*

player.openWorldMap()             // floating, in the frame's floater slot
player.openWorldMapFullscreen()   // fullscreen: the map is the whole screen until it is closed
player.closeWorldMap()
```

Close the interface with the esc key, or by clicking the `x`.

See `templates/open-world-map.rift.template` if you want the minimap orb to open this interface.
