package co.playrift.music

import rift.assets.MusicDefinition
import rift.entities.Actor

public object MusicRules {
  public val DEFAULT_UNLOCKED_MESSAGE: (MusicDefinition) -> String = { track -> "<col=ff0000>You have unlocked a new music track: ${track.title}.</col>" }

  public var mayPlayAnyTrack: (Actor) -> Boolean = { false }

  public var unlockedMessage: (MusicDefinition) -> String = DEFAULT_UNLOCKED_MESSAGE

  public var lockedMessage: String = "This track is not unlocked yet."

  public var unavailableMessage: String = "This track is unavailable."

  public var playlistFullMessage: (Int) -> String = { playlist -> "Playlist $playlist is full." }

  public var hint: (Actor, MusicDefinition) -> String? = { _, _ -> null }
}
