package co.playrift.default.sprites

import rift.ecs.System
import rift.packages.RiftPackage

public object DefaultSpritesPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  override fun load() {}

  public val SPRITES: Map<String, String> = linkedMapOf(
    "compass" to Assets.Sprite.compass.name,
    "minimap_hint_arrow" to Assets.Sprite.mapedge.name,
    "map_scenes" to Assets.Sprite.mapscene.name,
    "map_marker" to Assets.Sprite.mapmarker.name,
    "click_cross" to Assets.Sprite.cross.name,
    "minimap_dots" to Assets.Sprite.mapdots.name,
    "scrollbar" to Assets.Sprite.scrollbar.name,
    "mod_icons" to Assets.Sprite.mod_icons.name,
  )

  public val MODELS: Map<String, String> = linkedMapOf(
    "heading_marker_hover" to Assets.Model.heading_marker_hover.name,
    "heading_marker_active" to Assets.Model.heading_marker_active.name,
  )
}
