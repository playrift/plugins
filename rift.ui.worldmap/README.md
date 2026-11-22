# rift.ui.worldmap

The world map UI, linked with your games world maps files.

## Usage

Install it beside the default UI. Installing doesn't hook up the world map button: add the **open-world-map** template for that (**Project › Project Settings… › Plugins › Installed**, select **World map**, **Use template…**, then **Build**). The button's **Floating World Map** and **Fullscreen World Map** then open the map.

Or open it from your scripts:

```kotlin
import co.playrift.ui.worldmap.*

player.openWorldMap()             // floating, in the frame's floater slot
player.openWorldMapFullscreen()   // fullscreen: the map is the whole screen until it is closed
player.closeWorldMap()
```

Close the interface with the esc key, or by clicking the `x`.
