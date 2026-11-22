# rift.actions.movement

Sends walk intent through the action queue. A new click replaces a walk, and a walk can be followed by whatever the entity wants to do once they arrive.

## Usage

### Setup

1. In **Project › Project Settings… › Plugins**, turn on **Click to move**, **BFS pathfinding**, **Action queue** and **Actions: movement**.
2. Give players a pathfinder: select the **Player** node → **Add Component** → **BfsPathfinding**. Or add BFS pathfinding's **players-pathfind** template.
3. Build, Play, and click the ground.

With **Actions: movement** on, every click on the ground goes through the player's queue.

### Walk, then act

Each walk-then-act is a script of your own. To start from one, add the **walk-then-act** template (**Project › Project Settings… › Plugins › Installed**, select **Actions: movement**, **Use template…**), swap in your own object and option, then **Build**.

Pass `WalkTo()` the thing to walk to. It works out the rest:

```kotlin
on_object_option(TREE, "Chop down") { subject ->
  val queue = subject.getComponent<ActionQueue>()
  
  queue.offer(
    WalkTo(target).then { ChopTree(target) }
  )
}
```

When the walk ends, the action chained after it starts that same tick, so the player acts the moment they arrive.

**WalkTo()** accepts:

| Target | How the entity walks |
|---|---|
| a tile | to the tile |
| a world object | beside it, turning to face it on arrival |
| a world item | onto it, or beside it when it's on a table, turning to it |
| an NPC or a player | beside them, facing them, and following them if they move |

To stop within range instead of beside a target, such as talking across a counter, add within:  
```
WalkTo(banker, within = 2)
```

### Things to know

- **A walk doesn't decide the route**. It says where to go; the pathfinder on the player or NPC finds the way.
- **A walk can end without arriving**. The way may be blocked. The next action's `canStart` should check that the player got there.
- **A new walk replaces the old one**. A click elsewhere ends the walk, and whatever was chained after it never runs.
- **Quick actions don't stop a walk**. Eating mid-walk keeps you walking, but drops what the walk was leading to.
- **NPCs can walk too**. Anything with an action queue can be given a `WalkTo()`.