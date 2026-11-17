import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';

const MAIN = 0;
const MAIN_NAME = 'Main';
const CAVE = 1;
const CAVE_NAME = 'Cave';
const MAP_NAMES = new Map([[MAIN, MAIN_NAME], [CAVE, CAVE_NAME]]);

const FIRST_END = 1;
const OTHER_END = 2;
const BOTH_ENDS = 3;

const END_SIZE = 6;
const SLOTS = 50;
const CLIENT_TRUE = 1;
const CLIENT_FALSE = 0;

const SCROLL_MAP = 'Scroll map';
const LINKS_TOGGLE = 'Intra-map links';
const LINKS_HOST = 'worldmap_links';
const MAP_LIST_NAME = 'worldmap_map_list_name';

const coord = (x, z, level = 0) => ((level << 28) | (x << 14) | z) >>> 0;
const xOf = (at) => (at >>> 14) & 0x3fff;
const zOf = (at) => at & 0x3fff;

const STAIRS_BOTTOM = 0x03214c8a;
const STAIRS_TOP = 0x13214c8a;
const ENTRANCE = 0x03278ca8;
const CAVE_OPENS_AT = 0x070b1909;

const STAIRS = { from: STAIRS_BOTTOM, to: STAIRS_TOP, fromMap: MAIN, toMap: MAIN, ends: BOTH_ENDS };
const CAVE_ENTRANCE = { from: ENTRANCE, to: CAVE_OPENS_AT, fromMap: MAIN, toMap: CAVE, ends: FIRST_END };
const FORGE_VECTOR = [STAIRS, CAVE_ENTRANCE];

const BRIDGE_WEST = coord(3200, 3200);
const BRIDGE_EAST = coord(3240, 3200);
const BRIDGE = { from: BRIDGE_WEST, to: BRIDGE_EAST, fromMap: MAIN, toMap: MAIN, ends: BOTH_ENDS };

function linkEnums(links) {
  return {
    'game:worldmap_link_from': { type: 'coord', values: links.map((link) => link.from) },
    'game:worldmap_link_to': { type: 'coord', values: links.map((link) => link.to) },
    'game:worldmap_link_from_map': links.map((link) => link.fromMap),
    'game:worldmap_link_to_map': links.map((link) => link.toMap),
    'game:worldmap_link_ends': links.map((link) => link.ends),
  };
}

async function worldMap({ links = [], currentMap = MAIN, viewAt = BRIDGE_WEST } = {}) {
  const engine = { currentMap, mapsSet: [], jumps: [], view: { x: xOf(viewAt), z: zOf(viewAt), width: 0, height: 0 } };
  const ui = await loadTs2Build(BUILD, {
    enums: {
      'game:worldmap_list': [MAIN, CAVE],
      'game:worldmap_links': { key: 'coord', type: 'coord', entries: [] },
      ...linkEnums(links),
    },
    builtins: {
      worldmap_loaded_is: () => CLIENT_TRUE,
      worldmap_current_map_get: () => engine.currentMap,
      worldmap_map_set: (map) => {
        engine.currentMap = map;
        engine.mapsSet.push(map);
      },
      worldmap_map_name_get: (map) => MAP_NAMES.get(map) ?? '',
      worldmap_coordinmap: () => CLIENT_FALSE,
      worldmap_jumptosourcecoord: (at) => {
        engine.jumps.push(at >>> 0);
      },
      worldmap_display_coord_get: (at) => [xOf(at), zOf(at)],
      worldmap_display_position_get: () => [engine.view.x, engine.view.z],
      worldmap_size_get: () => [engine.view.width, engine.view.height],
    },
  });
  ui.open('worldmap');
  ui.cycles(2);

  const host = ui.component('worldmap', LINKS_HOST).bounds;
  engine.view.width = host.width;
  engine.view.height = host.height;
  ui.cycles(2);

  engine.mapsSet = [];
  engine.currentMap = currentMap;
  ui.cycles(2);
  return { ui, engine };
}

const shownChildren = (ui) => ui.component('worldmap', LINKS_HOST).children.filter((child) => !child.hidden);

const endsShown = (ui) => shownChildren(ui).filter((child) => child.options.includes(SCROLL_MAP));

const squaresShown = (ui) => shownChildren(ui).filter((child) => child.options.length === 0
  && child.bounds.width === END_SIZE && child.bounds.height === END_SIZE);

const linesShown = (ui) => shownChildren(ui).filter((child) => child.bounds.width > END_SIZE || child.bounds.height > END_SIZE);

const centreOf = (bounds) => ({ x: bounds.x + (bounds.width >> 1), y: bounds.y + (bounds.height >> 1) });

function hover(ui, end) {
  ui.find('worldmap', { text: 'Key' }).dragTo(end);
  ui.cycles(2);
}

function scrollMap(ui, end) {
  end.option(1);
  ui.cycles(2);
}

test('Forge\'s two links draw three ends on the main map: the stairs\' both, the entrance\'s first', async () => {
  const { ui } = await worldMap({ links: FORGE_VECTOR, viewAt: STAIRS_BOTTOM });

  assert.equal(endsShown(ui).length, 3);
});

test('the entrance draws no end on the cave map, its other end not being drawn', async () => {
  const { ui } = await worldMap({ links: FORGE_VECTOR, currentMap: CAVE, viewAt: CAVE_OPENS_AT });

  assert.equal(endsShown(ui).length, 0);
});

test('a link to another map drawn both ways draws its other end on that map alone', async () => {
  const both = { ...CAVE_ENTRANCE, ends: BOTH_ENDS };

  const onMain = await worldMap({ links: [both], viewAt: ENTRANCE });
  const onCave = await worldMap({ links: [both], currentMap: CAVE, viewAt: CAVE_OPENS_AT });

  assert.equal(endsShown(onMain.ui).length, 1);
  assert.equal(endsShown(onCave.ui).length, 1);
});

