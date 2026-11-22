package co.playrift.ui.worldmap

import org.tinylog.kotlin.Logger
import rift.ecs.System
import rift.entities.Entity
import rift.packages.RiftPackage
import rift.packages.on_ui_component_click
import rift.ts2.Ts2
import rift.ts2.UI
import rift.ui.UserInterface

public object WorldMapPackage : RiftPackage {
  public const val FLOATING_SLOT: String = "floater"
  public const val FULLSCREEN_TOPLEVEL: String = "worldmap-fullscreen"

  private const val CLOSE_OPTION = 1

  private var floatingSlotMissingSaid = false

  override val systems: List<System<*, *>> = emptyList()

  override fun load() {
    val missingNames = Ts2.missingNames()
    check(missingNames.isEmpty()) { "rift.ui.worldmap: the served ts2 build has not got ${missingNames.size} name(s) it uses: ${missingNames.take(10).joinToString()}" }

    on_ui_component_click(UI.Worldmap.close) { subject ->
      if (option == CLOSE_OPTION) subject.closeWorldMap()
    }

    on_ui_component_click(UI.Worldmap.escape) { subject ->
      if (option == CLOSE_OPTION) subject.closeWorldMap()
    }
  }

  internal fun openFloating(userInterface: UserInterface) {
    try {
      userInterface.openOverlay(UI.Worldmap, into = FLOATING_SLOT)
    } catch (exception: IllegalArgumentException) {
      if (!floatingSlotMissingSaid) Logger.warn("rift.ui.worldmap: {}", exception.message)
      floatingSlotMissingSaid = true
    }
  }
}

public fun Entity.openWorldMap() {
  val userInterface = findComponent<UserInterface>()
  if (userInterface == null) return

  leaveFullscreen(userInterface)

  WorldMapPackage.openFloating(userInterface)
}

public fun Entity.openWorldMapFullscreen() {
  val userInterface = findComponent<UserInterface>()
  if (userInterface == null) return

  userInterface.close(UI.Worldmap)

  val alreadyFullscreen = hasComponent<WorldMapFullscreen>()
  if (!alreadyFullscreen) addComponent(WorldMapFullscreen(userInterface.gameplayToplevel))

  userInterface.gameplayToplevel = WorldMapPackage.FULLSCREEN_TOPLEVEL
}

public fun Entity.closeWorldMap() {
  val userInterface = findComponent<UserInterface>()
  if (userInterface == null) return

  leaveFullscreen(userInterface)

  userInterface.close(UI.Worldmap)
}

private fun Entity.leaveFullscreen(userInterface: UserInterface) {
  val fullscreen = findComponent<WorldMapFullscreen>()
  if (fullscreen == null) return

  removeComponent<WorldMapFullscreen>()

  if (userInterface.gameplayToplevel == WorldMapPackage.FULLSCREEN_TOPLEVEL) userInterface.gameplayToplevel = fullscreen.toplevelBefore
}
