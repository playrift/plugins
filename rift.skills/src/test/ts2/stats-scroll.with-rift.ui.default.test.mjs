import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-with/rift.ui.default';

const REFLOW = 0;
const STRETCH = 1;
const LAST_ROW = 0;
const OWN_ROW = 1;

const PANEL_WIDTH = 190;
const PANEL_HEIGHT = 261;

const ui = await loadTs2Build(BUILD);

function scroll(count, layout, placement, height = PANEL_HEIGHT) {
  const settings = [count, PANEL_WIDTH, height, layout, placement];
  return {
    area: ui.call('stats.stats-layout.scrollAreaHeight', ...settings),
    extent: ui.call('stats.stats-layout.scrollExtent', ...settings),
  };
}

function skillBox(index, count, layout, placement) {
  const settings = [index, count, PANEL_WIDTH, PANEL_HEIGHT, layout, placement];
  return {
    y: ui.call('stats.stats-layout.skillBoxY', ...settings),
    height: ui.call('stats.stats-layout.skillBoxHeight', ...settings),
  };
}

function totalY(count, layout, placement) {
  return ui.call('stats.stats-layout.totalBoxY', count, PANEL_WIDTH, PANEL_HEIGHT, layout, placement);
}

test('rows that fit the panel do not scroll: 24 skills in every setting, and a handful', () => {
  for (const layout of [REFLOW, STRETCH]) {
    for (const placement of [LAST_ROW, OWN_ROW]) {
      for (const count of [0, 1, 5, 23, 24]) {
        assert.equal(scroll(count, layout, placement).extent, 0, `${count} skills, layout ${layout}, placement ${placement}`);
      }
    }
  }
});

test('more than 8 rows, in the last row as on its own row: Total level stays pinned to the bottom and only the skills above it scroll', () => {
  for (const placement of [LAST_ROW, OWN_ROW]) {
    assert.deepEqual(scroll(30, REFLOW, placement), { area: 243, extent: 303 }, `placement ${placement}`);
    assert.equal(totalY(30, REFLOW, placement), 241, `placement ${placement}`);
    assert.deepEqual(scroll(28, REFLOW, placement), { area: 243, extent: 303 }, `placement ${placement}`);
  }
});

test('a taller panel fits more rows: 30 skills on a 400 high panel do not scroll, Total level in the space under one row fewer than fits', () => {
  assert.deepEqual(scroll(30, REFLOW, OWN_ROW, 400), { area: 335, extent: 0 });
});

test('stretch never shrinks a box below the standard size: when the rows do not fit, it scrolls as reflow does', () => {
  for (const placement of [LAST_ROW, OWN_ROW]) {
    assert.deepEqual(scroll(30, STRETCH, placement), scroll(30, REFLOW, placement), `placement ${placement}`);
    for (let index = 0; index < 30; index += 1) {
      assert.deepEqual(skillBox(index, 30, STRETCH, placement), skillBox(index, 30, REFLOW, placement), `box ${index}, placement ${placement}`);
    }
  }
  assert.deepEqual(skillBox(29, 30, STRETCH, OWN_ROW), { y: 271, height: 32 });
});

test('64 skills scroll in every setting', () => {
  assert.deepEqual(scroll(64, REFLOW, LAST_ROW), { area: 243, extent: 663 });
  assert.deepEqual(scroll(64, STRETCH, OWN_ROW), { area: 243, extent: 663 });
});
