package co.playrift.music

import rift.config.Music
import rift.assets.MusicDefinition
import rift.components.Audio
import rift.ecs.Component
import rift.ecs.Persist
import rift.ecs.Persistent
import rift.ecs.Synced
import rift.entities.Actor
import rift.entities.Entity
import rift.packages.AssetSearch
import rift.scripting.message

public enum class MusicMode {
  Area,

  Shuffle,

  Single,
}

public const val PLAYLIST_SIZE: Int = 100

public const val PLAYLISTS: Int = 3

private const val ALL = "all"

@Persistent(name = "music_player")
public class MusicPlayer(
  @Persist @Synced("$ID:mode", max = 2, doc = "Whose music is heard: 0 Area (the game's), 1 Shuffle, 2 Single (the player's).") public var modeNumber: Int = MusicMode.Area.ordinal,
  @Persist @Synced("$ID:shown_playlist", max = 3, doc = "The playlist chosen in the music tab, 0 for all music: what the tab lists and Shuffle plays from.") public var shownPlaylist: Int = 0,
  @Persist public var requested: String? = null,
) : Component()

public var MusicPlayer.mode: MusicMode
  get() = MusicMode.entries[modeNumber]
  set(value) {
    modeNumber = value.ordinal
  }

public val Entity.musicPlayer: MusicPlayer get() = findComponent<MusicPlayer>() ?: addComponent(MusicPlayer())

@Persistent(name = "music_playlists")
public class MusicPlaylists(
  @Persist public val first: MutableList<String> = ArrayList(),
  @Persist public val second: MutableList<String> = ArrayList(),
  @Persist public val third: MutableList<String> = ArrayList(),
) : Component() {
  @Synced("$ID:playlist_1", type = "int_list", capacity = PLAYLIST_SIZE, doc = "Playlist 1's tracks, by number, in order.")
  public var firstNumbers: List<Int> = numbersOf(first)

  @Synced("$ID:playlist_2", type = "int_list", capacity = PLAYLIST_SIZE, doc = "Playlist 2's tracks, by number, in order.")
  public var secondNumbers: List<Int> = numbersOf(second)

  @Synced("$ID:playlist_3", type = "int_list", capacity = PLAYLIST_SIZE, doc = "Playlist 3's tracks, by number, in order.")
  public var thirdNumbers: List<Int> = numbersOf(third)

  public fun tracks(playlist: Int): List<MusicDefinition> = namesOf(playlist).mapNotNull(Music::of)

  public fun holds(playlist: Int, track: MusicDefinition): Boolean = track.name in namesOf(playlist)

  internal fun namesOf(playlist: Int): MutableList<String> = when (playlist) {
    1 -> first
    2 -> second
    3 -> third
    else -> error("there is no playlist $playlist: a player has playlists 1 to $PLAYLISTS")
  }

  private companion object {
    fun numbersOf(names: List<String>): List<Int> = names.mapNotNull { Music.of(it)?.id }
  }
}

public val Entity.musicPlaylists: MusicPlaylists get() = findComponent<MusicPlaylists>() ?: addComponent(MusicPlaylists())

public fun Entity.unlockMusic(track: MusicDefinition): Boolean {
  val unlockedNow = musicUnlocks.unlock(track)
  if (unlockedNow) message(MusicRules.unlockedMessage(track))

  return unlockedNow
}

public fun Entity.playMusic(track: MusicDefinition) {
  unlockMusic(track)

  val player = musicPlayer
  player.requested = track.name
  if (player.mode == MusicMode.Area) playHeard(track)
}

public fun Entity.stopMusic() {
  val player = musicPlayer
  player.requested = null
  if (player.mode == MusicMode.Area) stopTrack()
}

public fun Entity.chooseMusic(track: MusicDefinition) {
  val player = musicPlayer
  if (player.mode == MusicMode.Area) player.mode = MusicMode.Single

  playHeard(track)
}

public fun Entity.setMusicMode(mode: MusicMode) {
  val player = musicPlayer
  if (player.mode == mode) return

  player.mode = mode
  if (mode != MusicMode.Area) return

  val requested = player.requested?.let(Music::of)
  if (requested == null) return stopTrack()

  playHeard(requested)
}

