package co.playrift.skills

import rift.components.Skill

public class FarmingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("farming", xp, currentLevel)
