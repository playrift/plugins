package co.playrift.ui.default

import rift.components.ClientScripts
import rift.entities.Actor
import rift.packets.RunClientScriptPacket
import rift.ts2.Scripts

/** The orbs' regeneration timers. */
public object RegenIndicators {
  private val orbScripts = Scripts.Orbs.OrbsRegen

  /** Starts the health orb's timer. */
  public fun startHealthTimer(actor: Actor, periodTicks: Int, startTick: Int) {
    runOnClient(actor, orbScripts.healthRegenTimerEntrypoint(periodTicks, startTick))
  }

  /** Starts the health orb's blue timer. */
  public fun startHealthBlueTimer(actor: Actor, periodTicks: Int, startTick: Int) {
    runOnClient(actor, orbScripts.healthRegenBlueEntrypoint(periodTicks, startTick))
  }

  /** Clears the health orb's blue timer. */
  public fun clearHealthBlueTimer(actor: Actor) {
    runOnClient(actor, orbScripts.healthRegenBlueClearEntrypoint())
  }

  /** Starts the special attack orb's timer. */
  public fun startSpecialAttackTimer(actor: Actor, periodTicks: Int, startTick: Int) {
    runOnClient(actor, orbScripts.specRegenTimerEntrypoint(periodTicks, startTick))
  }

  /** Clears every orb timer. */
  public fun clearAllTimers(actor: Actor) {
    runOnClient(actor, orbScripts.healthRegenOffEntrypoint())
    runOnClient(actor, orbScripts.specRegenOffEntrypoint())
  }

  private fun runOnClient(actor: Actor, script: RunClientScriptPacket) {
    val clientScripts = actor.findComponent<ClientScripts>() ?: actor.addComponent(ClientScripts())
    clientScripts.run(script)
  }
}
