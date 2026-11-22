import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'smol-toml';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-with/rift.ui.default';

const REFLOW = 0;
const STRETCH = 1;
const LAST_ROW = 0;
const OWN_ROW = 1;

const PANEL_WIDTH = 190;
const PANEL_HEIGHT = 261;

const NONE = { x: -1, y: -1, width: -1, height: -1 };

const TODAY_CELLS = [
  { x: 1, y: 1, height: 30 }, { x: 64, y: 1, height: 30 }, { x: 127, y: 1, height: 30 },
  { x: 1, y: 31, height: 30 }, { x: 64, y: 31, height: 30 }, { x: 127, y: 31, height: 30 },
  { x: 1, y: 61, height: 30 }, { x: 64, y: 61, height: 30 }, { x: 127, y: 61, height: 30 },
  { x: 1, y: 91, height: 30 }, { x: 64, y: 91, height: 30 }, { x: 127, y: 91, height: 30 },
  { x: 1, y: 121, height: 30 }, { x: 64, y: 121, height: 30 }, { x: 127, y: 121, height: 30 },
  { x: 1, y: 151, height: 30 }, { x: 64, y: 151, height: 30 }, { x: 127, y: 151, height: 30 },
  { x: 1, y: 181, height: 30 }, { x: 64, y: 181, height: 30 }, { x: 127, y: 181, height: 30 },
  { x: 1, y: 211, height: 32 }, { x: 64, y: 211, height: 32 }, { x: 127, y: 211, height: 32 },
].map((cell) => ({ x: cell.x, y: cell.y, width: 62, height: cell.height }));

const TODAY_CELL_BY_STAT = new Map([
  [0, { x: 1, y: 1, height: 30 }], [2, { x: 1, y: 31, height: 30 }], [1, { x: 1, y: 61, height: 30 }],
  [4, { x: 1, y: 91, height: 30 }], [5, { x: 1, y: 121, height: 30 }], [6, { x: 1, y: 151, height: 30 }],
  [20, { x: 1, y: 181, height: 30 }], [22, { x: 1, y: 211, height: 32 }],
  [3, { x: 64, y: 1, height: 30 }], [16, { x: 64, y: 31, height: 30 }], [15, { x: 64, y: 61, height: 30 }],
  [17, { x: 64, y: 91, height: 30 }], [12, { x: 64, y: 121, height: 30 }], [9, { x: 64, y: 151, height: 30 }],
  [18, { x: 64, y: 181, height: 30 }], [21, { x: 64, y: 211, height: 32 }],
  [14, { x: 127, y: 1, height: 30 }], [13, { x: 127, y: 31, height: 30 }], [10, { x: 127, y: 61, height: 30 }],
  [7, { x: 127, y: 91, height: 30 }], [11, { x: 127, y: 121, height: 30 }], [8, { x: 127, y: 151, height: 30 }],
  [19, { x: 127, y: 181, height: 30 }], [23, { x: 127, y: 211, height: 32 }],
]);

const DEFAULT_ROWS = parse(readFileSync('src/main/resources/META-INF/rift/package/skills.default.toml', 'utf8')).skills.skill;

const TODAY_TOTAL = { x: 0, y: 241, width: 190, height: 19 };

const ui = await loadTs2Build(BUILD);

function skillBox(index, count, layout, placement, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
  const settings = [index, count, width, height, layout, placement];
  return {
    x: ui.call('stats.stats-layout.skillBoxX', ...settings),
    y: ui.call('stats.stats-layout.skillBoxY', ...settings),
    width: ui.call('stats.stats-layout.skillBoxWidth', ...settings),
    height: ui.call('stats.stats-layout.skillBoxHeight', ...settings),
  };
}

function skillBoxes(count, layout, placement, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
  return Array.from({ length: count }, (_, index) => skillBox(index, count, layout, placement, width, height));
}

function totalBox(count, layout, placement, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
  const settings = [count, width, height, layout, placement];
  return {
    x: ui.call('stats.stats-layout.totalBoxX', ...settings),
    y: ui.call('stats.stats-layout.totalBoxY', ...settings),
    width: ui.call('stats.stats-layout.totalBoxWidth', ...settings),
    height: ui.call('stats.stats-layout.totalBoxHeight', ...settings),
  };
}

