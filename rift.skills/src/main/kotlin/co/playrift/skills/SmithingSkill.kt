package co.playrift.skills

import rift.components.Skill

public class SmithingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("smithing", xp, currentLevel)
