package co.playrift.music

import rift.components.Audio
import rift.config.Music
import rift.testing.HeadlessWorld
import rift.testing.TestPlayer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeAll

class MusicTest {
  companion object {
    private const val CURRENT_TRACK: String = "rift.music:current_track"

    @JvmStatic
    @BeforeAll
    fun start() {
      HeadlessWorld.start()
      HeadlessWorld.load("rift.music")
    }

    private fun listener(): TestPlayer {
      val player = HeadlessWorld.login()
      player.actor.addComponent(Audio())

      return player
    }
  }

  @Test
  fun `the game's music unlocks and is heard in Area, its number the playing track's state`() {
    val player = listener()
    val track = Music.at(0)!!

    player.actor.playMusic(track)

    assertTrue(player.actor.musicUnlocks.isUnlocked(track))
    assertEquals(track.id, player.get(CURRENT_TRACK))
  }

  @Test
  fun `in Single the game's music waits, and is heard when Area is picked again`() {
    val player = listener()
    val first = Music.at(0)!!
    val second = Music.at(1)!!
    player.actor.playMusic(first)
    player.actor.setMusicMode(MusicMode.Single)

    player.actor.playMusic(second)
    assertEquals(first.id, player.get(CURRENT_TRACK))

    player.actor.setMusicMode(MusicMode.Area)
    assertEquals(second.id, player.get(CURRENT_TRACK))
  }

  @Test
  fun `a stop from the game leaves Area silent`() {
    val player = listener()
    player.actor.playMusic(Music.at(0)!!)

    player.actor.stopMusic()

    assertEquals(NowPlaying.NONE, player.get(CURRENT_TRACK))
  }
}
