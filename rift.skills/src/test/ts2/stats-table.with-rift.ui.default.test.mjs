import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const COMPILER = fileURLToPath(new URL('../bin/ts2.js', import.meta.resolve('@playrift/ts2-compiler')));
const DEFAULT_UI = 'build/ts2-deps/rift.ui.default';
const CLASSIC_XP = parse(readFileSync('ui/lib/skills.toml', 'utf8')).curve.xp;
const VIRTUAL_XP = [...CLASSIC_XP, 14391160, 15889109, 17542976, 19368992, 21385073, 23611006, 26068632, 28782069, 31777943,
  35085654, 38737661, 42769801, 47221641, 52136869, 57563718, 63555443, 70170840, 77474828, 85539082, 94442737, 104273167,
  115126838, 127110260, 140341028, 154948977, 171077457, 188884740];

const TOTAL_ROW = 64;

const ROWS = [
  { key: 'attack', title: 'Attack', stat: 0, icon: 197 },
  { key: 'cooking', title: 'Cooking', stat: 7, icon: 212 },
  { key: 'alchemy', title: 'Alchemy', stat: 30, icon: 205 },
  { key: 'sorcery', title: 'Sorcery', stat: 63, icon: 228 },
];

function tableText(rows, { virtualLevels = true, layout = 'stretch', totalLevel = 'own_row' } = {}) {
  const skills = rows.map((row) => Object.entries({ ...row, icon_x_offset: row.icon_x_offset ?? 0 }).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join('\n'));
  const curve = virtualLevels
    ? `max_level = 99\nmax_xp = 200000000\nvirtual_levels = true\nmax_virtual_level = 126\nxp = [${VIRTUAL_XP.join(', ')}]`
    : `max_level = 99\nmax_xp = 200000000\nvirtual_levels = false\nxp = [${CLASSIC_XP.join(', ')}]`;
  return `${skills.map((row) => `[[skills]]\n${row}\n`).join('\n')}\n[curve]\n${curve}\n\n[settings]\nstats_tab_layout = "${layout}"\ntotal_level = "${totalLevel}"\n`;
}

function compileWith(table) {
  const folder = mkdtempSync(join(tmpdir(), 'rift-skills-table-'));
  cpSync('ui', join(folder, 'ui'), { recursive: true });
  cpSync('ui-with/rift.ui.default', join(folder, 'with'), { recursive: true });
  writeFileSync(join(folder, 'ui/lib/skills.toml'), table);
  const out = join(folder, 'out');
  const compiled = spawnSync(process.execPath, [COMPILER, join(folder, 'with'), '--stand-in-externals', '--out-dir', out, '--quiet',
    '--dependency', `rift.ui.default=${DEFAULT_UI}`, '--dependency', `rift.skills=${join(folder, 'ui')}`], { encoding: 'utf8' });
  return { folder, out, ok: compiled.status === 0, diagnostics: `${compiled.stdout}${compiled.stderr}` };
}

const builds = new Map();

after(() => {
  for (const compiled of builds.values()) rmSync(compiled.folder, { recursive: true, force: true });
});

function buildOf(table) {
  if (!builds.has(table)) builds.set(table, compileWith(table));
  return builds.get(table);
}

async function statsWith(rows, settings, { levels = {}, bases = {}, xps = {}, members = true, recorded = true } = {}) {
  const compiled = buildOf(tableText(rows, settings));
  assert.ok(compiled.ok, compiled.diagnostics);
  const scrolled = [];
  const tiled = [];
  const fonts = [];
  const ui = await loadTs2Build(compiled.out, {
    session: { members },
    builtins: {
      stat: (stat) => levels[stat] ?? 1,
      stat_base: (stat) => bases[stat] ?? 1,
      skill_visible_xp: (stat) => xps[stat] ?? 0,
      ...(recorded && {
        cc_scroll_size_set: (width, height) => scrolled.push(height),
        cc_tiling_set: (on) => tiled.push(on),
        cc_text_font_set: (font) => fonts.push(font),
      }),
    },
  });
  ui.open('stats');
  ui.cycles(5);
  const fontIds = JSON.parse(readFileSync(join(compiled.out, 'stand-in-externals.json'), 'utf8')).assets.game.font;
  return { ui, scrolled, tiled, fonts, fontIds };
}

