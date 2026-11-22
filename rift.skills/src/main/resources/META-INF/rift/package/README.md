# rift.skills

Provides the classic 24 skills, Attack to Sailing, plus the stats tab. Which skills are on, and the XP curve, are your project's skills settings.

## Usage

Just install. No one has any skills until your game gives them some. A skill that is turned off can't be given.

To give an NPC or a player skills in Forge, select it and use its Skills section: include each skill and set its level.

From your scripts:

```kotlin
import rift.components.SkillSettings
import rift.entities.grantXp
import co.playrift.skills.WoodcuttingSkill

player.addComponent(WoodcuttingSkill(xp = SkillSettings.curve.xpFor(50).toDouble()))
player.grantXp(player.getComponent<WoodcuttingSkill>(), 25.0)
```

| Classic curve | |
| --- | --- |
| Level 99 | 13,034,431 xp |
| Most xp | 200,000,000 |

### Hitpoints

`HitpointsSkill` is a view onto the engine's `Hitpoints`: its level is `Hitpoints.max` and its current level is `Hitpoints.current`. A hit shows on the stats tab straight away. Add `Hitpoints` first:

```kotlin
import rift.components.Hitpoints
import co.playrift.skills.HitpointsSkill

player.addComponent(Hitpoints(max = 10))
player.addComponent(HitpointsSkill())
```

Most NPCs only need `Hitpoints`.

### The stats tab

Your project's skills settings decide which stat each skill is shown in. A skill with no stat still works, it just isn't shown.

With rift.ui.default, open the tab at login:

```kotlin
userInterface.openOverlay(UI.Stats, into = "tab.stats")
```

Every skill's xp and level is saved with the player.
