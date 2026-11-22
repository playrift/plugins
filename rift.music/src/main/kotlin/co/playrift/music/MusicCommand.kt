package co.playrift.music

import rift.cmd.cli.PrintMessage
import rift.entities.Actor
import rift.entities.Entity
import rift.inputs.DeveloperCommandDefinition

internal class MusicCommand(subject: Entity) : DeveloperCommandDefinition(subject) {
  override val commandHelp: String = "Play a track of this project's music by its name, stop the music, or unlock or lock tracks"

  private val name: String? by argument(help = "The track's name, or part of it; with --unlock or --lock, \"all\" for every track").optional()

  private val stop: Boolean by option(help = "Stop the music").flag()

  private val unlock: Boolean by option(help = "Unlock the track named (or all), saying nothing").flag()

  private val lock: Boolean by option(help = "Lock the track named (or all) again, saying nothing").flag()

  override fun run() {
    val actor = subject as? Actor ?: throw PrintMessage("This command acts on a player.")
    if (stop) return actor.stopTrack()

    val typed = name ?: throw PrintMessage("Name a track to play it, or --stop; --unlock or --lock with a name or \"all\".")
    if (unlock) return actor.unlockMusicNamed(typed)
    if (lock) return actor.lockMusicNamed(typed)

    actor.playMusicNamed(typed)
  }
}