const SPRITE_SIZE = 36;
const BOX_ROWS = 31;
const BAR_ROWS = 19;
const HALF_X = 31;
const CELL_W = 62;

function skillsOf(count) {
  return Array.from({ length: count }, (_, index) => ({ key: `skill_${index}`, title: `Skill ${index}`, stat: index, icon: 197 }));
}

function isTotal(box) {
  return box.children.some((child) => /^Total (level|lvl):/.test(child.text ?? ''));
}

function skillBoxesOf(ui) {
  return ui.component('stats', 'stats_skills').children.filter((child) => child.children.length > 0 && !isTotal(child));
}

function totalOf(ui) {
  const inLastRow = ui.component('stats', 'stats_skills').children.find(isTotal);
  return inLastRow ?? ui.component('stats', 'stats_pinned').children.find(isTotal);
}

function descendantsOf(component) {
  return component.children.flatMap((child) => [child, ...descendantsOf(child)]);
}

function spritesOf(box, name) {
  return descendantsOf(box).filter((child) => child.spriteName === name);
}

function spriteOf(box, name) {
  return box.children.find((child) => child.spriteName === name);
}

const BASES = { 0: 120, 7: 50, 30: 99, 63: 10 };
const LEVELS = { 0: 125, 7: 52, 30: 99, 63: 12 };

test('a table of four skills on stats 0, 7, 30 and 63 shows four boxes, each its row\'s title, icon and stat\'s levels', async () => {
  const { ui } = await statsWith(ROWS, {}, { levels: LEVELS, bases: BASES });
  const boxes = ui.component('stats', 'stats_skills').children.filter((child) => child.children.length > 0);

  assert.equal(boxes.length, ROWS.length);
  ROWS.forEach((row, index) => {
    const box = boxes[index];
    assert.deepEqual(box.options, ['', `View <col=ff981f>${row.title}</col> guide`], row.key);
    assert.ok(box.children.some((child) => child.sprite === row.icon), row.key);
    assert.deepEqual(box.children.map((child) => child.text ?? '').filter((text) => text !== ''), [`${LEVELS[row.stat]}`, `${BASES[row.stat]}`], row.key);
  });
});

test('a row\'s icon_x_offset moves its icon that many pixels right, or left when negative; 0 leaves it 3 pixels into a standard box, and where the group\'s centring puts it in a widened one', async () => {
  const offsets = { attack: 0, cooking: 8, alchemy: -8, sorcery: 3 };
  const rows = ROWS.map((row) => ({ ...row, icon_x_offset: offsets[row.key] }));

  for (const layout of ['reflow', 'stretch']) {
    const { ui } = await statsWith(rows, { layout });
    const boxes = ui.component('stats', 'stats_skills').children.filter((child) => child.children.length > 0);
    const iconX = (index) => boxes[index].children.find((child) => child.sprite === rows[index].icon).bounds.x - boxes[index].bounds.x;
    const unmoved = layout === 'reflow' ? 3 : 3 + Math.floor((boxes[0].bounds.width - CELL_W - Math.floor((boxes[0].bounds.width - CELL_W) / 2)) / 2);

    rows.forEach((row, index) => {
      assert.equal(boxes[index].bounds.width === CELL_W, layout === 'reflow', `${layout}, ${row.key}`);
      assert.equal(iconX(index), unmoved + offsets[row.key], `${layout}, ${row.key}`);
    });
  }
});

test('its Total level adds each row\'s base level up to max level, never a virtual level, and sits under the two rows in its 47 high box pinned to the bottom', async () => {
  const { ui } = await statsWith(ROWS, {}, { levels: LEVELS, bases: BASES });
  const total = ui.find('stats', { text: 'Total level: 258' });
  assert.equal(total.bounds.y, 213 + 2);
});

