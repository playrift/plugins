package co.playrift.ui.default

import rift.testing.HeadlessWorld
import rift.testing.Sent
import kotlin.test.Test
import kotlin.test.assertTrue

class UnloadTest {
  @Test
  fun `with it unloaded, a login opens nothing of it`() {
    HeadlessWorld.start()
    HeadlessWorld.load("rift.ui.default")
    assertTrue(HeadlessWorld.unload("rift.ui.default"))

    val sent = HeadlessWorld.login().sent()
    assertTrue(sent.none { it is Sent.OpenedToplevel || it is Sent.Opened || it is Sent.Armed }, "$sent")
  }
}
