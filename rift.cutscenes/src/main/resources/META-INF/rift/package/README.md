# rift.cutscenes

Provides helpers for scripted scenes: put players and NPCs in a cutscene stage, hide the game's UI, fade the screen, move the camera, and put everything back when it ends.

## Usage

Just install, then write your scenes with a `Director` and a `sequence`:

```kotlin
import co.playrift.cutscenes.*

val VIEWER = "viewer"
val GUIDE = "guide"

sequence("meeting") {
    step("enter") { after(2) }
    step("talk") { after(5) }
    step("fade") { after(3) }
}

fun startMeeting(player: Actor) {
    val director = Director.create("meeting")
    director.addToScene(player, role = VIEWER, held = true)
    player.fadeOut(cycles = 0)
    director.createPrivateStage(Scenes.town_square, x = 4, z = 2)
    director.spawnInStage(Assets.Npc.guide, role = GUIDE, x = 6, z = 6)
}

on_sequence("meeting", step = "enter") { director ->
    val viewer = director.player(VIEWER)
    viewer.camera.cutTo(from = director.stage.tile(6, 3), height = 230, at = director.npc(GUIDE))
    viewer.fadeIn(cycles = 20)
}

on_sequence("meeting", step = "talk") { director -> director.npc(GUIDE).speak("Welcome.") }
on_sequence("meeting", step = "fade") { director -> director.player(VIEWER).fadeOut() }
on_sequence_end("meeting") { director -> director.end() }
```

Call `startMeeting(player)` from whatever starts the scene: an NPC option, an area, a command.

| Call | What it does |
| --- | --- |
| `addToScene(body, role, held)` | Adds a player or NPC under a role. `held = true` stops their own clicks and wandering. A player in a scene sees only the game view. |
| `createPrivateStage(of, x, z)` | Runs the scene on a private stage, a private copy of a map. Players are sent there, and back where they were when it ends. |
| `spawnInStage(npc, role, x, z)` | Spawns an NPC on the stage. |
| `player(role)`, `npc(role)` | Who is playing a role. |
| `end()` | Ends the scene and gives everyone their UI and camera back. |
| `fadeOut(cycles)`, `fadeIn(cycles)` | Fades the screen to black and back (65 cycles by default). |
| `camera.cutTo(from, height, at)` | Jumps the camera and points it at someone. |
| `camera.flyTo(from, height, speed, at, follow)` | Flies the camera there, and keeps following if `follow = true`. |

A scene that's cut short, by a logout say, puts everything back the same way.
