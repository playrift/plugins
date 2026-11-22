import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'smol-toml';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';
const TABLE = parse(readFileSync('ui/lib/skills.toml', 'utf8'));

const STATS_TAB_ORDER = [
  'attack', 'hitpoints', 'mining',
  'strength', 'agility', 'smithing',
  'defence', 'herblore', 'fishing',
  'ranged', 'thieving', 'cooking',
  'prayer', 'crafting', 'firemaking',
  'magic', 'fletching', 'woodcutting',
  'runecrafting', 'slayer', 'farming',
  'construction', 'hunter', 'sailing',
];

const ui = await loadTs2Build(BUILD);

test('the table is Forge\'s shape: a row per skill that is on with a stat, in the stats tab\'s order, each with its key, title, stat, icon and icon x offset', () => {
  assert.deepEqual(TABLE.skills.map((row) => row.key), STATS_TAB_ORDER);
  for (const row of TABLE.skills) {
    assert.deepEqual(Object.keys(row).sort(), ['icon', 'icon_x_offset', 'key', 'stat', 'title'], row.key);
    assert.ok(Number.isInteger(row.icon), row.key);
    assert.ok(Number.isInteger(row.icon_x_offset) && row.icon_x_offset >= -8 && row.icon_x_offset <= 8, row.key);
  }
  assert.deepEqual(Object.keys(TABLE.curve).sort(), ['max_level', 'max_xp', 'virtual_levels', 'xp']);
  assert.deepEqual({ ...TABLE.settings }, { stats_tab_layout: 'reflow', total_level: 'last_row' });
});

test('a skill\'s title and icon come from the row with its stat', () => {
  assert.equal(ui.call('lib.skills.skillTitle', 0), 'Attack');
  assert.equal(ui.call('lib.skills.skillTitle', 20), 'Runecraft');
  assert.equal(ui.call('lib.skills.skillTitle', 23), 'Sailing');
  assert.equal(ui.call('lib.skills.skillTitle', 24), 'Skill', 'a stat the table has no row for');
  assert.equal(ui.call('lib.skills.skillIcon', 0), 197);
  assert.equal(ui.call('lib.skills.skillIcon', 23), 228);
  assert.equal(ui.call('lib.skills.skillIcon', 24), -1, 'a stat the table has no row for');
});

test('the XP for a level is the table\'s curve: level 2 at 83, 99 at 13,034,431, and nothing past its last level', () => {
  assert.equal(ui.call('lib.skills.xpForLevel', 1), 0);
  assert.equal(ui.call('lib.skills.xpForLevel', 2), 83);
  assert.equal(ui.call('lib.skills.xpForLevel', 99), 13034431);
  assert.equal(ui.call('lib.skills.xpForLevel', 100), 0, 'past the curve: virtual levels are off');
  assert.equal(ui.call('lib.skills.topLevel'), 99);
  assert.equal(ui.call('lib.skills.maxLevel'), 99);
  assert.equal(ui.call('lib.skills.levelStartingAt', 13034431), 99);
  assert.equal(ui.call('lib.skills.levelStartingAt', 13034432), 0, 'XP that starts no level');
});

test('a list of skills comes in the table\'s order: Attack first, Hitpoints second, Sailing last', () => {
  assert.equal(ui.call('lib.skills.skillListed', 1), 0);
  assert.equal(ui.call('lib.skills.skillListed', 2), 3);
  assert.equal(ui.call('lib.skills.skillListed', 24), 23);
  assert.equal(ui.call('lib.skills.skillListed', 25), -1);
  assert.equal(ui.call('lib.skills.skillListed', 0), -1);
});
