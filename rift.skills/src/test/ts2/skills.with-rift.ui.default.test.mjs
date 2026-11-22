import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'smol-toml';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-with/rift.ui.default';
const TABLE = parse(readFileSync('ui/lib/skills.toml', 'utf8'));
const DEFAULT_ROWS = parse(readFileSync('src/main/resources/META-INF/rift/package/skills.default.toml', 'utf8')).skills.skill;

const commas = (n) => n.toLocaleString('en-US');

const CLIENT_SKILLS = ['attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic', 'cooking', 'woodcutting',
  'fletching', 'fishing', 'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving', 'slayer',
  'farming', 'runecraft', 'hunter', 'construction', 'sailing'];
const TODAY_ICON_X_OFFSETS = {
  attack: 0, hitpoints: 1, mining: 2,
  strength: 0, agility: 1, smithing: 2,
  defence: 0, herblore: 1, fishing: 1,
  ranged: 1, thieving: 2, cooking: 3,
  prayer: 1, crafting: 2, firemaking: 2,
  magic: 1, fletching: 2, woodcutting: 2,
  runecrafting: 1, slayer: -1, farming: 1,
  construction: 0, hunter: 0, sailing: 1,
};
const TOTAL_ROW = 64;
const ATTACK = 0;
const FLETCHING = 9;
const MOST_XP_AN_INT_HOLDS = 2147483647;

async function stats(options = {}) {
  return loadTs2Build(BUILD, options);
}

async function openStats(options = {}) {
  const ui = await stats(options);
  ui.open('stats');
  ui.cycles(5);
  return ui;
}

const totalLevelText = (ui) => ui.texts('stats').find((text) => text.startsWith('Total level'));
const totalXp = (ui) => ui.call('stats.stats-tooltip.component.tipRight', TOTAL_ROW);

test('each box is a row of the table, in its order: its title, its icon, its stat\'s level and base level; Total level pinned below them, not among them', async () => {
  const ui = await openStats();
  ui.skill('mining', { level: 45, base: 40 });
  ui.cycles(5);
  const boxes = ui.component('stats', 'stats_skills').children.filter((child) => child.children.length > 0);

  assert.equal(boxes.length, TABLE.skills.length);
  assert.ok(!boxes.some((box) => box.children.some((child) => (child.text ?? '').startsWith('Total level'))));
  TABLE.skills.forEach((row, index) => {
    const box = boxes[index];
    assert.deepEqual(box.options, ['', `View <col=ff981f>${row.title}</col> guide`], row.key);
    assert.equal(box.children.find((child) => child.sprite === row.icon)?.sprite, row.icon, row.key);
  });
  assert.deepEqual(boxes[2].children.map((child) => child.text ?? '').filter((text) => text !== ''), ['45', '40'], 'Mining, third in the table');
});

test('the classic table puts each icon where today\'s stats tab does: 3 pixels into its box and its skill\'s offset on', async () => {
  const ui = await openStats();
  const boxes = ui.component('stats', 'stats_skills').children.filter((child) => child.children.length > 0);

  assert.deepEqual(TABLE.skills.map((row) => row.key), Object.keys(TODAY_ICON_X_OFFSETS));
  TABLE.skills.forEach((row, index) => {
    const box = boxes[index];
    const icon = box.children.find((child) => child.sprite === row.icon);
    assert.equal(icon.bounds.x - box.bounds.x, 3 + TODAY_ICON_X_OFFSETS[row.key], row.key);
  });
});

test('rift.skills\' default rows carry the same offsets, an offset of 0 left out, and no members field', () => {
  DEFAULT_ROWS.forEach((row) => {
    assert.ok(!('members' in row), row.key);
    assert.equal(row.icon_x_offset ?? 0, TODAY_ICON_X_OFFSETS[row.key], row.key);
    assert.notEqual(row.icon_x_offset, 0, row.key);
  });
});

test('Total level adds up every row\'s base level, a level past the curve\'s max level counting as the max', async () => {
  const ui = await openStats({ session: { members: true } });
  for (const skill of CLIENT_SKILLS) ui.skill(skill, { level: 50, base: 50, xp: 0 });
  ui.skill('sailing', { level: 40, base: 40 });
  ui.cycles(5);
  assert.equal(totalLevelText(ui), 'Total level: 1190');

  ui.skill('attack', { level: 120, base: 120 });
  ui.cycles(5);
  assert.equal(totalLevelText(ui), 'Total level: 1239', 'a virtual level of 120 counts as 99');
});