test('a link drawn at its other end alone draws that end and not the first', async () => {
  const { ui } = await worldMap({ links: [{ ...BRIDGE, ends: OTHER_END }], viewAt: BRIDGE_EAST });

  const ends = endsShown(ui);
  const host = ui.component('worldmap', LINKS_HOST).bounds;

  assert.equal(ends.length, 1);
  assert.deepEqual(centreOf(ends[0].bounds), centreOf(host));
});

test('an end is a 6x6 square centred on its tile\'s corner, over a 6x6 square a pixel right and down', async () => {
  const { ui } = await worldMap({ links: [{ ...BRIDGE, ends: FIRST_END }], viewAt: BRIDGE_WEST });

  const host = ui.component('worldmap', LINKS_HOST).bounds;
  const [end] = endsShown(ui);
  const [square] = squaresShown(ui);

  assert.equal(end.bounds.width, END_SIZE);
  assert.equal(end.bounds.height, END_SIZE);
  assert.deepEqual(centreOf(end.bounds), centreOf(host));
  assert.deepEqual(centreOf(square.bounds), { x: centreOf(host).x + 1, y: centreOf(host).y + 1 });
});

test('an end stands where its tile is drawn, away from the middle of the view', async () => {
  const { ui } = await worldMap({ links: [{ ...BRIDGE, ends: OTHER_END }], viewAt: BRIDGE_WEST });

  const host = ui.component('worldmap', LINKS_HOST).bounds;
  const [end] = endsShown(ui);

  assert.deepEqual(centreOf(end.bounds), { x: centreOf(host).x + xOf(BRIDGE_EAST) - xOf(BRIDGE_WEST), y: centreOf(host).y });
});

test('the line between a link\'s ends shows only while an end is hovered', async () => {
  const { ui } = await worldMap({ links: [BRIDGE], viewAt: BRIDGE_WEST });

  assert.equal(linesShown(ui).length, 0);

  const [west] = endsShown(ui);
  hover(ui, west);

  const lines = linesShown(ui);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].bounds.width, xOf(BRIDGE_EAST) - xOf(BRIDGE_WEST));

  hover(ui, ui.component('worldmap', MAP_LIST_NAME));

  assert.equal(linesShown(ui).length, 0);
});

test('a link to another map has no line, even while its end is hovered', async () => {
  const { ui } = await worldMap({ links: [CAVE_ENTRANCE], viewAt: ENTRANCE });

  const [entrance] = endsShown(ui);
  hover(ui, entrance);

  assert.equal(linesShown(ui).length, 0);
});

test('Scroll map on an end jumps to the link\'s other end on the same map', async () => {
  const { ui, engine } = await worldMap({ links: [BRIDGE], viewAt: BRIDGE_WEST });

  const [west, east] = endsShown(ui).sort((one, other) => one.bounds.x - other.bounds.x);
  scrollMap(ui, west);
  scrollMap(ui, east);

  assert.deepEqual(engine.mapsSet, []);
  assert.deepEqual(engine.jumps, [BRIDGE_EAST, BRIDGE_WEST]);
});

test('Scroll map on the entrance switches to the cave map and jumps to where it opens', async () => {
  const { ui, engine } = await worldMap({ links: FORGE_VECTOR, viewAt: ENTRANCE });

  const middle = centreOf(ui.component('worldmap', LINKS_HOST).bounds);
  const entrance = endsShown(ui).find((end) => centreOf(end.bounds).x === middle.x && centreOf(end.bounds).y === middle.y);
  scrollMap(ui, entrance);

  assert.deepEqual(engine.mapsSet, [CAVE]);
  assert.deepEqual(engine.jumps, [CAVE_OPENS_AT]);
  assert.equal(ui.component('worldmap', MAP_LIST_NAME).text, CAVE_NAME);
});

test('Scroll map on a link\'s other end, seen on the other map, switches back and jumps to the first', async () => {
  const { ui, engine } = await worldMap({ links: [{ ...CAVE_ENTRANCE, ends: BOTH_ENDS }], currentMap: CAVE, viewAt: CAVE_OPENS_AT });

  const [inside] = endsShown(ui);
  scrollMap(ui, inside);

  assert.deepEqual(engine.mapsSet, [MAIN]);
  assert.deepEqual(engine.jumps, [ENTRANCE]);
  assert.equal(ui.component('worldmap', MAP_LIST_NAME).text, MAIN_NAME);
});

test('turning Intra-map links off hides the ends', async () => {
  const { ui } = await worldMap({ links: [BRIDGE], viewAt: BRIDGE_WEST });

  ui.find('worldmap', { option: 'Disable' }).option(1);
  ui.cycles(2);

  const linksToggle = ui.find('worldmap', { option: 'Disable' });
  assert.equal(linksToggle.bounds.y, ui.find('worldmap', { text: LINKS_TOGGLE }).bounds.y);

  assert.equal(endsShown(ui).length, 2);

  linksToggle.option(1);
  ui.cycles(2);

  assert.equal(endsShown(ui).length, 0);
});

test('with no link the map draws no end', async () => {
  const { ui } = await worldMap({ links: [] });

  assert.equal(endsShown(ui).length, 0);
});

test(`the first ${SLOTS} links are drawn, and no more`, async () => {
  const many = Array.from({ length: SLOTS + 5 }, (_, index) => ({ ...BRIDGE, from: coord(3200 + index, 3200), ends: FIRST_END }));
  const { ui } = await worldMap({ links: many, viewAt: BRIDGE_WEST });

  assert.equal(endsShown(ui).length, SLOTS);
});
