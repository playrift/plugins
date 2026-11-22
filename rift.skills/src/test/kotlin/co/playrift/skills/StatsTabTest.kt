package co.playrift.skills

import rift.testing.HeadlessWorld
import rift.testing.Sent
import rift.ts2.UI
import rift.ui.UserInterface
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class StatsTabTest {
  companion object {
    private const val SKILLS_SLOT: String = "tab.stats"

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.ui.default", "rift.skills")
    }
  }

  @Test
  fun `the stats tab a game opens in the Skills slot is the served build's, in the frame's Skills tab`() {
    val player = HeadlessWorld.login()
    val userInterface = player.actor.getComponent<UserInterface>()
    val root = UI.ToplevelResizable
    player.sent()

    userInterface.openOverlay(UI.Stats, into = SKILLS_SLOT)

    assertTrue(UI.Stats.isBuilt)
    assertEquals(UI.Stats, userInterface.getSlotContent(SKILLS_SLOT)?.ui)
    assertEquals(listOf(Sent.Opened(UI.Stats.interfaceName, root.interfaceName, root.side1.name)), player.sent().filterIsInstance<Sent.Opened>())
  }
}
