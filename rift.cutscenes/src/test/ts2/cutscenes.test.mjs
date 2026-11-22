import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';
const CLEAR = 255;
const BLACK = 0;

async function fadeScreen(states = {}) {
  const ui = await loadTs2Build(BUILD);
  ui.open('cutscene_frame');
  for (const [key, value] of Object.entries(states)) ui.state(`rift.cutscenes:${key}`, value);
  ui.cycles(5);
  return ui;
}

function plate(ui) {
  return ui.component('cutscene_frame', 'cutscene_frame_plate');
}

test('the screen opens clear', async () => {
  const ui = await fadeScreen({ fade: 0, fade_cycles: 50 });

  assert.equal(plate(ui).transparency, CLEAR);
});

test('a fade out darkens the screen over its cycles, then holds black', async () => {
  const ui = await fadeScreen({ fade: 0, fade_cycles: 50 });

  ui.state('rift.cutscenes:fade', 1);
  ui.cycles(25);
  const halfway = plate(ui).transparency;
  assert.ok(halfway > 64 && halfway < 192, `about half way after half its cycles: ${halfway}`);

  ui.cycles(40);
  assert.equal(plate(ui).transparency, BLACK);

  ui.cycles(100);
  assert.equal(plate(ui).transparency, BLACK, 'it holds black until faded in');
});

test('a fade in clears the screen again', async () => {
  const ui = await fadeScreen({ fade: 1, fade_cycles: 10 });
  ui.cycles(20);
  assert.equal(plate(ui).transparency, BLACK);

  ui.state('rift.cutscenes:fade', 0);
  ui.cycles(20);
  assert.equal(plate(ui).transparency, CLEAR);
});

test('no cycles is a cut to black', async () => {
  const ui = await fadeScreen({ fade: 0, fade_cycles: 0 });

  ui.state('rift.cutscenes:fade', 1);
  ui.cycles(2);
  assert.equal(plate(ui).transparency, BLACK);
});

test('the fade covers the whole screen, at any size', async () => {
  const ui = await fadeScreen();

  for (const [width, height] of [[765, 503], [1920, 1080]]) {
    ui.resize(width, height);
    ui.cycles(2);
    assert.deepEqual(plate(ui).bounds, { x: 0, y: 0, width, height });
  }
});

test('the frame turns the client sidebar solid black, and back to its own look', async () => {
  const ui = await loadTs2Build(BUILD);

  ui.call('rift-cutscenes.sidebar.setSidebarBackground', 0x000000);
  ui.call('rift-cutscenes.sidebar.setSidebarBackground', -1);

  assert.deepEqual(ui.calls('sidebar_set_background').map((call) => call.args), ['0', '-1']);
});