public fun Entity.skipMusic() {
  if (musicPlayer.mode != MusicMode.Shuffle) return

  playShuffled()
}

public fun Entity.showPlaylist(playlist: Int) {
  require(playlist in 0..PLAYLISTS) { "there is no playlist $playlist to show: 0 (all music) to $PLAYLISTS" }
  musicPlayer.shownPlaylist = playlist
}

public fun Actor.togglePlaylistTrack(playlist: Int, track: MusicDefinition) {
  val playlists = musicPlaylists
  val names = playlists.namesOf(playlist)
  if (names.remove(track.name)) return writePlaylist(playlists, playlist)

  val mayAdd = musicUnlocks.isUnlocked(track) || MusicRules.mayPlayAnyTrack(this)
  if (!mayAdd) return message(MusicRules.lockedMessage)

  if (names.size >= PLAYLIST_SIZE) return message(MusicRules.playlistFullMessage(playlist))

  names += track.name
  writePlaylist(playlists, playlist)
}

public fun Actor.sayMusicHint(track: MusicDefinition) {
  val hint = MusicRules.hint(this, track) ?: return
  message(hint)
}

public fun Entity.playMusicNamed(typed: String) {
  val track = trackTyped(typed) ?: return
  message("Playing \"${track.title}\"")
  chooseMusic(track)
}

public fun Entity.unlockMusicNamed(typed: String) {
  val unlocks = musicUnlocks
  if (typed == ALL) return Music.list().forEach { unlocks.unlock(it) }

  val track = trackTyped(typed) ?: return
  unlocks.unlock(track)
}

public fun Entity.lockMusicNamed(typed: String) {
  val unlocks = musicUnlocks
  if (typed == ALL) return Music.list().forEach { unlocks.lock(it) }

  val track = trackTyped(typed) ?: return
  unlocks.lock(track)
}

internal fun Entity.musicEnded(track: MusicDefinition) {
  when (musicPlayer.mode) {
    MusicMode.Area -> Unit
    MusicMode.Single -> playHeard(track)
    MusicMode.Shuffle -> playShuffled()
  }
}

internal fun Actor.refusalToPlay(track: MusicDefinition): String? {
  if (!musicAvailability.isAvailable(track)) return MusicRules.unavailableMessage

  val mayPlay = musicUnlocks.isUnlocked(track) || MusicRules.mayPlayAnyTrack(this)
  if (!mayPlay) return MusicRules.lockedMessage

  return null
}

internal fun stopToReplay(audio: Audio, track: MusicDefinition) {
  if (audio.musicTrack?.id == track.id) audio.stopMusic()
}

private fun Entity.playHeard(track: MusicDefinition) {
  val audio = findComponent<Audio>()
  if (audio != null) stopToReplay(audio, track)

  playTrack(track)
}

private fun Entity.playShuffled() {
  val playing = findComponent<NowPlaying>()?.name
  val pool = shufflePool()
  val choices = pool.filter { it.name != playing }.ifEmpty { pool }
  if (choices.isEmpty()) return stopTrack()

  playHeard(choices.random())
}

private fun Entity.shufflePool(): List<MusicDefinition> {
  val availability = musicAvailability
  val shown = musicPlayer.shownPlaylist
  if (shown != 0) return musicPlaylists.tracks(shown).filter(availability::isAvailable)

  val unlocks = musicUnlocks
  return Music.list().filter { unlocks.isUnlocked(it) && availability.isAvailable(it) }
}

private fun Entity.trackTyped(typed: String): MusicDefinition? {
  val tracks = Music.list()
  val match = AssetSearch.match(typed, tracks.map { it.name })
  val refusal = AssetSearch.refusal("music", match)
  if (refusal != null) {
    message(refusal)
    return null
  }

  val found = match as AssetSearch.Match.Found
  return tracks.first { it.name == found.name }
}

private fun writePlaylist(playlists: MusicPlaylists, playlist: Int) {
  val numbers = playlists.tracks(playlist).map { it.id }
  when (playlist) {
    1 -> playlists.firstNumbers = numbers
    2 -> playlists.secondNumbers = numbers
    3 -> playlists.thirdNumbers = numbers
  }
}
