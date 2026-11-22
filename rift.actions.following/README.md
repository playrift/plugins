# rift.actions.following

Lets players follow each other. Choosing "Follow" on another player walks a step behind them wherever they go, until something else is clicked.

## Usage

### Setup

1. Set up walking with **Actions: movement** (see its README).
2. In **Project › Project Settings… › Plugins**, turn on **Actions: Follow**.
3. Add the **player-follow-option** template (under **Installed**, select **Actions: Follow**, **Use template…**). Installing the plugin doesn't put "Follow" on the player menu: the template does.
4. **Build**, Play, right-click another player and choose **Follow**.

The template adds "Follow" as the third option on every player's menu. To use a different row, change `option3` in the copy in your scripts.

### Following from a script

`Follow()` is an action, so it can be offered to the action queue:

```kotlin
import co.playrift.actions.following.Follow

val queue = player.getComponent<ActionQueue>()

queue.offer(
  Follow(target)
)
```

### Things to know

- **Following trails a step behind.** The follower walks onto the tile the target just left, and stands just behind them when they stop, facing them.
- **It never ends by itself** while the target is in the world. Clicking anywhere else, or anything else that replaces what the player is doing, stops it.
- **Quick actions don't stop it.** Eating or equipping while following keeps you following.
- **It ends when the target leaves.** If the player being followed logs out, the follower stops.
- **You can't follow yourself**, or someone who isn't in the world.
