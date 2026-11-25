package co.playrift.ui.default

import rift.components.Disconnecting
import rift.components.Running
import rift.components.Speaking
import rift.ecs.StateCatalog
import rift.testing.HeadlessWorld
import rift.testing.Sent
import rift.testing.TestPlayer
import rift.ts2.UI
import rift.ts2.Scripts
import rift.ts2.Ts2
import rift.ui.Device
import rift.ui.Toplevels
import rift.ui.Ts2Scripts
import rift.ui.UserInterface
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class DefaultUiTest {
  companion object {
    private const val RUNNING = "rift.engine:running"

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.ui.default")
    }
  }

  private lateinit var player: TestPlayer
  private val userInterface get() = player.actor.getComponent<UserInterface>()

  @BeforeTest
  fun login() {
    player = HeadlessWorld.login()
  }

  @Test
  fun `its manifest names its ts2 source, which is in the jar`() {
    val manifest = HeadlessWorld.available().getValue("rift.ui.default")

    assertEquals("META-INF/rift/ts2/", manifest.ts2)
    assertTrue(manifest.systems.isEmpty())
    assertNotNull(DefaultUiPackage::class.java.classLoader.getResource("META-INF/rift/ts2/ts2.config.json"))
  }

  @Test
  fun `every game state it imports is typed, and the run orb reads the engine's key, not a game var`() {
    val imports = HeadlessWorld.available().getValue("rift.ui.default").imports
    val gameStates = imports.filter { it.kind == "var" || it.kind == "varbit" }

    assertTrue(gameStates.all { it.type != null })
    assertTrue(imports.none { it.name == "option_run" })

    assertTrue(StateCatalog.externalProblems(mapOf(RUNNING to "boolean")).single().contains("no target"))
  }

  @Test
  fun `every name its code uses is in the served build`() {
    assertEquals(emptyList(), Ts2.missingNames())

    for (script in listOf("oculus.oculus.camera.cameraZoomRangeDefault", "oculus.oculus.camera.cameraZoomRangeFromServer", "oculus.oculus.camera.viewportZoomFromServer")) {
      assertNotNull(Ts2Scripts.findScriptId(script), script)
    }
  }

  @Test
  fun `its three frames ship in the jar and resolve`() {
    for (name in listOf("resizable", "classic", "mobile")) {
      assertNotNull(DefaultUiPackage::class.java.classLoader.getResource("META-INF/rift/toplevels/$name.toml"), name)
      assertNotNull(Toplevels.find(name), name)
    }

    assertEquals(emptyList(), Toplevels.loadErrors())
  }

  @Test
  fun `a player with no frame gets resizable, the chatbox, the orbs and four side panels opened by slot`() {
    val sent = HeadlessWorld.login().also { player = it }.sent()
    val root = UI.ToplevelResizable

    assertEquals(DefaultUiPackage.TOPLEVEL, userInterface.chosenToplevel)
    assertEquals(listOf(Sent.OpenedToplevel(root.interfaceName)), sent.filterIsInstance<Sent.OpenedToplevel>())
    assertEquals(
      setOf(
        Sent.Opened(UI.Chatbox.interfaceName, root.interfaceName, root.chatContainer.name),
        Sent.Opened(UI.PmChat.interfaceName, root.interfaceName, root.pmContainer.name),
        Sent.Opened(UI.Orbs.interfaceName, root.interfaceName, root.orbs.name),
        Sent.Opened(UI.Inventory.interfaceName, root.interfaceName, root.side3.name),
        Sent.Opened(UI.Wornitems.interfaceName, root.interfaceName, root.side4.name),
        Sent.Opened(UI.Friends.interfaceName, root.interfaceName, root.side9.name),
        Sent.Opened(UI.Logout.interfaceName, root.interfaceName, root.side10.name),
      ),
      sent.filterIsInstance<Sent.Opened>().toSet(),
    )

    assertNull(userInterface.getSlotContent("tab.music"))
    assertEquals(UI.Inventory, userInterface.getSlotContent("tab.inventory")?.ui)
    assertEquals(UI.Friends, userInterface.getSlotContent("tab.friends")?.ui)
    assertNull(userInterface.getSlotContent("tab.settings"))

    assertEquals(emptyList(), sent.filterIsInstance<Sent.Armed>())

    val clientScripts = sent.filterIsInstance<Sent.ClientScript>()
    assertTrue(clientScripts.any { it.name == "lib.lib.helpers.settingsClientMode" })
    assertTrue(clientScripts.none { it.name.endsWith(".cameraDoZoom") })
  }

  @Test
  fun `the Skills slot is left for the game to fill, though the game has rift-skills`() {
    assertNull(userInterface.getSlotContent("tab.stats"))
  }

  @Test
  fun `the chatbox's state is set from the player's name`() {
    assertEquals(1, player["rift.engine:has_display_name"])
  }

  @Test
  fun `a player already on a frame keeps it`() {
    val kept = HeadlessWorld.login(frame = "resizable")
    val keptUserInterface = kept.actor.getComponent<UserInterface>()

    assertEquals("resizable", keptUserInterface.chosenToplevel)
    assertTrue(kept.sent().filterIsInstance<Sent.OpenedToplevel>().size <= 1)
  }

  @Test
  fun `a player on a phone with no frame gets mobile`() {
    val phone = HeadlessWorld.login(device = Device.Mobile)
    val sent = phone.sent()
    val phoneUserInterface = phone.actor.getComponent<UserInterface>()

    assertEquals("mobile", phoneUserInterface.chosenToplevel)
    assertEquals(listOf(Sent.OpenedToplevel(UI.ToplevelMobile.interfaceName)), sent.filterIsInstance<Sent.OpenedToplevel>())
  }

  @Test
  fun `a player on a desktop with no frame gets resizable`() {
    val desktop = HeadlessWorld.login(device = Device.Desktop)
    val sent = desktop.sent()
    val desktopUserInterface = desktop.actor.getComponent<UserInterface>()

    assertEquals("resizable", desktopUserInterface.chosenToplevel)
    assertEquals(listOf(Sent.OpenedToplevel(UI.ToplevelResizable.interfaceName)), sent.filterIsInstance<Sent.OpenedToplevel>())
  }

  @Test
  fun `a returning player saved on resizable gets mobile on a phone`() {
    val returning = HeadlessWorld.login(frame = "resizable", device = Device.Mobile)
    val sent = returning.sent()
    val returningUserInterface = returning.actor.getComponent<UserInterface>()

    assertEquals("mobile", returningUserInterface.chosenToplevel)
    assertEquals(listOf(Sent.OpenedToplevel(UI.ToplevelMobile.interfaceName)), sent.filterIsInstance<Sent.OpenedToplevel>())
  }

  @Test
  fun `a returning player saved on mobile gets resizable on a desktop`() {
    val returning = HeadlessWorld.login(frame = "mobile", device = Device.Desktop)
    val sent = returning.sent()
    val returningUserInterface = returning.actor.getComponent<UserInterface>()

    assertEquals("resizable", returningUserInterface.chosenToplevel)
    assertEquals(listOf(Sent.OpenedToplevel(UI.ToplevelResizable.interfaceName)), sent.filterIsInstance<Sent.OpenedToplevel>())
  }

  @Test
  fun `a returning player saved on classic, a frame the game chose, keeps it on a phone and on a desktop`() {
    for (device in listOf(Device.Mobile, Device.Desktop)) {
      val chosen = HeadlessWorld.login(frame = "classic", device = device)
      val sent = chosen.sent()
      val chosenUserInterface = chosen.actor.getComponent<UserInterface>()

      assertEquals("classic", chosenUserInterface.chosenToplevel, device.name)
      assertEquals(listOf(Sent.OpenedToplevel(UI.ToplevelClassic.interfaceName)), sent.filterIsInstance<Sent.OpenedToplevel>(), device.name)
    }
  }

  @Test
  fun `the regen rings run the orbs' entry scripts with the game's period and start`() {
    HeadlessWorld.cycle()
    player.sent()

    RegenIndicators.startHealthTimer(player.actor, 100, 1234)
    RegenIndicators.startHealthBlueTimer(player.actor, 50, 1240)
    RegenIndicators.clearHealthBlueTimer(player.actor)
    RegenIndicators.startSpecialAttackTimer(player.actor, 50, 1250)
    RegenIndicators.clearAllTimers(player.actor)
    HeadlessWorld.cycle()

    val orbScripts = Scripts.Orbs.OrbsRegen
    assertEquals(
      listOf(orbScripts.healthRegenTimerEntrypoint(100, 1234), orbScripts.healthRegenBlueEntrypoint(50, 1240), orbScripts.healthRegenBlueClearEntrypoint(),
        orbScripts.specRegenTimerEntrypoint(50, 1250), orbScripts.healthRegenOffEntrypoint(), orbScripts.specRegenOffEntrypoint()).map(Sent.ClientScript::of),
      player.sent().filterIsInstance<Sent.ClientScript>(),
    )
  }

  @Test
  fun `Logout asks to leave`() {
    player.click(UI.Logout.button.resolved)

    assertTrue(player.actor.hasComponent<Disconnecting>())
  }

  @Test
  fun `the friends and ignore panels swap in place in tab friends`() {
    val root = UI.ToplevelResizable
    player.sent()

    player.click(UI.Friends.ignore.resolved)
    assertEquals(UI.Ignore, userInterface.getSlotContent("tab.friends")?.ui)
    assertEquals(listOf(Sent.Opened(UI.Ignore.interfaceName, root.interfaceName, root.side9.name)), player.sent().filterIsInstance<Sent.Opened>())

    player.click(UI.Friends.ignore.resolved)
    assertEquals(emptyList(), player.sent().filterIsInstance<Sent.Opened>())

    player.click(UI.Ignore.friends.resolved)
    assertEquals(UI.Friends, userInterface.getSlotContent("tab.friends")?.ui)
    assertEquals(listOf(Sent.Opened(UI.Friends.interfaceName, root.interfaceName, root.side9.name)), player.sent().filterIsInstance<Sent.Opened>())
  }

  @Test
  fun `public chat is the game's to show, not the default UI's`() {
    player.say("hello from the default ui")

    val speaking = player.actor.findComponent<Speaking>()
    assertNull(speaking)
  }

  @Test
  fun `the run orb's state follows Running, sent at the cycle's end`() {
    HeadlessWorld.cycle()
    player.sent()

    player.actor.addComponent(Running())
    HeadlessWorld.cycle()
    assertEquals(listOf(Sent.State(RUNNING, 1)), player.sent().filter { it is Sent.State && it.key == RUNNING })

    player.actor.removeComponent<Running>()
    HeadlessWorld.cycle()
    assertEquals(listOf(Sent.State(RUNNING, 0)), player.sent().filter { it is Sent.State && it.key == RUNNING })
  }
}
