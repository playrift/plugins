package co.playrift.skills

import rift.components.Skill

public class HunterSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("hunter", xp, currentLevel)
