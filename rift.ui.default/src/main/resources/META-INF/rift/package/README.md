# rift.ui.default

Provides a bulk of the basic game UI. Top-level interfaces `resizable`, `classic` and `mobile`. The chat box, equipment, friends list, inventory, logout and minimap orbs.

Whats included here were things which were deemed game agnostic, so for example the skill and combat interfaces are not included.

## Usage

Just install. When you first login the `resizable` top-level will be set.

| Frame       | Screen                                                     |
|-------------|------------------------------------------------------------|
| `resizable` | resizable, side panels in a box at the bottom right        |
| `classic`   | resizable, the side panel and its tabs along the bottom, the popout panel (xp tracker, loot tools, hiscores) at the right |
| `mobile`    | a phone's screen, tabs at both edges, chat behind a toggle |

### Item options

```tsx
options={[
  swap !== -1 ? CS2.item_iop(item, swap) : '',
  swap === 1 ? '' : inventory(1, item),
  swap === 2 ? '' : inventory(2, item),
  swap === 3 ? '' : inventory(3, item),
  '',
  swap === 4 ? '' : inventory(4, item),
  swap === 5 ? '' : inventory(5, item),
  '',
  '',
  param(item, GameProperties.has_examine) ? EXAMINE : '',
]}
```

| Option | What it is |
| --- | --- |
| 2, 3, 4, 6, 7 | The item's inventory ops 1 to 5, its own text (`inventory(k, item)`): "Wield", "Eat", "Drop" … |
| 10 | "Examine", only for an item with examine text (the game's `has_examine`): the engine answers it |
| 1 | The shift-drop swap: the client's own, never the server's (below) |
| 5, 8, 9 | Nothing |
