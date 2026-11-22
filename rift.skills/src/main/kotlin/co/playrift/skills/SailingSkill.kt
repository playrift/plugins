package co.playrift.skills

import rift.components.Skill

public class SailingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("sailing", xp, currentLevel)
