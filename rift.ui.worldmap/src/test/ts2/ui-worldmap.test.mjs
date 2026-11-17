import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';

const MAIN = 0;
const MAIN_NAME = 'Main';
const ARENA = 4;
const ARENA_NAME = 'Arena';
const MAP_NAMES = new Map([[MAIN, MAIN_NAME], [ARENA, ARENA_NAME]]);
const NO_MAP = -1;
const OPEN_MAP_LIST = 'worldmap.worldmap.helpers.openMapList';
const ICON_FIRST_OPTION = 'worldmap_element_op1';

const tile = (x, z) => (x << 14) | z;
const planeOf = (at) => at >>> 28;
const asClientBoolean = (yes) => (yes ? 1 : 0);
const LINKED_ICON = tile(3200, 3200);
const ARENA_OPENS_AT = tile(1600, 1600);
const UNLINKED_ICON = tile(3210, 3210);

async function worldMap({ maps = [MAIN], links = [], currentMap = NO_MAP, icon = UNLINKED_ICON } = {}) {
  const engine = { currentMap, mapsSet: [], jumps: [], soundsPlayed: [] };
  const ui = await loadTs2Build(BUILD, {
    enums: {
      'game:worldmap_list': maps,
      'game:worldmap_links': { key: 'coord', type: 'coord', entries: links },
    },
    builtins: {
      worldmap_loaded_is: () => true,
      worldmap_current_map_get: () => engine.currentMap,
      worldmap_map_set: (map) => {
        engine.currentMap = map;
        engine.mapsSet.push(map);
      },
      worldmap_map_name_get: (map) => MAP_NAMES.get(map) ?? '',
      worldmap_coordinmap: (map, at) => asClientBoolean(map === ARENA ? at === ARENA_OPENS_AT : planeOf(at) === 0 && at !== ARENA_OPENS_AT),
      worldmap_jumptosourcecoord: (at) => {
        engine.jumps.push(at);
      },
      worldmap_iconcoord: () => icon,
      sound_effect: (sound) => {
        engine.soundsPlayed.push(sound);
      },
    },
  });
  ui.open('worldmap');
  ui.cycles(2);
  return { ui, engine };
}

function openTheMapList(ui) {
  ui.call(OPEN_MAP_LIST);
  ui.cycles(2);
}

test('the world map builds and opens', async () => {
  const { ui } = await worldMap();

  assert.ok(ui.texts('worldmap').includes('Key'));
});

test('the world map opens on the first listed map', async () => {
  const { engine } = await worldMap({ maps: [MAIN, ARENA] });

  assert.deepEqual(engine.mapsSet, [MAIN]);
  assert.equal(engine.currentMap, MAIN);
});

test('the map list button names the first listed map, and its list offers the listed maps, first listed on top', async () => {
  const { ui } = await worldMap({ maps: [MAIN, ARENA] });

  assert.equal(ui.component('worldmap', 'worldmap_map_list_name').text, MAIN_NAME);
  assert.deepEqual(ui.component('worldmap', 'worldmap_map_list_button').options, []);

  openTheMapList(ui);

  const main = ui.find('worldmap', { text: MAIN_NAME, option: 'Select' });
  const arena = ui.find('worldmap', { text: ARENA_NAME, option: 'Select' });
  assert.ok(main.bounds.y < arena.bounds.y);
  assert.throws(() => ui.find('worldmap', { text: '', option: 'Select' }));
});

test('choosing a map from the list switches to it', async () => {
  const { ui, engine } = await worldMap({ maps: [MAIN, ARENA] });

  openTheMapList(ui);
  ui.find('worldmap', { text: ARENA_NAME, option: 'Select' }).option(1);
  ui.cycles(2);

  assert.deepEqual(engine.mapsSet, [MAIN, ARENA]);
  assert.equal(ui.component('worldmap', 'worldmap_map_list_name').text, ARENA_NAME);
});

test('with no map listed the world map opens on the client\'s own map, and its list offers nothing', async () => {
  const { ui, engine } = await worldMap({ maps: [], currentMap: ARENA });

  assert.ok(ui.texts('worldmap').includes('Key'));
  assert.deepEqual(engine.mapsSet, []);
  assert.equal(ui.component('worldmap', 'worldmap_map_list_name').text, ARENA_NAME);

  openTheMapList(ui);

  assert.throws(() => ui.find('worldmap', { option: 'Select' }));
});

test('with no map listed and none known to the client the world map still opens', async () => {
  const { ui, engine } = await worldMap({ maps: [] });

  assert.ok(ui.texts('worldmap').includes('Key'));
  assert.deepEqual(engine.mapsSet, []);
});

test('an icon on a link jumps to the link\'s target, switching to the map that holds it', async () => {
  const { ui, engine } = await worldMap({ maps: [MAIN, ARENA], links: [[LINKED_ICON, ARENA_OPENS_AT]], icon: LINKED_ICON });

  ui.call(ICON_FIRST_OPTION);
  ui.cycles(2);

  assert.deepEqual(engine.mapsSet, [MAIN, ARENA]);
  assert.deepEqual(engine.jumps, [ARENA_OPENS_AT]);
  assert.equal(ui.component('worldmap', 'worldmap_map_list_name').text, ARENA_NAME);
});

test('an icon on no link does nothing', async () => {
  const { ui, engine } = await worldMap({ maps: [MAIN, ARENA], links: [[LINKED_ICON, ARENA_OPENS_AT]], icon: UNLINKED_ICON });
  const soundsBefore = engine.soundsPlayed.length;

  ui.call(ICON_FIRST_OPTION);
  ui.cycles(2);

  assert.deepEqual(engine.mapsSet, [MAIN]);
  assert.deepEqual(engine.jumps, []);
  assert.equal(engine.soundsPlayed.length, soundsBefore);
});

test('the key lists the base map icon categories under their four headings', async () => {
  const { ui } = await worldMap();
  const texts = ui.texts('worldmap');

  for (const heading of ['Game features', 'Tutors', 'Training', 'Shopping']) assert.ok(texts.includes(heading), heading);
  for (const category of ['Bank', 'Altar', 'General store', 'Wine trader']) assert.ok(texts.includes(category), category);
  assert.deepEqual(ui.find('worldmap', { text: 'Bank' }).options, []);
  assert.ok(ui.find('worldmap', { option: 'Flash icons' }));
});

test('the key\'s toggles list their five captions', async () => {
  const { ui } = await worldMap();
  const texts = ui.texts('worldmap');

  for (const caption of ['\'You are here\'', 'Intra-map links', 'Map labels', 'Icon tooltips', 'Effects']) assert.ok(texts.includes(caption), caption);
});

test('the close button offers Close, and sends it to the server', async () => {
  const { ui } = await worldMap();
  const close = ui.component('worldmap', 'worldmap_close');

  assert.deepEqual(close.options, ['Close']);

  close.option(1);

  assert.deepEqual(ui.calls('if_button').map((call) => call.args), ['"worldmap_close", 1']);
});

test('the close button clicks as it closes', async () => {
  const { ui, engine } = await worldMap();
  const soundsBefore = engine.soundsPlayed.length;

  ui.component('worldmap', 'worldmap_close').option(1);

  assert.equal(engine.soundsPlayed.length, soundsBefore + 1);
  assert.deepEqual(ui.calls('if_button').map((call) => call.args), ['"worldmap_close", 1']);
});