test('Total XP adds up in a Long: every row\'s XP, past what an Int holds', async () => {
  const ui = await openStats({ session: { members: true } });
  ui.skill('attack', { xp: 1234567 });
  ui.skill('sailing', { xp: 3000000 });
  assert.equal(totalXp(ui), '4,234,567');

  ui.skill('attack', { xp: MOST_XP_AN_INT_HOLDS });
  ui.skill('sailing', { xp: MOST_XP_AN_INT_HOLDS });
  assert.equal(totalXp(ui), commas(2 * MOST_XP_AN_INT_HOLDS));

  for (const skill of CLIENT_SKILLS) ui.skill(skill, { xp: MOST_XP_AN_INT_HOLDS });
  assert.equal(totalXp(ui), commas(24 * MOST_XP_AN_INT_HOLDS));
});

test('Total XP is written in groups of three with commas: 3,000,000,000 over the 24 skills, and a total under 1000 bare', async () => {
  const ui = await openStats({ session: { members: true } });
  for (const skill of CLIENT_SKILLS) ui.skill(skill, { xp: 125000000 });
  assert.equal(totalXp(ui), '3,000,000,000');

  for (const skill of CLIENT_SKILLS) ui.skill(skill, { xp: 0 });
  ui.skill('attack', { xp: 999 });
  assert.equal(totalXp(ui), '999');
});

test('the stats tab follows a skill as it changes', async () => {
  const ui = await openStats();
  ui.skill('attack', { level: 50, base: 50, xp: 101333 });
  ui.cycles(10);
  const shown = ui.texts('stats');
  assert.deepEqual(shown.slice(0, 2), ['50', '50']);
  assert.ok(shown.includes('Total level: 50'));
});

test('a skill\'s tooltip names it and shows the XP its next level needs from the table\'s curve (level 99 at 13,034,431), and none at the curve\'s last level', async () => {
  const ui = await stats();
  ui.skill('attack', { level: 98, base: 98, xp: 12000000 });
  const next = TABLE.curve.xp[98];
  assert.equal(next, 13034431);
  assert.equal(ui.call('stats.stats-tooltip.component.tipLeft', ATTACK), 'Attack XP:|Next level at:|Remaining XP:');
  assert.equal(ui.call('stats.stats-tooltip.component.tipRight', ATTACK), `12,000,000|${commas(next)}|${commas(next - 12000000)}`);

  ui.skill('attack', { level: 99, base: 99, xp: 13034431 });
  assert.equal(ui.call('stats.stats-tooltip.component.tipLeft', ATTACK), 'Attack XP:');
});

test('every player sees the same tooltips on any world: no skill is locked and Total XP is Total XP alone', async () => {
  const free = await stats({ session: { members: false } });
  const member = await stats({ session: { members: true } });
  for (const ui of [free, member]) for (const skill of CLIENT_SKILLS) ui.skill(skill, { level: 10, base: 10, xp: 0 });

  for (const row of TABLE.skills) {
    assert.equal(free.call('stats.stats-tooltip.component.tipLeft', row.stat), member.call('stats.stats-tooltip.component.tipLeft', row.stat), row.key);
    assert.equal(free.call('stats.stats-tooltip.component.tipRight', row.stat), member.call('stats.stats-tooltip.component.tipRight', row.stat), row.key);
  }
  assert.equal(free.call('stats.stats-tooltip.component.tipLeft', FLETCHING), 'Fletching XP:|Next level at:|Remaining XP:');
  assert.equal(free.call('stats.stats-tooltip.component.tipLeft', TOTAL_ROW), 'Total XP:');
  assert.equal(free.call('stats.stats-tooltip.component.tipRight', TOTAL_ROW), '0');
});

test('the classic 24 do not scroll the tab', async () => {
  const scrolled = [];
  await openStats({ builtins: { cc_scroll_size_set: (width, height) => scrolled.push(height) } });
  assert.deepEqual(scrolled.filter((height) => height > 0), []);
});
