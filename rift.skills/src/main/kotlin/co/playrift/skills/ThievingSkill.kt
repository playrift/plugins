package co.playrift.skills

import rift.components.Skill

public class ThievingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("thieving", xp, currentLevel)
