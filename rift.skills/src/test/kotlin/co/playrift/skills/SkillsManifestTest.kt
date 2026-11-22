package co.playrift.skills

import rift.testing.HeadlessWorld
import kotlin.test.Test
import kotlin.test.assertEquals

class SkillsManifestTest {
  companion object {
    private const val PACKAGE_ID: String = "rift.skills"
  }

  private fun manifest() = HeadlessWorld.available().getValue(PACKAGE_ID)

  @Test
  fun `the engine's manifest reader reads rift-skills' two settings, each a choice with its labels and default and no description`() {
    val settings = manifest().settings.map { listOf(it.name, it.type, it.choices, it.labels, it.default, it.description) }

    assertEquals(
      listOf(
        listOf("stats_tab_layout", "choice", listOf("reflow", "stretch"), listOf("Reflow", "Stretch"), "reflow", "How the stats tab fits its skill boxes: Reflow keeps each box its size; Stretch widens them to fill the tab."),
        listOf("total_level", "choice", listOf("last_row", "own_row"), listOf("In the last row", "Own row"), "last_row", "Where the stats tab shows Total level: in the last row beside the skills, or on a row of its own."),
      ),
      settings,
    )
  }

  @Test
  fun `the engine's manifest reader reads rift-skills' default rows, the skills settings in skills-default-toml`() {
    val defaults = manifest().defaults.map { it.name to it.path }

    assertEquals(listOf("skills" to "META-INF/rift/package/skills.default.toml"), defaults)
  }

  @Test
  fun `rift-skills declares no table of its own, the skills settings being the project's`() {
    val tables = manifest().tables

    assertEquals(emptyList(), tables)
  }

  @Test
  fun `rift-skills declares no component to place, Forge's Skills section being the engine's`() {
    val manifest = manifest()

    assertEquals(emptyList(), manifest.components.map { it.qualifiedName })
    assertEquals(emptyMap(), manifest.appliesTo)
  }
}
