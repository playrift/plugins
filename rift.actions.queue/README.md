# rift.actions.queue

A rules-based action queue with composable actions, written like async code and chainable like promises. The queue was designed to cover everything OSRS-style gameplay asks of an action.

## Usage

Import and give the action queue to any entity.

With the plugin enabled, every player gets an action queue when they log in by default.

To give one to an NPC or any other entity:
```kotlin
import co.playrift.actions.queue.ActionQueue

npc.addComponent(ActionQueue())
```

Create your first action

```kotlin
import co.playrift.actions.queue.createAction
import rift.entities.Actor
import rift.scripting.message

fun Meditate() = createAction(name = "Meditate") {
  val actor = entity as? Actor
  actor?.message("You close your eyes.")
  wait(3)
  commit {
    actor?.message("You feel calmer.")
  }
}
```

Offer the action to the queue

```kotlin
val queue = player.getComponent<ActionQueue>()

queue.offer(Meditate())
```

What to expect:
1. The actor gets "You close your eyes."
2. The actor is then suspended, waiting 3 game cycles
3. The commit block fires, resolving the action.

If during the wait period, the actor offers another action - clicking to walk or interact, or recieving damage - the action will be interrupted and the commit block will not execute.

### Action default behaviours

An action created with only a name and a body:

```
fun Meditate() = createAction(name = "Meditate") { ... }
```

gets these defaults:

- **Weak priority**: the player's next click stops it.
- **Main lane**: it's what the entity is doing, one at a time.
- **Replaces what the player was doing** when they offer it.
- **Can always start**: no canStart check.
- **Interrupted by anything new**, except quick actions and side actions, which it lets through.
- **No cooldown, no cleanup**.

The defaults are chosen so that a forgotten setting can never produce an action the player can't click out of.

### Cleaning up

Use finally to undo whatever your action set up. It runs however the action ends: finished, interrupted or failed.

```kotlin
fun Stare(target: Npc) = createAction(name = "Stare") {
  entity.replaceComponent(Facing(target))
  try {
    wait(10)
  } finally {
    entity.removeComponent<Facing>()
  }
}
```

Use onCancel when cleanup depends on why the action ended. It runs only if the action didn't finish, and receives the reason: Interrupted, Superseded, Died, LoggedOut or Failed.

```kotlin
fun Teleport() = createAction(
  name = "Teleport",
  onCancel = { reason -> entity.removeComponent<DamageImmune>() },
) { ... }
```

`finally` runs first, then `onCancel`.

Things to know:
- An action that never started gets no cleanup.
- Don't wait or commit during cleanup.
- Locks are released for you.

### The `commit` block

Use the `commit { … }` block to express lasting effects your action has on the world: applying XP, doing damage, healing, collecting a resource.

Commit has two main jobs:
1. It marks the point when your action takes effect.
2. It prevents effects from running if an action is cancelled, and awaiting cleanup.

### Actions cooldowns

Action cooldowns are expressed using an intake gate.

```kotlin
// food can be eaten once every 3 game cycles
val FOOD = GateId("food", ticks = 3)
```

```kotlin
fun Eat(food: Item) = createAction(
  name = "Eat",
  intakeGate = FOOD,
  ...
) {
  ...
}
```

It runs right away, starts the action's cooldown if it has one, and marks the moment your action takes effect. Anything after a wait only happens if the action isn't interrupted first, so put your commit where the action should count as done.

### Checking before an action starts

Use `canStart` to check that an action still makes sense at the moment it starts. Actions can wait in the queue, or behind a walk, and the world changes in the meantime: a target dies, an item is used up, a tree is felled.

```kotlin
fun Eat(foodId: Int) = createAction(
  name = "Eat",
  canStart = { entity.getComponent<Bag>().count(foodId) > 0 },
) { ... }
```

If canStart returns false, the action is dropped quietly: it never runs, gets no cleanup, and any `.then` after it doesn't run either.

To send a message when `canStart` fails, do it within the canStart block.

```kotlin
canStart = {
  val goldNeeded = 500
  val hasEnough = goldNeeded <= entity.getComponent<Bag>().count(coins)
  if (!hasEnough) {
    entity.message("You don't have enough coins for that.")
  }

  hasEnough
}
```

### Chaining actions

Use `.then { … }` to run another action after one finishes.

```kotlin
queue.offer(
  WalkTo(tile).then { Meditate() }
)
```

The next action runs only if the first one finishes. If it's cancelled, fails or never starts, the rest of the chain is dropped. Return `null` from the block to end the chain.

