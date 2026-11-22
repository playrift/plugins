package co.playrift.skills

import org.tomlj.Toml
import org.tomlj.TomlParseResult
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SkillSettingsDefaultsTest {
  companion object {
    private const val DEFAULT_ROWS: String = "META-INF/rift/package/skills.default.toml"
    private const val MANIFEST: String = "META-INF/rift/package.manifest"
    private const val MAXIMUM_TITLE_LENGTH: Int = 40
    private val KEY_FORM: Regex = Regex("^[a-z][a-z0-9_]{0,31}$")
    private val STATS_TAB_ORDER: List<String> = listOf(
      "attack", "hitpoints", "mining",
      "strength", "agility", "smithing",
      "defence", "herblore", "fishing",
      "ranged", "thieving", "cooking",
      "prayer", "crafting", "firemaking",
      "magic", "fletching", "woodcutting",
      "runecrafting", "slayer", "farming",
      "construction", "hunter", "sailing",
    )
    private val SPRITE_IMPORT: Regex = Regex("^import\\s*=\\s*sprite\\s+(\\S+)\\s+\\S.*$")
  }

  private fun resourceText(path: String): String {
    val resource = SkillSettingsDefaultsTest::class.java.classLoader.getResource(path)
    assertNotNull(resource, path)

    return resource.readText()
  }

  private fun defaults(): TomlParseResult {
    val parsed = Toml.parse(resourceText(DEFAULT_ROWS))
    assertEquals(emptyList(), parsed.errors().map { it.toString() })

    return parsed
  }

  private fun rows(): List<Map<String, Any>> {
    val array = defaults().getArray("skills.skill")
    assertNotNull(array, "skills.skill")

    return (0 until array.size()).map { array.getTable(it).toMap() }
  }

  @Test
  fun `the default rows are rift-skills' classic 24, each key one of its skills once`() {
    val rows = rows()
    val keys = rows.map { it["key"] as String }

    assertEquals(24, rows.size)
    assertEquals(keys.size, keys.toSet().size)
    assertEquals(SkillClassesTest.CLASSES_BY_KEY.keys, keys.toSet())
    assertTrue(keys.all { KEY_FORM.matches(it) }, keys.toString())
  }

  @Test
  fun `the rows come in today's stats tab order, left to right and top to bottom`() {
    val keys = rows().map { it["key"] as String }

    assertEquals(STATS_TAB_ORDER, keys)
  }

  @Test
  fun `each row carries a client stat 0 to 23 of its own, every one is on, and none carries members`() {
    val rows = rows()
    val stats = rows.map { (it["stat"] as Number).toInt() }

    assertEquals((0..23).toSet(), stats.toSet())
    assertEquals(stats.size, stats.toSet().size)
    assertTrue(rows.all { it["on"] == true }, rows.toString())
    assertTrue(rows.none { "members" in it }, rows.toString())
  }

  @Test
  fun `each row's stat is the skill's place in rift-skills' own list, as today's layout binds it`() {
    val rows = rows()
    val keysInStatOrder = SkillClassesTest.CLASSES_BY_KEY.keys.toList()

    for (row in rows) assertEquals(keysInStatOrder.indexOf(row["key"]), (row["stat"] as Number).toInt(), row.toString())
  }

  @Test
  fun `each title is a player's word for the skill, never empty and at most 40 characters`() {
    val titles = rows().map { it["title"] as String }

    assertTrue(titles.all { it.isNotBlank() && it.length <= MAXIMUM_TITLE_LENGTH }, titles.toString())
  }

  @Test
  fun `each icon is a sprite rift-skills' manifest imports, with what it is for`() {
    val imported = resourceText(MANIFEST).lines().mapNotNull { SPRITE_IMPORT.find(it.trim())?.groupValues?.get(1) }.toSet()
    val icons = rows().map { it["icon"] as String }

    assertEquals(24, icons.toSet().size)
    assertTrue(imported.containsAll(icons), "not imported: ${icons - imported}")
  }

  @Test
  fun `the curve is the classic one, 99 levels up to 200 million xp`() {
    val curve = defaults().getTable("skills.curve")?.toMap()
    assertNotNull(curve, "skills.curve")

    assertEquals("classic", curve["kind"])
    assertEquals(99L, (curve["max_level"] as Number).toLong())
    assertEquals(200_000_000L, (curve["max_xp"] as Number).toLong())
  }
}