test('with virtual levels on, a skill\'s tooltip runs its next level on past max level to max virtual level', async () => {
  const { ui } = await statsWith(ROWS, {}, { bases: { 30: 110 }, xps: { 30: 40000000 } });
  assert.equal(ui.call('stats.stats-tooltip.component.tipLeft', 30), 'Alchemy XP:|Next level at:|Remaining XP:');
  assert.equal(ui.call('stats.stats-tooltip.component.tipRight', 30), `40,000,000|42,769,801|${(42769801 - 40000000).toLocaleString('en-US')}`);

  const { ui: last } = await statsWith(ROWS, {}, { bases: { 30: 126 }, xps: { 30: 190000000 } });
  assert.equal(last.call('stats.stats-tooltip.component.tipLeft', 30), 'Alchemy XP:');
});

test('a table with no members field compiles, and a free player on a free world sees what a member sees: every row open, Total XP alone', async () => {
  const { ui: free } = await statsWith(ROWS, {}, { levels: LEVELS, bases: BASES, members: false });
  const { ui: member } = await statsWith(ROWS, {}, { levels: LEVELS, bases: BASES, members: true });

  for (const stat of [...ROWS.map((row) => row.stat), TOTAL_ROW]) {
    assert.equal(free.call('stats.stats-tooltip.component.tipLeft', stat), member.call('stats.stats-tooltip.component.tipLeft', stat), `${stat}`);
    assert.equal(free.call('stats.stats-tooltip.component.tipRight', stat), member.call('stats.stats-tooltip.component.tipRight', stat), `${stat}`);
  }
  assert.equal(free.call('stats.stats-tooltip.component.tipLeft', 63), 'Sorcery XP:|Next level at:|Remaining XP:');
  assert.equal(free.call('stats.stats-tooltip.component.tipLeft', TOTAL_ROW), 'Total XP:');
  assert.deepEqual(free.texts('stats'), member.texts('stats'));
});

test('Total XP adds every row\'s XP in a Long, stat 63 included', async () => {
  const { ui } = await statsWith(ROWS, {}, { xps: { 0: 2147483647, 7: 2147483647, 30: 2147483647, 63: 2147483647 } });
  assert.equal(ui.call('stats.stats-tooltip.component.tipRight', TOTAL_ROW).split('|')[0], '8,589,934,588');
});

test('thirty skills do not fit the panel: the skills scroll, Total level pinned to the bottom in the last row as on its own row', async () => {
  const thirty = Array.from({ length: 30 }, (_, index) => ({ key: `skill_${index}`, title: `Skill ${index}`, stat: index, icon: 197 }));

  const lastRow = await statsWith(thirty, { layout: 'reflow', totalLevel: 'last_row' });
  assert.deepEqual([...new Set(lastRow.scrolled.filter((height) => height > 0))], [303]);
  assert.ok(!lastRow.ui.component('stats', 'stats_skills').children.some((child) => child.children.some((each) => (each.text ?? '').startsWith('Total level'))));

  const ownRow = await statsWith(thirty, { layout: 'stretch', totalLevel: 'own_row' });
  assert.deepEqual([...new Set(ownRow.scrolled.filter((height) => height > 0))], [303]);
  assert.ok(!ownRow.ui.component('stats', 'stats_skills').children.some((child) => child.children.some((each) => (each.text ?? '').startsWith('Total level'))));
});

