package co.playrift.skills

import rift.components.Skill
import rift.components.SkillSettings
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SkillClassesTest {
  companion object {
    internal val CLASSES_BY_KEY: Map<String, Class<out Skill>> = linkedMapOf(
      "attack" to AttackSkill::class.java,
      "defence" to DefenceSkill::class.java,
      "strength" to StrengthSkill::class.java,
      "hitpoints" to HitpointsSkill::class.java,
      "ranged" to RangedSkill::class.java,
      "prayer" to PrayerSkill::class.java,
      "magic" to MagicSkill::class.java,
      "cooking" to CookingSkill::class.java,
      "woodcutting" to WoodcuttingSkill::class.java,
      "fletching" to FletchingSkill::class.java,
      "fishing" to FishingSkill::class.java,
      "firemaking" to FiremakingSkill::class.java,
      "crafting" to CraftingSkill::class.java,
      "smithing" to SmithingSkill::class.java,
      "mining" to MiningSkill::class.java,
      "herblore" to HerbloreSkill::class.java,
      "agility" to AgilitySkill::class.java,
      "thieving" to ThievingSkill::class.java,
      "slayer" to SlayerSkill::class.java,
      "farming" to FarmingSkill::class.java,
      "runecrafting" to RunecraftingSkill::class.java,
      "hunter" to HunterSkill::class.java,
      "construction" to ConstructionSkill::class.java,
      "sailing" to SailingSkill::class.java,
    )
  }

  @Test
  fun `no curve is loaded in this test's world`() {
    assertFailsWith<IllegalStateException> { SkillSettings.curve }
  }

  @Test
  fun `every skill builds with no arguments and no curve loaded, carrying its key`() {
    for ((key, type) in CLASSES_BY_KEY) {
      val built = type.getDeclaredConstructor().newInstance()

      assertEquals(key, built.key, type.simpleName)
    }
  }

  @Test
  fun `HitpointsSkill builds without reading the curve`() {
    val skill = HitpointsSkill()

    assertEquals("hitpoints", skill.key)
  }

  @Test
  fun `a HitpointsSkill given its xp keeps it`() {
    val skill = HitpointsSkill(xp = 1_154.0)

    assertEquals(1_154.0, skill.xp)
  }
}
