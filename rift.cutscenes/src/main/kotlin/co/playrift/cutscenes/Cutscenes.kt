package co.playrift.cutscenes

import java.util.UUID
import rift.components.Appearance
import rift.components.Controlled
import rift.components.DirectedBy
import rift.components.Despawn
import rift.components.RebuildMap
import rift.ecs.Component
import rift.ecs.Synced
import rift.entities.Actor
import rift.entities.Director
import rift.entities.Entity
import rift.entities.Npc
import rift.assets.NpcDefinition
import rift.scripting.Scene
import rift.scripting.Shard
import rift.scripting.camera
import rift.scripting.spawn
import rift.scripting.teleport
import rift.scripting.tile4
import rift.sequences.SequenceBuilder
import rift.sequences.SequenceSpec
import rift.ui.UserInterface
import rift.world.Tile4
import rift.world.World

internal const val ID: String = "rift.cutscenes"

public const val FADE_CYCLES: Int = 65

public const val CUTSCENE_FRAME: String = "cutscene"

private const val CLEAR = 0
private const val BLACK = 1

private const val COVER_TIMEOUT = "$ID:cover_timeout"
private const val COVER_TIMEOUT_TICKS = 10

private val coverTimeout: SequenceSpec = SequenceBuilder(COVER_TIMEOUT).apply { step("wait") { after(COVER_TIMEOUT_TICKS) } }.build()

public class Fade : Component() {
  @Synced("$ID:fade", max = 1, doc = "The cutscene frame's fade: 0 clear, 1 black.")
  public var fade: Int = CLEAR

  @Synced("$ID:fade_cycles", doc = "How many client cycles the fade takes to reach its colour.")
  public var cycles: Int = 0
}

internal class GoingHome(val timeout: UUID) : Component()

internal class CoverTimeout(val player: UUID) : Component()

internal class SceneState : Component() {
  val players = LinkedHashSet<UUID>()
  val hiddenByScene = HashSet<UUID>()
  val returnTo = HashMap<UUID, Tile4>()
  var stage: Shard? = null
  var arrival: Tile4? = null

  override fun onComponentRemovedFromEntity() {
    for (player in players) {
      val actor = Entity.resolve<Actor>(player) ?: continue
      giveBack(actor, wasHiddenByScene = player in hiddenByScene)

      val home = returnTo[player]
      if (home == null) {
        liftCover(actor)
        continue
      }

      sendHome(actor, home)
    }

    val stage = stage ?: return
    val anyHome = returnTo.values.firstOrNull() ?: return
    stage.destroy(sendTo = anyHome)
  }
}

private val Director.state: SceneState get() = findComponent<SceneState>() ?: addComponent(SceneState())

public fun Director.addToScene(body: Entity, role: String? = null, held: Boolean = false) {
  body.addComponent(DirectedBy(uuid, role, held))

  val player = body as? Actor ?: return
  val scene = state
  scene.players += player.uuid
  stopGoingHome(player)

  val appearance = player.findComponent<Appearance>()
  if (appearance != null && !appearance.hidden) {
    appearance.hidden = true
    scene.hiddenByScene += player.uuid
  }

  fadeTo(player, CLEAR, 0)
  player.camera.unlockPitch()
  sendOntoStage(scene, player)

  val ui = player.findComponent<UserInterface>() ?: return
  ui.gameplayToplevel = CUTSCENE_FRAME
}

public fun Director.createPrivateStage(of: Scene, x: Int, z: Int): Shard {
  val scene = state
  check(scene.stage == null) { "this scene has a private stage already" }

  val stage = of.createShard(endWhenEmpty = true)
  scene.stage = stage
  scene.arrival = stage.tile(x, z)

  for (player in scene.players) {
    val actor = Entity.resolve<Actor>(player) ?: continue
    sendOntoStage(scene, actor)
  }

  return stage
}

public val Director.stage: Shard
  get() = findComponent<SceneState>()?.stage ?: error("this scene has no private stage: call createPrivateStage first")

public fun Director.spawnInStage(npc: NpcDefinition, role: String, x: Int, z: Int, held: Boolean = false): Npc {
  val body = World.spawn(npc, stage.tile(x, z))
  addToScene(body, role, held)

  return body
}

public fun Director.player(role: String): Actor {
  val body = role(role)
  return body as? Actor ?: error("no player plays '$role' in this scene${if (body != null) " ($body does)" else ""}")
}

public fun Director.npc(role: String): Npc {
  val body = role(role)
  return body as? Npc ?: error("no NPC plays '$role' in this scene${if (body != null) " ($body does)" else ""}")
}

public val Entity.scene: Director?
  get() = findComponent<DirectedBy>()?.director?.let { Entity.resolve<Director>(it) }

public fun Director.end() {
  addComponent(Despawn())
}

public fun Actor.fadeOut(cycles: Int = FADE_CYCLES) {
  fadeTo(this, BLACK, cycles)
}

public fun Actor.fadeIn(cycles: Int = FADE_CYCLES) {
  fadeTo(this, CLEAR, cycles)
}

private fun sendOntoStage(scene: SceneState, player: Actor) {
  val arrival = scene.arrival ?: return
  if (player.uuid in scene.returnTo) return

  scene.returnTo[player.uuid] = player.tile4
  player.teleport(arrival)
}

private fun fadeTo(player: Actor, colour: Int, cycles: Int) {
  val fade = player.findComponent<Fade>() ?: player.addComponent(Fade())
  fade.cycles = cycles
  fade.fade = colour
}

internal fun Entity.mapBuilt() {
  val player = this as? Actor ?: return
  val wasGoingHome = stopGoingHome(player)
  if (!wasGoingHome) return

  liftCover(player)
}

internal fun Entity.coverTimedOut() {
  val director = this as? Director ?: return
  val timeout = director.findComponent<CoverTimeout>() ?: return

  director.removeComponent<CoverTimeout>()
  director.end()

  val player = Entity.resolve<Actor>(timeout.player) ?: return
  val goingHome = player.findComponent<GoingHome>() ?: return
  if (goingHome.timeout != director.uuid) return

  player.removeComponent<GoingHome>()
  liftCover(player)
}

private fun giveBack(player: Actor, wasHiddenByScene: Boolean) {
  if (wasHiddenByScene) player.findComponent<Appearance>()?.hidden = false

  player.camera.unlockPitch(false)
  player.camera.reset()
}

private fun sendHome(player: Actor, home: Tile4) {
  fadeTo(player, BLACK, 0)
  player.teleport(home)
  player.replaceComponent(RebuildMap())

  if (!player.hasComponent<Controlled>()) {
    liftCover(player)
    return
  }

  val timeout = Director.create(coverTimeout)
  timeout.addComponent(CoverTimeout(player.uuid))
  player.replaceComponent(GoingHome(timeout.uuid))
}

private fun stopGoingHome(player: Actor): Boolean {
  val goingHome = player.findComponent<GoingHome>() ?: return false
  player.removeComponent<GoingHome>()

  val timeout = Entity.resolve<Director>(goingHome.timeout) ?: return true
  timeout.removeComponent<CoverTimeout>()
  timeout.end()

  return true
}

private fun liftCover(player: Actor) {
  fadeTo(player, CLEAR, 0)

  val ui = player.findComponent<UserInterface>() ?: return
  if (ui.gameplayToplevel == CUTSCENE_FRAME) ui.gameplayToplevel = null
}