test('when the skills scroll, the tab shows rift.ui.default\'s standard scrollbar on the right, as tall as the scrolling skills, and no box under it; when they fit, none', async () => {
  for (const layout of ['reflow', 'stretch']) {
    const { ui } = await statsWith(skillsOf(30), { layout, totalLevel: 'last_row' });
    const bar = ui.component('stats', 'stats_scrollbar');
    const arrows = ['scrollbar_v2_0', 'scrollbar_v2_1'].map((name) => spritesOf(bar, name));

    assert.deepEqual(bar.bounds, { x: 174, y: 0, width: 16, height: 243 }, layout);
    assert.deepEqual(arrows.map((each) => each.length), [1, 1], layout);
    assert.ok(skillBoxesOf(ui).every((box) => box.bounds.x + box.bounds.width <= 174), layout);
  }

  for (const [count, layout] of [[24, 'reflow'], [16, 'stretch']]) {
    const { ui } = await statsWith(skillsOf(count), { layout, totalLevel: 'last_row' });
    assert.throws(() => ui.component('stats', 'stats_scrollbar'), /stats_scrollbar/, `${count} skills, ${layout}`);
  }
});

test('a row whose stat is 64 is refused at compile time, at the row\'s line in the table', () => {
  const compiled = compileWith(tableText([...ROWS.slice(0, 2), { ...ROWS[2], stat: 64 }, ROWS[3]]));
  rmSync(compiled.folder, { recursive: true, force: true });
  assert.equal(compiled.ok, false);
  assert.match(compiled.diagnostics, /TS2E400/);
  assert.match(compiled.diagnostics, /skills\.toml:18/);
  assert.match(compiled.diagnostics, /skills\[2\]\.stat/);
  assert.match(compiled.diagnostics, /`64`/);
});

test('a row with no stat, a server-only skill Forge leaves out of the file, is refused at compile time naming its key', () => {
  const { stat, ...serverOnly } = { ...ROWS[2], key: 'sailing_lore', title: 'Sailing lore' };
  const compiled = compileWith(tableText([...ROWS, serverOnly]));
  rmSync(compiled.folder, { recursive: true, force: true });
  assert.equal(compiled.ok, false);
  assert.match(compiled.diagnostics, /TS2E400/);
  assert.match(compiled.diagnostics, /`sailing_lore`/);
});

test('with Stretch on and room to spare, each skill box\'s background is one box drawn once: both halves untiled, scaled until its border reaches the box\'s bottom', async () => {
  for (const [count, totalLevel] of [[18, 'own_row'], [18, 'last_row'], [23, 'last_row']]) {
    const { ui, tiled } = await statsWith(skillsOf(count), { layout: 'stretch', totalLevel });
    const boxes = skillBoxesOf(ui);
    const step = boxes[3].bounds.y - boxes[0].bounds.y;
    const scaledHeight = Math.floor(((step + 1) * SPRITE_SIZE) / BOX_ROWS);
    const setting = `${count} skills, ${totalLevel}`;

    assert.equal(step, 32, setting);
    assert.deepEqual(tiled.filter((on) => on), [], setting);
    boxes.forEach((box, index) => {
      assert.deepEqual(spriteOf(box, 'miscgraphics2_2').bounds, { x: box.bounds.x, y: box.bounds.y, width: SPRITE_SIZE, height: scaledHeight }, `${setting}, box ${index}`);
      assert.deepEqual(spriteOf(box, 'miscgraphics2_3').bounds, { x: box.bounds.x + HALF_X, y: box.bounds.y, width: SPRITE_SIZE, height: scaledHeight }, `${setting}, box ${index}`);
    });
  }
});

