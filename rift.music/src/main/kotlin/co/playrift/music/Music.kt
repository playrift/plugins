package co.playrift.music

import rift.config.Music
import rift.assets.MusicDefinition
import rift.components.Audio
import rift.ecs.Component
import rift.ecs.Persist
import rift.ecs.Persistent
import rift.ecs.Synced
import rift.ecs.SyncedBits
import rift.entities.Actor
import rift.entities.Entity

internal const val ID: String = "rift.music"

@Persistent(name = "music_unlocked_tracks")
public class MusicUnlocks(
  @Persist public val unlocked: MutableSet<String> = LinkedHashSet(),
) : Component() {
  @Synced("$ID:unlocked", type = "bits:music", doc = "Which tracks are unlocked: one bit per track, by its position in the music list.")
  public var bits: SyncedBits = packed(unlocked)

  public fun isUnlocked(track: MusicDefinition): Boolean = track.name in unlocked

  public fun isUnlocked(name: String): Boolean = Music.of(name)?.let(::isUnlocked) ?: false

  public fun unlock(name: String): Boolean = unlock(trackNamed(name))

  public fun lock(name: String): Boolean = lock(trackNamed(name))

  public fun unlock(track: MusicDefinition): Boolean {
    if (!unlocked.add(track.name)) return false
    writeBits(this, bits.with(track.position))
    return true
  }

  public fun lock(track: MusicDefinition): Boolean {
    if (!unlocked.remove(track.name)) return false
    writeBits(this, bits.with(track.position, on = false))
    return true
  }

  private companion object {
    fun trackNamed(name: String): MusicDefinition =
      Music.of(name) ?: error("music '$name' is not in the project's music list: the project has no music by that name")

    fun packed(names: Set<String>): SyncedBits = SyncedBits.of(names.mapNotNull { Music.of(it)?.position })
  }
}

private fun writeBits(unlocks: MusicUnlocks, value: SyncedBits) {
  unlocks.bits = value
}

public val Entity.musicUnlocks: MusicUnlocks get() = findComponent<MusicUnlocks>() ?: addComponent(MusicUnlocks())

@Persistent(name = "music_unavailable_tracks")
public class MusicAvailability(
  @Persist public val unavailable: MutableSet<String> = LinkedHashSet(),
) : Component() {
  @Synced("$ID:unavailable", type = "bits:music", doc = "Which tracks the game marks unavailable: one bit per track, by its position in the music list.")
  public var bits: SyncedBits = packedPositions(unavailable)

  public fun isAvailable(track: MusicDefinition): Boolean = track.name !in unavailable
}

public val Entity.musicAvailability: MusicAvailability get() = findComponent<MusicAvailability>() ?: addComponent(MusicAvailability())

public fun Entity.markMusicUnavailable(track: MusicDefinition): Boolean {
  val availability = musicAvailability
  if (!availability.unavailable.add(track.name)) return false

  writeAvailability(availability, availability.bits.with(track.position))
  return true
}

public fun Entity.markMusicAvailable(track: MusicDefinition): Boolean {
  val availability = musicAvailability
  if (!availability.unavailable.remove(track.name)) return false

  writeAvailability(availability, availability.bits.with(track.position, on = false))
  return true
}

private fun writeAvailability(availability: MusicAvailability, value: SyncedBits) {
  availability.bits = value
}

public class MusicHints : Component() {
  @Synced("$ID:hinted", type = "bits:music", doc = "Which tracks the game gives an unlock hint for: one bit per track, by its position in the music list.")
  public var bits: SyncedBits = SyncedBits.of(emptyList())
}

public fun Actor.refreshMusicHints() {
  val hints = findComponent<MusicHints>() ?: addComponent(MusicHints())
  val hinted = Music.list().filter { MusicRules.hint(this, it) != null }.map { it.position }
  writeHints(hints, SyncedBits.of(hinted))
}

private fun writeHints(hints: MusicHints, value: SyncedBits) {
  hints.bits = value
}

private fun packedPositions(names: Set<String>): SyncedBits = SyncedBits.of(names.mapNotNull { Music.of(it)?.position })

@Persistent(name = "music_now_playing")
public class NowPlaying(
  @Persist public var name: String? = null,
) : Component() {
  @Synced("$ID:current_track", doc = "The number of the track playing (the music list's row id), -1 for none.")
  public var track: Int = numberOf(name)

  public companion object {
    public const val NONE: Int = -1

    private fun numberOf(name: String?): Int = name?.let { Music.of(it)?.id } ?: NONE
  }
}

public fun Entity.playTrack(track: MusicDefinition) {
  val audio = findComponent<Audio>() ?: error("playTrack(${track.name}): the entity has no Audio")
  audio.playMusic(track)
  nowPlaying(track)
}

public fun Entity.stopTrack() {
  findComponent<Audio>()?.stopMusic()
  findComponent<NowPlaying>()?.let { nowPlaying(null) }
}

private fun Entity.nowPlaying(track: MusicDefinition?) {
  val now = findComponent<NowPlaying>() ?: addComponent(NowPlaying())
  now.name = track?.name
  now.track = track?.id ?: NowPlaying.NONE
}
