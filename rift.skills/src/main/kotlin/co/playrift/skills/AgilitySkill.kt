package co.playrift.skills

import rift.components.Skill

public class AgilitySkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("agility", xp, currentLevel)
