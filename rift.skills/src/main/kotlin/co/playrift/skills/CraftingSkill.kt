package co.playrift.skills

import rift.components.Skill

public class CraftingSkill(
  xp: Double = 0.0,
  currentLevel: Int? = null,
) : Skill("crafting", xp, currentLevel)
