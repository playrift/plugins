package co.playrift.skills

import rift.components.Skill

public class SlayerSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("slayer", xp, currentLevel)
