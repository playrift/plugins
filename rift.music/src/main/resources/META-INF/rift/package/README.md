# rift.music

A music UI and music player system. Plays your project's music, tracks which songs each player has unlocked.

## Usage

Just install. It plays the music files in your project, in the order Forge lists them. The music tab opens at login, in the `rift.ui.default` toplevel's music slot.

You decide how tracks unlock. Call `unlockMusic`, or `playMusic` (which also unlocks the track it plays):

```kotlin
import co.playrift.music.*

on_enter_area(Area.courtyard) { subject -> subject.playMusic(Assets.Music.courtyard_theme) }

player.unlockMusic(track)               // with the unlock message
player.musicUnlocks.unlock(track)       // without it
player.stopMusic()
player.markMusicUnavailable(track)      // greyed out in the tab
```

### The music tab

| Button | What it does |
| --- | --- |
| Area | Plays the music your game asks for |
| Shuffle | Plays a random unlocked track when one ends |
| Single | Repeats the current track |
| Skip | Plays the next random track (Shuffle only) |

Players get three playlists of up to 100 tracks. Unlocked tracks are green, locked ones red, unavailable ones grey.

The realm's owner can type `::music <name>` to play a track, and `::music --stop` to stop.

### Rules

Set these when your game loads:

```kotlin
MusicRules.mayPlayAnyTrack = { actor -> actor.findComponent<Permissions>()?.has(Role.game("moderator")) == true }   // nobody, by default
MusicRules.unlockedMessage = { track -> "New track: ${track.title}" }
MusicRules.lockedMessage = "Find this track first."
```

Unlocks, playlists and the player's mode are saved with the player, by track name, so they survive you adding or reordering music.