function totalBarHeight(count, layout, placement, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
  return ui.call('stats.stats-layout.totalBarHeight', count, width, height, layout, placement);
}

function scroll(count, layout, placement, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
  const settings = [count, width, height, layout, placement];
  return {
    area: ui.call('stats.stats-layout.scrollAreaHeight', ...settings),
    extent: ui.call('stats.stats-layout.scrollExtent', ...settings),
  };
}

function rowsOf(count, step, lastExtra, columns = [{ x: 1, width: 62 }, { x: 64, width: 62 }, { x: 127, width: 62 }]) {
  const rows = Math.ceil(count / columns.length);
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns.length);
    const height = row === rows - 1 ? step + lastExtra : step;
    return { x: columns[index % columns.length].x, y: 1 + row * step, width: columns[index % columns.length].width, height };
  });
}

const BOTH = [REFLOW, STRETCH];
const SEVEN_ROW_SUMMARY = { x: 0, y: 213, width: 190, height: 47 };

test('24 skills, 8 full rows, come out as today\'s stats tab in every setting: the last row 32 high, the short Total level bar below', () => {
  for (const layout of BOTH) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      const setting = `layout ${layout}, placement ${placement}`;
      assert.deepEqual(skillBoxes(24, layout, placement), TODAY_CELLS, setting);
      assert.deepEqual(totalBox(24, layout, placement), TODAY_TOTAL, setting);
      assert.equal(totalBarHeight(24, layout, placement), 19, setting);
      assert.deepEqual(scroll(24, layout, placement), { area: 243, extent: 0 }, setting);
    }
  }
});

test('rift.skills\' default rows, laid out by reflow, put each stat\'s box where today\'s stats tab puts it', () => {
  assert.equal(DEFAULT_ROWS.length, 24);

  DEFAULT_ROWS.forEach((row, index) => {
    const cell = TODAY_CELL_BY_STAT.get(row.stat);
    assert.deepEqual(skillBox(index, DEFAULT_ROWS.length, REFLOW, LAST_ROW), { x: cell.x, y: cell.y, width: 62, height: cell.height }, row.key);
  });
});

test('7 rows: the boxes stay 30 high and the Total level box, full width and 47 high, fills the space under them at the bottom', () => {
  for (const layout of BOTH) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      for (const count of [19, 21]) {
        const setting = `${count} skills, layout ${layout}, placement ${placement}`;
        assert.deepEqual(skillBoxes(count, layout, placement), rowsOf(count, 30, 2), setting);
        assert.deepEqual(totalBox(count, layout, placement), SEVEN_ROW_SUMMARY, setting);
        assert.equal(totalBarHeight(count, layout, placement), 47, setting);
        assert.equal(scroll(count, layout, placement).extent, 0, setting);
      }
    }
  }
});

test('6 rows or fewer: the boxes grow to 32 at most, the Total level box keeps its 7-row size at the bottom, the spare space above it', () => {
  for (const [layout, counts] of [[REFLOW, [1, 5, 16, 18]], [STRETCH, [18]]]) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      for (const count of counts) {
        const setting = `${count} skills, layout ${layout}, placement ${placement}`;
        assert.deepEqual(skillBoxes(count, layout, placement), rowsOf(count, 32, 2), setting);
        assert.deepEqual(totalBox(count, layout, placement), SEVEN_ROW_SUMMARY, setting);
        assert.equal(totalBarHeight(count, layout, placement), 47, setting);
        assert.equal(scroll(count, layout, placement).extent, 0, setting);
      }
    }
  }
});

