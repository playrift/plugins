import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-with/rift.skills';
const TABLE = readFileSync('build/ts2-deps/rift.skills/lib/skills.toml', 'utf8');

function tableXp(level) {
  const curve = /^xp = \[([^\]]*)\]/m.exec(TABLE)[1].replace(/#.*$/gm, '').split(',').map((n) => n.trim()).filter(Boolean);
  return Number(curve[level - 1]);
}

const commas = (n) => n.toLocaleString('en-US');

const NOT_SAILING = ['attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic', 'cooking', 'woodcutting',
  'fletching', 'fishing', 'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving', 'slayer',
  'farming', 'runecraft', 'hunter', 'construction'];
const TOTAL_ROW = 24;
const ATTACK = 0;
const FLETCHING = 9;

test('the stats panel totals every skill\'s level and XP, Sailing included (XP past a billion)', async () => {
  const ui = await loadTs2Build(BUILD, { session: { members: true } });
  for (const skill of NOT_SAILING) ui.skill(skill, { level: 50, base: 50, xp: 0 });
  ui.skill('attack', { xp: 1234567 });
  ui.skill('sailing', { level: 40, base: 40, xp: 3000000 });
  const totalLevel = () => {
    ui.open('stats');
    ui.cycles(5);
    return ui.texts('stats').find((text) => text.startsWith('Total level'));
  };
  const totalXp = () => ui.call('stats.stats-tooltip.component.tipRight', TOTAL_ROW);

  assert.equal(totalLevel(), 'Total level: 1190');
  assert.equal(totalXp(), '4,234,567');

  for (const skill of ['attack', 'defence', 'strength', 'hitpoints', 'ranged']) ui.skill(skill, { xp: 200000000 });
  ui.skill('prayer', { xp: 50007 });
  assert.equal(totalXp(), '1,003,050,007');
});

test('the stats tab follows a skill as it changes', async () => {
  const ui = await loadTs2Build(BUILD);
  ui.open('stats');
  ui.cycles(5);
  ui.skill('attack', { level: 50, base: 50, xp: 101333 });
  ui.cycles(10);
  const shown = ui.texts('stats');
  assert.deepEqual(shown.slice(0, 2), ['50', '50']);
  assert.ok(shown.includes('Total level: 50'));
});

test('a skill\'s tooltip names it and shows the XP its next level needs from rift.skills\' table (level 99 at 13,034,431)', async () => {
  const ui = await loadTs2Build(BUILD);
  ui.skill('attack', { level: 98, base: 98, xp: 12000000 });
  assert.equal(tableXp(99), 13034431);
  const next = tableXp(99);
  assert.equal(ui.call('stats.stats-tooltip.component.tipLeft', ATTACK), 'Attack XP:|Next level at:|Remaining XP:');
  assert.equal(ui.call('stats.stats-tooltip.component.tipRight', ATTACK), `12,000,000|${commas(next)}|${commas(next - 12000000)}`);
});

test('a members-only skill in the table is locked to a free player on a free world, and open to a member', async () => {
  const free = await loadTs2Build(BUILD, { session: { members: false } });
  free.skill('attack', { level: 1, base: 1, xp: 0 });
  assert.match(TABLE, /name = "fletching"\ntitle = "Fletching"\nmembers = true/);
  assert.equal(free.call('stats.stats-tooltip.component.tipRight', FLETCHING), '<col=ff0000>Members Only</col>');
  assert.equal(free.call('stats.stats-tooltip.component.tipRight', ATTACK), '0|83|83', 'Attack is free');
  const member = await loadTs2Build(BUILD, { session: { members: true } });
  assert.notEqual(member.call('stats.stats-tooltip.component.tipRight', FLETCHING), '<col=ff0000>Members Only</col>');
});
