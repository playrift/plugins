package co.playrift.skills

import rift.components.Skill

public class MagicSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("magic", xp, currentLevel)