test('8 rows with one free cell: in the last row, the boxes grow to 32 and Total level fills the free cell; on its own row, today\'s boxes and the short bar', () => {
  for (const layout of BOTH) {
    const setting = `layout ${layout}`;
    assert.deepEqual(skillBoxes(23, layout, LAST_ROW), rowsOf(23, 32, 2), setting);
    assert.deepEqual(totalBox(23, layout, LAST_ROW), { x: 127, y: 225, width: 62, height: 34 }, setting);
    assert.equal(totalBarHeight(23, layout, LAST_ROW), 33, setting);
    assert.deepEqual(scroll(23, layout, LAST_ROW), { area: 261, extent: 0 }, setting);

    assert.deepEqual(skillBoxes(23, layout, OWN_ROW), TODAY_CELLS.slice(0, 23), setting);
    assert.deepEqual(totalBox(23, layout, OWN_ROW), TODAY_TOTAL, setting);
    assert.equal(totalBarHeight(23, layout, OWN_ROW), 19, setting);
    assert.deepEqual(scroll(23, layout, OWN_ROW), { area: 243, extent: 0 }, setting);
  }
});

test('8 rows with two free cells: in the last row, Total level fills both, two thirds of the width; on its own row, the short bar', () => {
  for (const layout of BOTH) {
    const setting = `layout ${layout}`;
    assert.deepEqual(skillBoxes(22, layout, LAST_ROW), rowsOf(22, 32, 2), setting);
    assert.deepEqual(totalBox(22, layout, LAST_ROW), { x: 64, y: 225, width: 125, height: 34 }, setting);
    assert.equal(totalBarHeight(22, layout, LAST_ROW), 33, setting);

    assert.deepEqual(skillBoxes(22, layout, OWN_ROW), TODAY_CELLS.slice(0, 22), setting);
    assert.deepEqual(totalBox(22, layout, OWN_ROW), TODAY_TOTAL, setting);
  }
});

const BESIDE_THE_SCROLLBAR = [{ x: 1, width: 56 }, { x: 58, width: 56 }, { x: 115, width: 58 }];

function scrollbarShown(count, layout, placement, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
  return ui.call('stats.stats-layout.scrollbarShown', count, width, height, layout, placement);
}

test('more than 8 rows: the boxes stay 30 high and scroll in both modes beside a scrollbar 16 wide, narrowed to fit, the short bar pinned to the bottom in both placements', () => {
  for (const layout of BOTH) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      const setting = `layout ${layout}, placement ${placement}`;
      assert.equal(scrollbarShown(30, layout, placement), 1, setting);
      assert.deepEqual(skillBoxes(30, layout, placement), rowsOf(30, 30, 2, BESIDE_THE_SCROLLBAR), setting);
      assert.deepEqual(totalBox(30, layout, placement), TODAY_TOTAL, setting);
      assert.deepEqual(scroll(30, layout, placement), { area: 243, extent: 303 }, setting);
      assert.deepEqual(scroll(64, layout, placement), { area: 243, extent: 663 }, setting);
    }
  }
});

const TWO_STRETCHED = [{ x: 1, width: 93 }, { x: 95, width: 94 }];

test('stretch takes the fewest columns, two or three, that keep the skills within 8 rows: 16 skills are two wide columns of 8 full rows over the short bar', () => {
  for (const placement of [LAST_ROW, OWN_ROW]) {
    assert.deepEqual(skillBoxes(16, STRETCH, placement), rowsOf(16, 30, 2, TWO_STRETCHED), `placement ${placement}`);
    assert.deepEqual(totalBox(16, STRETCH, placement), TODAY_TOTAL, `placement ${placement}`);
    assert.equal(totalBarHeight(16, STRETCH, placement), 19, `placement ${placement}`);
  }
  assert.deepEqual(skillBoxes(16, REFLOW, LAST_ROW), rowsOf(16, 32, 2), 'reflow keeps three standard columns');
});

test('stretch with 15 skills: two columns of 8 rows with one free cell; in the last row Total level fills it, half the width; on its own row, the short bar', () => {
  assert.deepEqual(skillBoxes(15, STRETCH, LAST_ROW), rowsOf(15, 32, 2, TWO_STRETCHED));
  assert.deepEqual(totalBox(15, STRETCH, LAST_ROW), { x: 95, y: 225, width: 94, height: 34 });
  assert.equal(totalBarHeight(15, STRETCH, LAST_ROW), 33);

  assert.deepEqual(skillBoxes(15, STRETCH, OWN_ROW), rowsOf(15, 30, 2, TWO_STRETCHED));
  assert.deepEqual(totalBox(15, STRETCH, OWN_ROW), TODAY_TOTAL);
});

