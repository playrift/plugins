# rift.default.combat-visuals

Provides the basic combat feedback elements: hitsplats, health bars, prayer icons, and skulls.

## Usage

```kotlin
import co.playrift.engine.ecs.component.attributes.Praying
import co.playrift.engine.ecs.component.attributes.Skulled
import co.playrift.engine.ecs.component.descriptors.HitSplats
import co.playrift.engine.ecs.component.descriptors.overhead.HealthBar
import co.playrift.engine.model.HitSplat
import co.playrift.default.combatvisuals.CombatVisuals

// hitsplats
val hits = mutableListOf(
  HitSplat(
    amount = 7,
    type = CombatVisuals.Hitsplat.damage.hitsplat,
    source = attacker
  )
)

val hitsplats = HitSplats(hits)
target.addComponent(hitsplats)

// health bar
target.addComponent(
  val healthbar = HealthBar(
    healthbar = CombatVisuals.HealthBar.health30.healthBar,
    currentPercentage = 80
  )
)

// overhead prayer
player.addComponent(
  Praying(
    overhead = CombatVisuals.Overhead.protect_melee.overhead
  )
)

// overhead skull
player.addComponent(
  Skulled(
    overhead = CombatVisuals.Overhead.white_skull.overhead
  )
)
```

- **Hitsplats**: `damage`, `block`, `poison`, `venom`, `disease`, `disease_blocked`, `heal` (and the variants other
  players see, `damage_others`, `block_others`, `poison_others`, and the maximum hits `damage_max`, `poison_max`).
- **Health bars**: `health`, `shield`, `armour` and `charge`, each with a 30, 40, 50, 60, 80, 100, 120 or 140 pixel variant.
- **Prayer icons**: `protect_melee`, `protect_ranged`, `protect_magic`, `retribution`, `smite`, `redemption`,
  `protect_ranged_magic`, `protect_melee_ranged`, `protect_melee_magic`, `protect_all`, `wrath`, `soul_split`,
  `deflect_melee`, `deflect_ranged`, `deflect_magic`.
- **Skulls**: `white_skull`, `red_skull`, `high_risk_skull`, `forinthry_surge_skull`, `deadman_skull`,
  `deadman_skull_keys_1` to `deadman_skull_keys_5`.
- **Not named yet**: `prayer_15` to `prayer_23`, and
  `skull_14` to `skull_19`, `skull_21` to `skull_25`, `skull_28` to `skull_32`.
