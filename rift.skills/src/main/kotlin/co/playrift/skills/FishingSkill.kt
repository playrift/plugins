package co.playrift.skills

import rift.components.Skill

public class FishingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("fishing", xp, currentLevel)