test('a Total level box taller than the short bar is built from the bar\'s own pieces at their own size: its four corners, never a scaled or tiled sprite, and none of the bar\'s middle; in the last row its corners sit at its own edges, as a skill box\'s border does', async () => {
  for (const [count, layout, totalLevel, barHeight] of [[21, 'reflow', 'own_row', 47], [18, 'stretch', 'own_row', 47], [22, 'reflow', 'last_row', 33], [23, 'reflow', 'last_row', 33]]) {
    const { ui, tiled } = await statsWith(skillsOf(count), { layout, totalLevel });
    const total = totalOf(ui);
    const { x, y, width } = total.bounds;
    const inset = totalLevel === 'last_row' ? 0 : 1;
    const setting = `${count} skills, ${layout}, ${totalLevel}`;

    assert.deepEqual(tiled.filter((on) => on), [], setting);
    assert.deepEqual(spritesOf(total, 'miscgraphics2_6'), [], setting);
    assert.deepEqual(spritesOf(total, 'miscgraphics2_4').map((sprite) => sprite.bounds), [
      { x: x + inset, y, width: SPRITE_SIZE, height: SPRITE_SIZE },
      { x: x + inset, y: y + barHeight - BAR_ROWS, width: SPRITE_SIZE, height: SPRITE_SIZE },
    ], setting);
    assert.deepEqual(spritesOf(total, 'miscgraphics2_5').map((sprite) => sprite.bounds), [
      { x: x + width - inset - SPRITE_SIZE, y, width: SPRITE_SIZE, height: SPRITE_SIZE },
      { x: x + width - inset - SPRITE_SIZE, y: y + barHeight - BAR_ROWS, width: SPRITE_SIZE, height: SPRITE_SIZE },
    ], setting);
  }
});

test('the 7-row Total level box writes it in the larger p12 font; the short bar and the boxes on row 8 in the normal p11', async () => {
  for (const [count, layout, totalLevel, font] of [[21, 'reflow', 'own_row', 'font_495'], [18, 'stretch', 'last_row', 'font_495'], [24, 'reflow', 'own_row', 'font_494'], [22, 'reflow', 'last_row', 'font_494'], [23, 'reflow', 'last_row', 'font_494']]) {
    const { fonts, fontIds } = await statsWith(skillsOf(count), { layout, totalLevel });
    const setting = `${count} skills, ${layout}, ${totalLevel}`;

    assert.equal(fonts.includes(fontIds.font_495), font === 'font_495', setting);
    assert.deepEqual([...new Set(fonts)].sort(), [fontIds.font_494, fontIds[font]].filter((each, index, all) => all.indexOf(each) === index).sort(), setting);
  }
});

test('the one-cell Total level box reads Total lvl: over the number, on two lines; every other box reads Total level: and the number on one', async () => {
  for (const [count, layout, totalLevel, text] of [[23, 'reflow', 'last_row', 'Total lvl:<br>23'], [22, 'reflow', 'last_row', 'Total level: 22'], [21, 'reflow', 'own_row', 'Total level: 21'], [24, 'reflow', 'own_row', 'Total level: 24']]) {
    const { ui } = await statsWith(skillsOf(count), { layout, totalLevel });

    assert.equal(totalOf(ui).children.find((child) => (child.text ?? '') !== '').text, text, `${count} skills, ${layout}, ${totalLevel}`);
  }
});

test('a Total level box in the last row lines up with the skill boxes above it: its drawn left and right edges are theirs, a third, two thirds or half of the width', async () => {
  for (const [count, layout] of [[23, 'reflow'], [22, 'reflow'], [23, 'stretch'], [15, 'stretch']]) {
    const { ui } = await statsWith(skillsOf(count), { layout, totalLevel: 'last_row' });
    const total = totalOf(ui);
    const boxes = skillBoxesOf(ui);
    const rowYs = [...new Set(boxes.map((box) => box.bounds.y))].sort((a, b) => a - b);
    const above = boxes.filter((box) => box.bounds.y === rowYs.at(-2) && box.bounds.x >= total.bounds.x);
    const caps = [...spritesOf(total, 'miscgraphics2_4'), ...spritesOf(total, 'miscgraphics2_5')];
    const setting = `${count} skills, ${layout}`;

    assert.ok(above.length > 0, setting);
    assert.equal(Math.min(...caps.map((cap) => cap.bounds.x)), Math.min(...above.map((box) => box.bounds.x)), `${setting}: left edge`);
    assert.equal(Math.max(...caps.map((cap) => cap.bounds.x + cap.bounds.width)), Math.max(...above.map((box) => box.bounds.x + box.bounds.width)), `${setting}: right edge`);
  }
});

