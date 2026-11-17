import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';
const FRAME = 'toplevel_resizable';
const HELPER = 'toplevel_resizable_helper_dodger';
const LEFT = 0;
const CENTRE = 1;
const RIGHT = 2;
const NO_CORNER = -1;
const LAYOUT_CYCLES = 45;

async function helperAt(registered, options = {}) {
  const ui = await loadTs2Build(BUILD, options);
  ui.open(FRAME);
  ui.cycles(5);
  if (registered !== undefined) ui.call('lib.lib.overlay.registerCornerBox', ...registered);
  ui.cycles(LAYOUT_CYCLES);
  const { x, y } = ui.component(FRAME, HELPER).bounds;
  return { x, y };
}

test('the main build names no component of the XP drops\' interface', () => {
  const published = JSON.parse(readFileSync(`${BUILD}/component-dependencies.json`, 'utf8'));
  assert.equal(published.format, 'ts2-component-dependencies');
  assert.deepEqual(published.dependencies.filter((named) => named.interface === 'xp_drops'), []);
});

test('a box in the helper\'s own corner moves it 35 down and 2 in from the side (lines 560 and 565)', async () => {
  const alone = await helperAt();
  const dodging = await helperAt([0, LEFT, 35]);
  assert.deepEqual(dodging, { x: alone.x + 2, y: alone.y + 35 });
});

test('the box\'s step with the progress bar, 44, moves it 44 down (lines 560-562)', async () => {
  const alone = await helperAt();
  const dodging = await helperAt([0, LEFT, 44]);
  assert.deepEqual(dodging, { x: alone.x + 2, y: alone.y + 44 });
});

test('a box in another corner, or in none, moves it 2 down and 2 in (lines 584-586)', async () => {
  const alone = await helperAt();
  for (const corner of [CENTRE, RIGHT, NO_CORNER]) {
    assert.deepEqual(await helperAt([0, corner, 35]), { x: alone.x + 2, y: alone.y + 2 }, `corner ${corner}`);
  }
});

test('on a view too short for it, the helper on the right stacks below a box in the right corner (lines 568-580)', async () => {
  const short = { width: 765, height: 200 };
  const besideCentre = await helperAt([0, CENTRE, 35], short);
  const belowRight = await helperAt([0, RIGHT, 35], short);
  assert.deepEqual(belowRight, { x: besideCentre.x, y: besideCentre.y + 35 });
  const belowRightWithBar = await helperAt([0, RIGHT, 44], short);
  assert.deepEqual(belowRightWithBar, { x: besideCentre.x, y: besideCentre.y + 44 });
});