test('stretch with 8 skills or fewer is still two columns, never one, under the 7-row Total level box', () => {
  for (const count of [1, 2, 8]) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      const setting = `${count} skills, placement ${placement}`;
      assert.deepEqual(skillBoxes(count, STRETCH, placement), rowsOf(count, 32, 2, TWO_STRETCHED), setting);
      assert.deepEqual(totalBox(count, STRETCH, placement), SEVEN_ROW_SUMMARY, setting);
    }
  }
});

test('stretch with 17 to 24 skills is three columns, and past 24 three columns that scroll; a panel too narrow for two keeps the columns that fit', () => {
  for (const count of [17, 24, 30]) {
    assert.equal(new Set(skillBoxes(count, STRETCH, LAST_ROW).map((box) => box.x)).size, 3, `${count} skills`);
  }
  assert.deepEqual(scroll(30, STRETCH, LAST_ROW), { area: 243, extent: 303 });
  assert.equal(new Set(skillBoxes(8, STRETCH, LAST_ROW, 100).map((box) => box.x)).size, 1);
});

test('no scrollbar when the skills fit: 24 skills or fewer in Reflow, and Stretch\'s two columns of 16', () => {
  for (const layout of BOTH) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      for (const count of [1, 16, 23, 24]) {
        assert.equal(scrollbarShown(count, layout, placement), 0, `${count} skills, layout ${layout}, placement ${placement}`);
      }
    }
  }
});

test('stretch on a narrower panel: two columns of boxes as wide as the panel allows, the remainder to the last; the rows count by two', () => {
  const columns = [{ x: 1, width: 73 }, { x: 75, width: 74 }];
  assert.deepEqual(skillBoxes(13, STRETCH, LAST_ROW, 150), rowsOf(13, 30, 2, columns));
  assert.deepEqual(totalBox(13, STRETCH, LAST_ROW, 150), { x: 0, y: 213, width: 150, height: 47 });

  assert.deepEqual(skillBoxes(15, STRETCH, LAST_ROW, 150), rowsOf(15, 32, 2, columns));
  assert.deepEqual(totalBox(15, STRETCH, LAST_ROW, 150), { x: 75, y: 225, width: 74, height: 34 });

  assert.deepEqual(skillBoxes(15, REFLOW, LAST_ROW, 150), rowsOf(15, 32, 2));
});

test('stretch on a wider panel: still three columns, never four, each box wider; reflow keeps three standard columns', () => {
  const columns = [{ x: 1, width: 82 }, { x: 84, width: 82 }, { x: 167, width: 82 }];
  assert.deepEqual(skillBoxes(24, STRETCH, LAST_ROW, 250), rowsOf(24, 30, 2, columns));
  assert.deepEqual(totalBox(24, STRETCH, LAST_ROW, 250), { x: 0, y: 241, width: 250, height: 19 });
  assert.deepEqual(skillBoxes(23, STRETCH, LAST_ROW, 250), rowsOf(23, 32, 2, columns));
  assert.deepEqual(totalBox(23, STRETCH, LAST_ROW, 250), { x: 167, y: 225, width: 82, height: 34 });
  assert.equal(new Set(skillBoxes(24, STRETCH, LAST_ROW, 400).map((box) => box.x)).size, 3);

  assert.deepEqual(skillBoxes(23, REFLOW, LAST_ROW, 250), rowsOf(23, 32, 2));
  assert.deepEqual(totalBox(23, REFLOW, LAST_ROW, 250), { x: 127, y: 225, width: 122, height: 34 });
});

test('64 skills at most: a box past the count, or past 64, is none', () => {
  assert.deepEqual(skillBox(63, 64, REFLOW, LAST_ROW), { x: 1, y: 631, width: 56, height: 32 });
  assert.deepEqual(skillBox(64, 70, REFLOW, LAST_ROW), NONE);
  assert.deepEqual(totalBox(70, REFLOW, LAST_ROW), totalBox(64, REFLOW, LAST_ROW));
  assert.deepEqual(skillBox(23, 23, REFLOW, LAST_ROW), NONE);
  assert.deepEqual(skillBox(-1, 23, REFLOW, LAST_ROW), NONE);
});