test('at the standard height every background sprite is drawn once at its own height, the pixels today\'s tiles drew', async () => {
  for (const [count, layout, totalLevel] of [[24, 'reflow', 'own_row'], [24, 'reflow', 'last_row'], [23, 'reflow', 'own_row'], [24, 'stretch', 'last_row'], [30, 'stretch', 'own_row'], [30, 'reflow', 'last_row']]) {
    const { ui, tiled } = await statsWith(skillsOf(count), { layout, totalLevel });
    const setting = `${count} skills, ${layout}, ${totalLevel}`;

    assert.deepEqual(tiled.filter((on) => on), [], setting);
    skillBoxesOf(ui).forEach((box, index) => {
      const rightHalfX = box.bounds.width - (CELL_W - HALF_X);
      assert.deepEqual(spriteOf(box, 'miscgraphics2_2').bounds, { x: box.bounds.x, y: box.bounds.y, width: SPRITE_SIZE, height: SPRITE_SIZE }, `${setting}, box ${index}`);
      assert.deepEqual(spriteOf(box, 'miscgraphics2_3').bounds, { x: box.bounds.x + rightHalfX, y: box.bounds.y, width: SPRITE_SIZE, height: SPRITE_SIZE }, `${setting}, box ${index}`);
    });

    const total = ui.component('stats', 'stats_skills').children.find(isTotal);
    if (total !== undefined) {
      for (const name of ['miscgraphics2_4', 'miscgraphics2_5', 'miscgraphics2_6']) {
        assert.equal(spriteOf(total, name).bounds.height, SPRITE_SIZE, `${setting}, ${name}`);
      }
    }
  }
});

test('in a box taller than 30 the icon and both levels sit centred, one pixel lower in a 32 high box than in a 30 high one', async () => {
  const standard = skillBoxesOf((await statsWith(skillsOf(24), { layout: 'reflow', totalLevel: 'own_row' })).ui)[0];
  const taller = skillBoxesOf((await statsWith(skillsOf(18), { layout: 'reflow', totalLevel: 'own_row' })).ui)[0];
  const contents = (box) => box.children.filter((child) => child.spriteName === undefined || child.sprite === 197).map((child) => ({ x: child.bounds.x - box.bounds.x, y: child.bounds.y - box.bounds.y }));

  assert.deepEqual(contents(standard), [{ x: 3, y: 4 }, { x: 32, y: 4 }, { x: 44, y: 16 }]);
  assert.deepEqual(contents(taller), [{ x: 3, y: 5 }, { x: 32, y: 5 }, { x: 44, y: 17 }]);
});

const HALF_NAMES = ['miscgraphics2_2', 'miscgraphics2_3'];

function backgroundLayers(component, clip = component.bounds) {
  return component.children.flatMap((child) => {
    const bounds = child.bounds;
    const left = Math.max(clip.x, bounds.x);
    const top = Math.max(clip.y, bounds.y);
    const right = Math.min(clip.x + clip.width, bounds.x + bounds.width);
    const bottom = Math.min(clip.y + clip.height, bounds.y + bounds.height);
    const inner = { x: left, y: top, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
    const own = HALF_NAMES.includes(child.spriteName) ? [{ name: child.spriteName, bounds, clip: inner }] : [];
    return [...own, ...backgroundLayers(child, inner)];
  });
}

function drawnColumns(box, row) {
  const layers = backgroundLayers(box);
  return Array.from({ length: box.bounds.width }, (_, offset) => {
    const x = box.bounds.x + offset;
    let drawn = null;
    for (const { name, bounds, clip } of layers) {
      if (x < clip.x || x >= clip.x + clip.width || row < clip.y || row >= clip.y + clip.height) continue;
      const column = Math.floor(((x - bounds.x) * SPRITE_SIZE) / bounds.width);
      if (column < HALF_X) drawn = `${name === 'miscgraphics2_2' ? 'left' : 'right'} ${column}`;
    }
    return drawn;
  });
}

function columnsOfHalf(half, from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => `${half} ${from + index}`);
}

