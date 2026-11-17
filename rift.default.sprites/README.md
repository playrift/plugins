# rift.default.sprites

Sprites which are basically mandatory: compass, map icons, click feedback, crowns, minimap hint arrow and so on.

## Usage

Just install.

| Slot | Sprite |
| --- | --- |
| compass | `compass` |
| minimap hint arrow | `mapedge` |
| map scenes | `mapscene` |
| map marker | `mapmarker` |
| click cross | `cross` |
| minimap dots | `mapdots` |
| scrollbar | `scrollbar` |
| mod icons | `mod_icons` |

Also comes with the boat heading indicators: `heading_marker_hover` and `heading_marker_active`.

```kotlin
import co.playrift.default.sprites.DefaultSpritesPackage

val compass = DefaultSpritesPackage.SPRITES["compass"] // "compass"
```
