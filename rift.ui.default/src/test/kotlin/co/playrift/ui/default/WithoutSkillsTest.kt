package co.playrift.ui.default

import rift.testing.HeadlessWorld
import rift.ts2.Ts2
import rift.ts2.UI
import rift.ui.UserInterface
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import org.junit.jupiter.api.BeforeAll

class WithoutSkillsTest {
  companion object {
    @JvmStatic
    @BeforeAll
    fun start() {
      val bundle = System.getProperty("rift.testing.withoutSkillsBundle")
      if (bundle == null) error("rift.testing.withoutSkillsBundle is not set (./gradlew :ui-default:test)")

      HeadlessWorld.start(bundle)
      HeadlessWorld.load("rift.ui.default")
    }
  }

  @Test
  fun `every name its code uses is in a served build without rift-skills`() {
    assertEquals(emptyList(), Ts2.missingNames())
  }

  @Test
  fun `the Skills slot is left empty, and the other side tabs are filled`() {
    val player = HeadlessWorld.login()
    val userInterface = player.actor.getComponent<UserInterface>()

    assertNull(userInterface.getSlotContent("tab.stats"))
    assertEquals(UI.Inventory, userInterface.getSlotContent("tab.inventory")?.ui)
  }
}