Chained actions start the tick after the previous one finishes, with one exception: an action chained after a walk starts the tick the walk ends, so the player acts the moment they arrive.

`canStart` and `.then` work together. The walk doesn't report whether it arrived, so the next action's canStart checks it for itself.

### Classifying incoming actions

It's simply not possible to cover all cases of action mutual exclusivity with a simple priority system, and trying to do that would be an over simplification, so this is where action classificaiton comes in.

In most cases, you don't need a special classification. The queues rules are designed to act mostly coherently.

When a new action arrives that is an exception, the action the entity is currently doing is asked what should happen to it. It answers in its `classify` block, which receives the new action as `incoming`.

Each action can be granted a `tag`, which can optionally carry data. Other actions identify actions by their tag.

```kotlin
class TargetTag(val target: Entity)

fun Attack(target: Entity) = createAction(
  name = "Attack",
  tag = TargetTag(target),
  classify = { incoming ->
    val gear = incoming.tag as? GearTag
    when {
      // Clicking the same target again: we're already attacking it.
      (incoming.tag as? TargetTag)?.target === target -> Verdict.Absorb
      // Switching armour mid-fight, it doesn't interrupt.
      gear != null && EquipmentSlot.MainHand !in gear.slots -> Verdict.Accept
      // Anything else, including eating or switching weapons, stops the fight.
      else -> Verdict.Interrupt
    }
  },
) { ... }
```

The classify block is run:
- by the current **main action**, for anything new that isn't stronger than it;
- by **side actions**, for anything new that isn't Strong.

The four answers
- **Interrupt**: your action is stopped, and the new one is let in
- **Accept**: the new one is let in, and your action continues
- **Absorb**: the new action is handled by your current action, it doesn't trigger any other classify blocks
- **Ignore**: the new action is discarded

### Suspending an action
Actions can be suspended in two primitive ways, but notably `waitUntil` is highly expressive and gives you a lot of flexibility for how you can suspend actions.

```kotlin
val gameCycles = 5

wait(gameCycles)
```

```kotlin
waitUntil {
  // not moving
  entity.hasComponent<Moving>() == false
}
```

### Locking the queue

The queue has three lock states.

**Locked**: nothing gets in.
- New actions offered to the queue are refused and thrown away. A click during a teleport doesn't queue up for afterwards; it gets discarded.
- Actions already in the queue are paused. They don't start, and paused ones aren't checked for the duration of the lock.

```kotlin
withLock(LockLevel.Locked) {
  // action logic
}
```

**ModalPause**: everything waits.
- New actions are accepted, but they don't run yet.
- Actions already in the queue are paused, as with Locked.
- This is the level for things the player can still click away from. Whether a newly offered action interrupts one which introduced `ModalPause` is decided by that action's classifier.

**None**: No lock state.

Lock state is ignored by Strong actions, and by the action currently holding the lock.

### Performing a system action

The queue supports actions offered by the game, rather than from user interaction.

System offers don't replace what the player is doing or clear their Weak actions. Whether one interrupts the current action is up to that action's classifier, as with any offer.

```kotlin
val queue = player.getComponent<ActionQueue>()

queue.systemOffer(Meditate())
```

## Actions in-depth

Action systems are complicated, there are many competing priorities and special interactions which need to work in order to correctly emulate other games.

In this section we'll talk in more detail about how the action queue actually works, and give you enough information to create a breadth of actions which cover all your use cases.

### 1. What a player or NPC is doing

Each entity has one queue. The queue at its centre describes and governs what they're doing: chopping a tree, fighting, banking. They do one thing at a time. A new thing either replaces the current one or waits behind it.

We'll refer to this as the **main action**.

### 2. Lanes: what can happen alongside the main action

The queue has multiple **lanes**, these allow the entity to do some things in parallel. The entities main action goes into the **Main lane**.

Everything else in the queue is defined by its relationship to the main action.

- Main: the main action(s) itself. One at a time, in order.
- Before: the one thing that has to happen before the doing. In practice this is where walking lives: walk to a location, then do `Main`. When an action in the **Before** lane ends, the action it was preceding starts that same tick.
- Self: Self actions are quick things done to yourself, like eating or equipping. Actions which don't have an effect on the world around you, but only act on yourself, can run straight away and never wait behind the "doing".
- Side: Side actions are things which truly happen in parallel. There can be multiple **Side lanes**, they are named and can hold one action. An example might be, opening an interface while you walk - this interaction can be stateful and still be allowed without interrupting the "doing".

