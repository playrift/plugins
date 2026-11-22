package co.playrift.skills

import rift.components.Skill

public class RangedSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("ranged", xp, currentLevel)
