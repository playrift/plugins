import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';
const TRACK_2 = 1;
const TRACK_3 = 2;

async function tab(states = {}) {
  const ui = await loadTs2Build(BUILD);
  ui.open('music');
  for (const [key, value] of Object.entries(states)) ui.state(`rift.music:${key}`, value);
  ui.cycles(5);
  return ui;
}

function offers(ui, option) {
  try {
    return !ui.find('music', { option }).hidden;
  } catch {
    return false;
  }
}

test('the tab lists every track of the music list, counts what is unlocked, and shows all music', async () => {
  const ui = await tab({ current_track: -1 });
  const texts = ui.texts('music');

  assert.ok(['Track 1', 'Track 2', 'Track 3'].every((title) => texts.includes(title)), `the three tracks: ${texts}`);
  assert.ok(texts.includes('Unlocked: 0 / 3'), `the count: ${texts}`);
  assert.ok(texts.includes('All music'), `the dropdown names what is shown: ${texts}`);
});

test('a row offers Play and each playlist\'s add, and no unlock hint the game has not given', async () => {
  const ui = await tab();
  const row = ui.find('music', { text: 'Track 2' });

  assert.deepEqual(row.options.slice(0, 5), ['Play', '', 'Add to playlist 1', 'Add to playlist 2', 'Add to playlist 3']);
});

test('Area is the mode in use: it offers nothing, Shuffle and Single offer themselves, Skip Track is off', async () => {
  const ui = await tab({ mode: 0 });

  assert.ok(!offers(ui, 'Area Mode') && offers(ui, 'Shuffle Mode') && offers(ui, 'Single Mode') && !offers(ui, 'Skip Track'));
});

test('in Shuffle, Skip Track offers itself and Shuffle does not', async () => {
  const ui = await tab({ mode: 1 });

  assert.ok(offers(ui, 'Area Mode') && !offers(ui, 'Shuffle Mode') && offers(ui, 'Single Mode') && offers(ui, 'Skip Track'));
});

test('in Single, Area and Shuffle offer themselves, Single does not, and Skip Track is off', async () => {
  const ui = await tab({ mode: 2 });

  assert.ok(offers(ui, 'Area Mode') && offers(ui, 'Shuffle Mode') && !offers(ui, 'Single Mode') && !offers(ui, 'Skip Track'));
});

test('with a playlist chosen, the list is that playlist, its rows offer their removal, and the dropdown names it', async () => {
  const ui = await tab({ playlist_1: [TRACK_2], shown_playlist: 1, current_track: -1 });
  const texts = ui.texts('music');

  assert.ok(texts.includes('Track 2') && !texts.includes('Track 1') && !texts.includes('Track 3'), `playlist 1 alone: ${texts}`);
  assert.equal(ui.find('music', { text: 'Track 2' }).options[2], 'Remove from playlist 1');
  assert.ok(texts.includes('Playlist 1'), `the dropdown names it: ${texts}`);
});

test('the playing track is named above the list with its options, and nothing is while nothing plays', async () => {
  const playing = await tab({ current_track: TRACK_3 });
  const name = playing.component('music', 'music_playing_track');

  assert.equal(name.text, 'Track 3');
  assert.deepEqual(name.options.slice(0, 5), ['', '', 'Add to playlist 1', 'Add to playlist 2', 'Add to playlist 3']);

  playing.state('rift.music:current_track', -1);
  playing.cycles(3);
  assert.equal(name.text.trim(), '', 'nothing plays: no name');
  assert.ok(playing.component('music', 'music_playing_track').options.every((option) => option === ''), 'and no options left over');
});

test('the dropdown opens on Expand to its four entries, and an entry clicked closes it', async () => {
  const ui = await tab();
  assert.ok(!offers(ui, 'Select'), 'shut until expanded');

  ui.find('music', { option: 'Expand' }).option(1);
  ui.cycles(2);
  const texts = ui.texts('music');
  assert.ok(offers(ui, 'Select') && ['Playlist 1', 'Playlist 2', 'Playlist 3'].every((text) => texts.includes(text)), `open, its entries offering Select: ${texts}`);

  ui.find('music', { option: 'Select' }).option(1);
  ui.cycles(2);
  assert.ok(!offers(ui, 'Select'), 'an entry clicked closes it');
});