test('with Stretch on, a widened skill box draws both halves\' outer edges at their own size, one pixel to a pixel, its icon, levels and slash centred as a group with a little more room between the icon and the levels, and the left half\'s plain middle repeated in the space; a 62 wide box draws the pixels it always did', async () => {
  for (const [count, totalLevel] of [[15, 'last_row'], [15, 'own_row'], [16, 'last_row'], [16, 'own_row']]) {
    const { ui } = await statsWith(skillsOf(count), { layout: 'stretch', totalLevel });
    const setting = `${count} skills, ${totalLevel}`;

    skillBoxesOf(ui).forEach((box, index) => {
      const at = `${setting}, box ${index}`;
      const drawn = drawnColumns(box, box.bounds.y + 15);
      const slashX = drawn.indexOf('right 0');
      const plain = [...drawn.slice(HALF_X, slashX), ...drawn.slice(slashX + 24, -7)];
      const extra = box.bounds.width - CELL_W;
      const outside = box.bounds.width - (slashX + HALF_X);
      const iconX = box.children.find((child) => child.sprite === 197).bounds.x - box.bounds.x;
      const levelXs = box.children.filter((child) => (child.text ?? '') !== '').map((child) => child.bounds.x - box.bounds.x);

      assert.ok(extra > 0, at);
      assert.deepEqual(drawn.slice(0, HALF_X), columnsOfHalf('left', 0, HALF_X - 1), at);
      assert.deepEqual(drawn.slice(slashX, slashX + 24), columnsOfHalf('right', 0, 23), at);
      assert.deepEqual(drawn.slice(-7), columnsOfHalf('right', 24, HALF_X - 1), at);
      assert.deepEqual(plain.filter((column) => !columnsOfHalf('left', 5, HALF_X - 1).includes(column)), [], at);
      assert.deepEqual(backgroundLayers(box).map((layer) => layer.bounds.width).filter((width) => width !== SPRITE_SIZE), [], at);
      assert.equal(iconX - 3, outside, at);
      assert.equal(slashX - HALF_X - outside, Math.floor(extra / 2), at);
      assert.deepEqual(levelXs, [slashX + 1, slashX + 13], at);
    });
  }

  for (const [count, layout] of [[24, 'reflow'], [24, 'stretch'], [18, 'stretch']]) {
    const { ui } = await statsWith(skillsOf(count), { layout, totalLevel: 'own_row' });

    skillBoxesOf(ui).forEach((box, index) => {
      assert.equal(box.bounds.width, CELL_W, `${count} skills, ${layout}, box ${index}`);
      assert.deepEqual(drawnColumns(box, box.bounds.y + 15), [...columnsOfHalf('left', 0, HALF_X - 1), ...columnsOfHalf('right', 0, HALF_X - 1)], `${count} skills, ${layout}, box ${index}`);
    });
  }
});

test('a narrowed skill box beside the scrollbar draws both halves\' outer edges at their own size and crops the left half\'s plain middle, squeezing nothing sideways; its icon keeps its place and the levels and slash keep the standard spacing to each other, moved left with the right half', async () => {
  for (const [count, layout, totalLevel] of [[30, 'reflow', 'last_row'], [30, 'stretch', 'own_row'], [28, 'stretch', 'last_row']]) {
    const { ui } = await statsWith(skillsOf(count), { layout, totalLevel });
    const setting = `${count} skills, ${layout}, ${totalLevel}`;

    skillBoxesOf(ui).forEach((box, index) => {
      const at = `${setting}, box ${index}`;
      const drawn = drawnColumns(box, box.bounds.y + 15);
      const slashX = drawn.indexOf('right 0');
      const iconX = box.children.find((child) => child.sprite === 197).bounds.x - box.bounds.x;
      const levelXs = box.children.filter((child) => (child.text ?? '') !== '').map((child) => child.bounds.x - box.bounds.x);

      assert.ok(box.bounds.width < CELL_W, at);
      assert.equal(slashX, box.bounds.width - HALF_X, at);
      assert.deepEqual(drawn.slice(0, slashX), columnsOfHalf('left', 0, slashX - 1), at);
      assert.deepEqual(drawn.slice(slashX), columnsOfHalf('right', 0, HALF_X - 1), at);
      assert.deepEqual(backgroundLayers(box).map((layer) => layer.bounds.width).filter((width) => width !== SPRITE_SIZE), [], at);
      assert.equal(iconX, 3, at);
      assert.deepEqual(levelXs, [slashX + 1, slashX + 13], at);
    });
  }
});

