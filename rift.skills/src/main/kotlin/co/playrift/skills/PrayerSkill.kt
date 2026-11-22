package co.playrift.skills

import rift.components.Skill

public class PrayerSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("prayer", xp, currentLevel)
