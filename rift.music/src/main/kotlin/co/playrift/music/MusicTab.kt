package co.playrift.music

import rift.config.Music
import rift.assets.MusicDefinition
import rift.entities.Actor
import rift.entities.Entity
import rift.scripting.message
import rift.ui.Ts2Component
import rift.ui.Ts2Interfaces
import rift.ui.UIComponentClick
import rift.ui.UIName
import rift.ui.UserInterface
import org.tinylog.kotlin.Logger

public object MusicTab {
  public const val INTERFACE: String = "music"

  public const val TRACK_LIST: String = "music_track_list"

  public const val PLAYING_TRACK: String = "music_playing_track"

  public const val AREA_BUTTON: String = "music_area"
  public const val SHUFFLE_BUTTON: String = "music_shuffle"
  public const val SINGLE_BUTTON: String = "music_single"
  public const val SKIP_BUTTON: String = "music_skip"

  public const val PLAYLIST_MENU: String = "music_playlist_menu"

  public const val SLOT: String = "tab.music"

  private const val PLAY = 1
  private const val UNLOCK_HINT = 2
  private const val FIRST_PLAYLIST_OPTION = 3
  private val ROW_OPTIONS = setOf(1, 2, 3, 4, 5)

  private val MENU_OPTIONS = setOf(1)

  private val said = HashSet<String>()

  public fun trackList(): Ts2Component? = Ts2Interfaces.componentOf(INTERFACE, TRACK_LIST)

  public fun trackAt(click: UIComponentClick, subject: Entity): MusicDefinition? {
    val list = UIName(INTERFACE).component(TRACK_LIST)
    if (click.owner != list && click.component != list) return null

    val slot = click.slot ?: return null
    val shown = subject.musicPlayer.shownPlaylist
    if (shown == 0) return Music.at(slot)

    return subject.musicPlaylists.tracks(shown).getOrNull(slot)
  }

  internal fun rowClicked(click: UIComponentClick, subject: Entity) {
    val actor = subject as? Actor ?: return
    val track = trackAt(click, actor) ?: return

    if (click.option == PLAY) return play(actor, track)

    trackOptionClicked(actor, track, click.option)
  }

  internal fun playingTrackClicked(click: UIComponentClick, subject: Entity) {
    val actor = subject as? Actor ?: return
    val playing = actor.findComponent<NowPlaying>()?.name?.let(Music::of) ?: return

    trackOptionClicked(actor, playing, click.option)
  }

  internal fun playlistMenuClicked(click: UIComponentClick, subject: Entity) {
    val playlist = click.slot ?: return
    if (playlist !in 0..PLAYLISTS) return

    subject.showPlaylist(playlist)
  }

  private fun play(actor: Actor, track: MusicDefinition) {
    val refusal = actor.refusalToPlay(track)
    if (refusal != null) return actor.message(refusal)

    actor.chooseMusic(track)
  }

  private fun trackOptionClicked(actor: Actor, track: MusicDefinition, option: Int) {
    if (option == UNLOCK_HINT) return actor.sayMusicHint(track)

    val playlist = option - FIRST_PLAYLIST_OPTION + 1
    if (playlist !in 1..PLAYLISTS) return

    actor.togglePlaylistTrack(playlist, track)
  }

  internal fun atLogin(actor: Actor) {
    if (!actor.hasComponent<MusicPlayer>()) actor.addComponent(MusicPlayer())
    actor.refreshMusicHints()

    val tab = Ts2Interfaces.idOf(INTERFACE)
    val list = trackList()
    val menu = Ts2Interfaces.componentOf(INTERFACE, PLAYLIST_MENU)
    if (tab == null || list == null || menu == null) {
      if (said.add("tab")) Logger.warn("rift.music: the served cache has no music tab ({} / {} / {}); it is left out", INTERFACE, TRACK_LIST, PLAYLIST_MENU)
      return
    }

    val ui = actor.findComponent<UserInterface>() ?: actor.addComponent(UserInterface())
    try {
      ui.openOverlay(UIName(INTERFACE), into = SLOT)
    } catch (e: IllegalArgumentException) {
      if (said.add("slot")) Logger.warn("rift.music: {}", e.message)
    }

    ui.allowOptions(list, ROW_OPTIONS)

    ui.allowOptions(menu, MENU_OPTIONS)
  }
}