An action declares its lane once, and the queue puts it there when it's offered.

### 3. When something new is offered to the queue

This is the heart of this deep dive. When an action is offered, the queue settles everything at that moment, by asking questions in a fixed order:

1. Is the player locked? If yes: it's refused, or held for later (see: Locking the queue).
2. Is its cooldown running? If yes: it's refused (See: Action cooldowns).
3. Is anything happening besides the main action? Side actions are asked how it should interact with the new action.
4. Is its action priority higher than the main action? If yes: the main action is interrupted, without asking it.
5. Otherwise, the main action is asked how it should interact with the new action. It gives one of four answers. This is called an **action classifier**:
   - Interrupt: "stop me, let it in." The default.
   - Accept: "let it in, and I'll carry on." Chopping a tree allows eating in paralell.
   - Absorb: "that's mine, I'll handle it." The bank absorbs clicks on its own buttons.
   - Ignore: "drop it." Burying bones ignores clicks.
6. Did the player ask for it? If yes: two more rules apply.
   a. Last click wins: if it's a new main action (not a quick action), it replaces replaces what the player was doing in both the **Before* and **Main** lanes.
   b. Clear weak actions: every Weak action the queued is cancelled, except quick actions.

Finally, the action is queued in its lane.

### 4. Action interruptions

In the previous section we briefly touched on the two rules that apply when an offer comes from the player: _last click wins_ and _clear weak actions_. They look similar, but each covers cases the other doesn't. Let's look at both more closely.

**Last click wins**

When the player asks to do a new thing, it replaces what they were doing.

This rule applies only if:
1. The offer comes from the player (`offer`, not `systemOffer`).
2. The action is a main action. Quick actions (eating, equipping), interface clicks and side actions never replace anything.
3. The action gets past every check before it: the lock, its cooldown, any side actions, and the main action's classifier.

If all of this is true, the player's walk and every main action they asked for previously are cancelled, whatever their priority. Actions the game queued are left alone.

The third condition above is how an action protects itself from clicks. Burying bones ignores clicks, so a click to move is dropped and the bury carries on. The bank absorbs clicks on its own buttons, so pressing "deposit" doesn't replace banking. A teleport holds a lock, so clicks are refused outright. Priority plays no part.

**Clear weak actions**

Weak actions are fragile. They're cleared whenever something significant happens:
- the player offers anything, even just eating;
- an interface opens or closes;
- a Strong action begins.

Every Weak action is cleared, in any lane and whoever queued it, with three exceptions:
1. An action which caused the clear
2. An action that has just accepted the incoming one
3. Quick actions, which finish the same tick anyway

This covers what last click wins can't:
- The player eats. Nothing is replaced, but Weak actions waiting in the queue are cleared.
- The game queued it. A player's click still clears Weak actions queued with systemOffer.
- There was no click. Closing the bank with Esc offers nothing, but the closing interface clears Weak actions.
- It's a side action. A Weak side action closes on any click; a Normal one, like a settings interface, stays open.

**Priority**

Priority does two jobs. It decides which actions are fragile, and which arriving actions can push past the running main action without asking it.

There are three action priorities:

Weak

The default. It's cleared by the clear weak actions rule. When offered, it has to ask the running main action, which can interrupt, accept, absorb or ignore it.

Normal

It isn't cleared by clear weak actions. When offered, it interrupts a running Weak main action without asking. A running Normal or Strong action is still asked.

Strong

It isn't cleared by clear weak actions. When offered, it interrupts the running main action and the walk without asking (unless the running action is also Strong), ignores locks, and doesn't consult side actions. When it begins, it clears every Weak action in every lane.

### 5. A worked example

A player is chopping a tree.

- They eat. It's a quick action, so it goes in the Self lane. The chopping action is asked and answers Accept, so they eat and keep chopping.
- They open settings UI. It goes in a Side lane, beside everything. The chopping is asked and accepts. Nothing changes; the panel is open.
- They click a bank booth. A walk goes in the Before lane, with the bank behind it. The settings panel lets the click through. The chopping is asked and answers Interrupt. Last click wins replaces it. The weak clear passes over the settings because they're Normal, not Weak. They walk with the panel still open.
- They arrive. The bank starts that tick, and closes the settings as it opens. Opening one interface closes the other.
- They click a bank button. The bank absorbs it.
- They cast a teleport. It's Strong, so the bank is interrupted without being asked, and the teleport happens.
