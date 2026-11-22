package co.playrift.ui.default

import rift.components.ClientScripts
import rift.entities.Actor
import rift.packets.RunClientScriptPacket
import rift.ts2.Scripts

public object RegenIndicators {
  private val orbScripts = Scripts.Orbs.OrbsRegen

  public fun startHealthTimer(actor: Actor, periodTicks: Int, startTick: Int) {
    runOnClient(actor, orbScripts.healthRegenTimerEntrypoint(periodTicks, startTick))
  }

  public fun startHealthBlueTimer(actor: Actor, periodTicks: Int, startTick: Int) {
    runOnClient(actor, orbScripts.healthRegenBlueEntrypoint(periodTicks, startTick))
  }

  public fun clearHealthBlueTimer(actor: Actor) {
    runOnClient(actor, orbScripts.healthRegenBlueClearEntrypoint())
  }

  public fun startSpecialAttackTimer(actor: Actor, periodTicks: Int, startTick: Int) {
    runOnClient(actor, orbScripts.specRegenTimerEntrypoint(periodTicks, startTick))
  }

  public fun clearAllTimers(actor: Actor) {
    runOnClient(actor, orbScripts.healthRegenOffEntrypoint())
    runOnClient(actor, orbScripts.specRegenOffEntrypoint())
  }

  private fun runOnClient(actor: Actor, script: RunClientScriptPacket) {
    val clientScripts = actor.findComponent<ClientScripts>() ?: actor.addComponent(ClientScripts())
    clientScripts.run(script)
  }
}