test('in Stretch\'s last row the half wide Total level box draws its outer and inner edge on the very pixels the skill box above draws its own', async () => {
  const { ui } = await statsWith(skillsOf(15), { layout: 'stretch', totalLevel: 'last_row' });
  const total = totalOf(ui);
  const above = skillBoxesOf(ui).find((box) => box.bounds.x === total.bounds.x && box.bounds.y < total.bounds.y && box.bounds.y + box.bounds.height >= total.bounds.y - 2);
  const drawn = drawnColumns(above, above.bounds.y + 15);
  const leftCorner = spritesOf(total, 'miscgraphics2_4')[0].bounds;
  const rightCorner = spritesOf(total, 'miscgraphics2_5')[0].bounds;
  const totalRight = total.bounds.x + total.bounds.width;

  assert.equal(leftCorner.width, SPRITE_SIZE);
  assert.equal(rightCorner.width, SPRITE_SIZE);
  assert.deepEqual([leftCorner.x, rightCorner.x + rightCorner.width], [total.bounds.x, totalRight]);
  assert.deepEqual([drawn.indexOf('left 0'), drawn.indexOf('left 1')].map((offset) => above.bounds.x + offset), [total.bounds.x, total.bounds.x + 1]);
  assert.deepEqual([drawn.indexOf('right 29'), drawn.indexOf('right 30')].map((offset) => above.bounds.x + offset), [totalRight - 2, totalRight - 1]);
  assert.deepEqual([drawn.lastIndexOf('left 0'), drawn.lastIndexOf('left 1'), drawn.lastIndexOf('right 29'), drawn.lastIndexOf('right 30')], [0, 1, above.bounds.width - 2, above.bounds.width - 1]);
});

function hover(ui, box, from) {
  from.dragTo(box);
  ui.cycles(30);
  const tip = ui.texts('stats').find((text) => text.includes(' XP:'));
  return { text: tip, bounds: ui.find('stats', { text: tip }).bounds };
}

test('a skill\'s tooltip sits by the box as it is shown: after the skills scroll, hovering a box puts its tooltip where it would sit by that box unscrolled', async () => {
  const { ui } = await statsWith(skillsOf(28), { layout: 'stretch', totalLevel: 'last_row' }, { recorded: false });
  const boxes = skillBoxesOf(ui);
  const unscrolled = hover(ui, boxes[10], boxes[12]);
  const offset = { x: unscrolled.bounds.x - boxes[10].bounds.x, y: unscrolled.bounds.y - boxes[10].bounds.y };

  const bar = ui.component('stats', 'stats_scrollbar');
  spritesOf(bar, 'scrollbar_dragger_v2_1')[0].dragTo(spritesOf(bar, 'scrollbar_v2_1')[0]);
  ui.cycles(3);

  const scrolledBy = 1 - boxes[0].bounds.y;
  const shown = boxes.findIndex((box) => box.bounds.y >= 30 && box.bounds.x > 1);
  const scrolled = hover(ui, boxes[shown], boxes[shown + 2]);

  assert.ok(scrolledBy > 0, `${scrolledBy}`);
  assert.ok(scrolled.text.startsWith(`Skill ${shown} XP:`), scrolled.text);
  assert.deepEqual({ x: scrolled.bounds.x - boxes[shown].bounds.x, y: scrolled.bounds.y - boxes[shown].bounds.y }, offset);
});
