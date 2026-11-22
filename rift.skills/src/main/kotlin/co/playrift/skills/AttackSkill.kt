package co.playrift.skills

import rift.components.Skill

public class AttackSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("attack", xp, currentLevel)
