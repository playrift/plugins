package co.playrift.skills

import rift.components.Skill

public class MiningSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("mining", xp, currentLevel)
