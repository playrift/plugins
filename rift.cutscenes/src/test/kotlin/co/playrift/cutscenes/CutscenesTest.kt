package co.playrift.cutscenes

import rift.components.Appearance
import rift.components.DirectedBy
import rift.entities.Director
import rift.entities.Npc
import rift.scripting.spawn
import rift.scripting.tile4
import rift.sequences.SequenceBuilder
import rift.testing.HeadlessWorld
import rift.testing.Sent
import rift.testing.TestPlayer
import rift.ui.UserInterface
import rift.world.World
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class CutscenesTest {
  companion object {
    private const val SCENE = "test_scene"
    private const val VIEWER = "viewer"
    private const val GUIDE = "guide"
    private const val NOBODY = "nobody"

    private const val FADE = "rift.cutscenes:fade"
    private const val FADE_CYCLES_STATE = "rift.cutscenes:fade_cycles"
    private const val CLEAR = 0
    private const val BLACK = 1

    private const val CUTSCENE_FRAME_INTERFACE = "cutscene_frame"

    private const val GUIDE_X = 3224
    private const val GUIDE_Z = 3220

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.cutscenes", "rift.cutscenes.test")
    }
  }

  private fun scene(): Director = Director.create(SequenceBuilder(SCENE).apply { step("hold") { manual() } }.build())

  private fun userInterfaceOf(player: TestPlayer): UserInterface = player.actor.getComponent<UserInterface>()

  private fun hidden(player: TestPlayer): Boolean = player.actor.getComponent<Appearance>().hidden

  private fun npcBeside(player: TestPlayer): Npc = World.spawn(CutscenesTestPackage.man, player.actor.tile4)

  @Test
  fun `a player added under a role is found by it, held, drawn by nobody and on the cutscene frame`() {
    val player = HeadlessWorld.login()
    val director = scene()
    player.sent()

    director.addToScene(player.actor, role = VIEWER, held = true)
    HeadlessWorld.cycle()

    assertSame(player.actor, director.player(VIEWER))
    assertSame(director, player.actor.scene)
    assertEquals(true, player.actor.findComponent<DirectedBy>()?.held)
    assertTrue(hidden(player))
    assertEquals(CUTSCENE_FRAME, userInterfaceOf(player).shownToplevel)
    assertEquals(listOf(Sent.OpenedToplevel(CUTSCENE_FRAME_INTERFACE)), player.sent().filterIsInstance<Sent.OpenedToplevel>())
    assertEquals(CLEAR, player[FADE])

    director.end()
    HeadlessWorld.cycle()
  }

  @Test
  fun `held is not the default`() {
    val player = HeadlessWorld.login()
    val director = scene()

    director.addToScene(player.actor)
    HeadlessWorld.cycle()

    assertEquals(false, player.actor.findComponent<DirectedBy>()?.held)

    director.end()
    HeadlessWorld.cycle()
  }

  @Test
  fun `an NPC added under a role is found by it, and a role nobody plays is refused by name`() {
    val player = HeadlessWorld.login()
    val director = scene()
    val guide = npcBeside(player)

    director.addToScene(player.actor, role = VIEWER)
    director.addToScene(guide, role = GUIDE)
    HeadlessWorld.cycle()

    assertSame(guide, director.npc(GUIDE))
    assertSame(director, guide.scene)

    val nobody = assertFailsWith<IllegalStateException> { director.player(NOBODY) }
    assertTrue(NOBODY in nobody.message.orEmpty(), nobody.message)

    val notAPlayer = assertFailsWith<IllegalStateException> { director.player(GUIDE) }
    assertTrue(GUIDE in notAPlayer.message.orEmpty(), notAPlayer.message)

    val notAnNpc = assertFailsWith<IllegalStateException> { director.npc(VIEWER) }
    assertTrue(VIEWER in notAnNpc.message.orEmpty(), notAnNpc.message)

    director.end()
    HeadlessWorld.cycle()
  }

  @Test
  fun `a role names one body, and a second is refused`() {
    val first = HeadlessWorld.login()
    val second = HeadlessWorld.login()
    val director = scene()

    director.addToScene(first.actor, role = VIEWER)
    val refused = runCatching { director.addToScene(second.actor, role = VIEWER) }
    HeadlessWorld.cycle()

    assertTrue(refused.isFailure || second.actor.scene == null)
    assertSame(first.actor, director.player(VIEWER))

    director.end()
    HeadlessWorld.cycle()
  }

  @Test
  fun `fadeOut darkens the screen over its cycles and fadeIn clears it`() {
    val player = HeadlessWorld.login()
    val director = scene()
    director.addToScene(player.actor, role = VIEWER)
    HeadlessWorld.cycle()

    player.actor.fadeOut(cycles = 30)
    HeadlessWorld.cycle()

    assertEquals(BLACK, player[FADE])
    assertEquals(30, player[FADE_CYCLES_STATE])

    player.actor.fadeIn(cycles = 10)
    HeadlessWorld.cycle()

    assertEquals(CLEAR, player[FADE])
    assertEquals(10, player[FADE_CYCLES_STATE])

    player.actor.fadeOut()
    HeadlessWorld.cycle()

    assertEquals(BLACK, player[FADE])
    assertEquals(FADE_CYCLES, player[FADE_CYCLES_STATE])

    director.end()
    HeadlessWorld.cycle()
  }

  @Test
  fun `end lets everyone go, draws players again and gives them their own frame and a clear screen`() {
    val player = HeadlessWorld.login()
    val ownFrame = userInterfaceOf(player).shownToplevel
    val director = scene()
    val guide = npcBeside(player)
    director.addToScene(player.actor, role = VIEWER, held = true)
    director.addToScene(guide, role = GUIDE, held = true)
    HeadlessWorld.cycle()
    player.actor.fadeOut()
    HeadlessWorld.cycle()

    director.end()
    HeadlessWorld.cycle(2)

    assertNull(player.actor.scene)
    assertNull(guide.scene)
    assertFalse(hidden(player))
    assertEquals(ownFrame, userInterfaceOf(player).shownToplevel)
    assertNotEquals(CUTSCENE_FRAME, userInterfaceOf(player).shownToplevel)
    assertEquals(CLEAR, player[FADE])
  }

  @Test
  fun `a player hidden before the scene stays hidden after it`() {
    val player = HeadlessWorld.login()
    player.actor.getComponent<Appearance>().hidden = true
    val director = scene()
    director.addToScene(player.actor)
    HeadlessWorld.cycle()

    director.end()
    HeadlessWorld.cycle(2)

    assertTrue(hidden(player))
  }

  @Test
  fun `stage and spawnInStage are refused before createPrivateStage`() {
    val director = scene()

    assertFailsWith<IllegalStateException> { director.stage }
    assertFailsWith<IllegalStateException> { director.spawnInStage(CutscenesTestPackage.man, role = GUIDE, x = GUIDE_X, z = GUIDE_Z) }
  }
}
