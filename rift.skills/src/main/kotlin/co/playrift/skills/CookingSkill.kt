package co.playrift.skills

import rift.components.Skill

public class CookingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("cooking", xp, currentLevel)
