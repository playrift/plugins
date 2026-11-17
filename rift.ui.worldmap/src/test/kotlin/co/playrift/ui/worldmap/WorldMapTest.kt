package co.playrift.ui.worldmap

import rift.testing.HeadlessWorld
import rift.ui.UserInterface
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.jupiter.api.BeforeAll

class WorldMapTest {
  companion object {
    private const val RESIZABLE_FRAME = "resizable"
    private const val CLASSIC_FRAME = "classic"

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.ui.default", "rift.ui.worldmap")
    }
  }

  @Test
  fun `the fullscreen map closes back onto the resizable frame it was opened from`() {
    val player = HeadlessWorld.login(frame = RESIZABLE_FRAME)
    val userInterface = player.actor.getComponent<UserInterface>()

    player.actor.openWorldMapFullscreen()
    assertEquals(WorldMapPackage.FULLSCREEN_TOPLEVEL, userInterface.shownToplevel)

    player.actor.closeWorldMap()
    assertEquals(RESIZABLE_FRAME, userInterface.shownToplevel)
  }

  @Test
  fun `the fullscreen map closes back onto a toplevel gameplay had put on`() {
    val player = HeadlessWorld.login(frame = RESIZABLE_FRAME)
    val userInterface = player.actor.getComponent<UserInterface>()
    userInterface.gameplayToplevel = CLASSIC_FRAME

    player.actor.openWorldMapFullscreen()
    assertEquals(WorldMapPackage.FULLSCREEN_TOPLEVEL, userInterface.shownToplevel)

    player.actor.closeWorldMap()
    assertEquals(CLASSIC_FRAME, userInterface.shownToplevel)
  }
}
