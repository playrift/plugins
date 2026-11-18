package co.playrift.ui.default

import rift.testing.HeadlessWorld
import rift.testing.Sent
import rift.ts2.UI
import rift.ui.Toplevels
import rift.ui.UserInterface
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class FramesTest {
  companion object {
    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.ui.default")
    }
  }

  private val panels = mapOf(
    UI.Chatbox to "chat_container", UI.PmChat to "pm_container", UI.Orbs to "orbs", UI.Inventory to "side3",
    UI.Wornitems to "side4", UI.Friends to "side9", UI.Logout to "side10",
  )

  @Test
  fun `classic opens its root after its setup, its panels opened where its slots are, its popout slot left empty`() {
    val player = HeadlessWorld.login(frame = "classic")
    val sent = player.sent()
    val root = UI.ToplevelClassic.interfaceName

    assertEquals(listOf(Sent.OpenedToplevel(root)), sent.filterIsInstance<Sent.OpenedToplevel>())

    val scripts = sent.filterIsInstance<Sent.ClientScript>()
    val toplevel = Toplevels.find("classic")!!
    for (step in toplevel.onShow) {
      assertTrue(scripts.any { it.name.endsWith(step.script.toString()) && it.arguments == step.arguments }, "its setup ran: $step")
    }

    val expected = panels.map { (panel, slot) -> Sent.Opened(panel.interfaceName, root, "${root}_$slot") }
    assertEquals(expected.toSet(), sent.filterIsInstance<Sent.Opened>().toSet())

    val userInterface = player.actor.getComponent<UserInterface>()
    assertNull(userInterface.getSlotContent("popout"))
  }

  @Test
  fun `mobile opens the same panels where its slots are, and has no popout`() {
    val sent = HeadlessWorld.login(frame = "mobile").sent()
    val root = UI.ToplevelMobile.interfaceName

    assertEquals(listOf(Sent.OpenedToplevel(root)), sent.filterIsInstance<Sent.OpenedToplevel>())

    val expected = panels.map { (panel, slot) -> Sent.Opened(panel.interfaceName, root, "${root}_$slot") }
    assertEquals(expected.toSet(), sent.filterIsInstance<Sent.Opened>().toSet())
  }
}
