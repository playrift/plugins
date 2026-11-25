import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SERVER_REACHING_OPS } from '@playrift/ts2-compiler';
import { loadTs2Build } from '@playrift/ts2-test-kit';

const BUILD = 'build/ts2-api';
const SOURCE = 'ui';
const FRAME = 'toplevel_resizable';

async function frame(panels, options = {}) {
  const ui = await loadTs2Build(BUILD, options);
  ui.open(FRAME);
  for (const [slot, panel] of Object.entries(panels)) ui.open(FRAME, `${FRAME}_${slot}`, panel);
  ui.cycles(10);
  return ui;
}

function files(dir, at = '') {
  return readdirSync(join(dir, at)).flatMap((name) => {
    const path = join(at, name);
    return statSync(join(dir, path)).isDirectory() ? files(dir, path) : [path];
  });
}

test('the split-private pane shows "System update in: m:ss" while the reboot timer runs, and nothing before', async () => {
  const ui = await frame({ chat_container: 'chatbox', pm_container: 'pm_chat' });
  assert.deepEqual(ui.texts('pm_chat'), []);
  ui.session.rebootTimer = 3000;
  ui.cycles(60);
  assert.deepEqual(ui.texts('pm_chat'), ['System update in: 1:00']);
});

test('a title shows no world number on world 0 (Forge\'s Play), and the number on any other', async () => {
  const ui = await loadTs2Build(BUILD, { session: { world: 0 } });
  assert.equal(ui.call('lib.lib.world.titleWithWorld', 'Ignore List', ' - World '), 'Ignore List');
  ui.session.world = 302;
  assert.equal(ui.call('lib.lib.world.titleWithWorld', 'Ignore List', ' - World '), 'Ignore List - World 302');

  for (const [world, header] of [[0, 'Friends List'], [302, 'Friends List - World 302']]) {
    const panel = await frame({ side9: 'friends' }, { session: { world } });
    assert.equal(panel.texts('friends')[0], header, `the friends panel's header on world ${world}`);
  }
});

test('no tooltip is up at login, so the first hover can raise one', async () => {
  const ui = await loadTs2Build(BUILD);
  assert.ok(ui.call('lib.tooltip.component.tooltipDown'));
});

test('the chatbox shows every new line, however far its history has grown past the pane', async () => {
  const ui = await frame({ chat_container: 'chatbox' });
  for (let line = 1; line <= 15; line++) {
    ui.chat(0, '', `game line ${line}`);
    ui.cycles(3);
  }
  const shown = ui.texts('chatbox').filter((text) => text.startsWith('game line'));
  assert.equal(shown.length, 15);
  assert.equal(shown[0], 'game line 15', 'the newest line first');
});

test('a panel opened again over its last run shows itself once (a mount clears its host first)', async () => {
  const ui = await frame({});
  for (const [slot, panel] of [['side9', 'friends'], ['side10', 'logout']]) {
    ui.open(FRAME, `${FRAME}_${slot}`, panel);
    ui.cycles(10);
    const once = ui.texts(panel);
    ui.open(FRAME, `${FRAME}_${slot}`, panel);
    ui.cycles(10);
    assert.deepEqual(ui.texts(panel), once, panel);
  }
});

test('the ignore list: "Loading" until the list arrives, then its rows; a row\'s Delete removes that name', async () => {
  let count = -1;
  const ui = await loadTs2Build(BUILD, { builtins: { ignore_count: () => count, ignore_name_get: () => ['Bob', ''] } });
  ui.state('rift.engine:has_display_name', true);
  ui.open('ignore');
  ui.cycles(10);
  assert.ok(ui.texts('ignore').includes('Loading ignore list<br>Please wait...'));
  count = 1;
  ui.transmit('friend');
  ui.cycles(5);
  assert.ok(ui.texts('ignore').includes('Bob'));
  assert.ok(!ui.texts('ignore').some((text) => text.startsWith('Loading')));
  ui.find('ignore', { text: 'Bob', option: 'Delete' }).option(1);
  assert.deepEqual(ui.calls('ignore_del'), [{ builtin: 'ignore_del', args: '"Bob"' }]);
});

test('the friends and ignore panels swap through the server: each toggle is a component whose one option it answers', async () => {
  const ui = await frame({ side9: 'friends' });
  assert.equal(ui.component('friends', 'friends_ignore').options[0], 'View Ignore List');
  ui.open(FRAME, `${FRAME}_side9`, 'ignore');
  ui.cycles(5);
  assert.equal(ui.component('ignore', 'ignore_friends').options[0], 'View Friends List');
});

test('a friend online on a world with no number (65535) shows "Online" and offers no world switch; another world hops', async () => {
  const friends = [['Ann', 302], ['Bob', 65535], ['Cy', 0]];
  const ui = await frame({}, {
    builtins: { friend_count: () => friends.length, friend_name_get: (i) => [friends[i][0], ''], friend_world_get: (i) => friends[i][1] },
  });
  ui.state('rift.engine:has_display_name', true);
  ui.open(FRAME, `${FRAME}_side9`, 'friends');
  ui.cycles(10);
  const shown = ui.texts('friends');
  assert.equal(shown[shown.indexOf('Ann') + 1], '<col=ffff00>World 302');
  assert.equal(shown[shown.indexOf('Bob') + 1], 'Online');
  assert.equal(shown[shown.indexOf('Cy') + 1], 'Offline');
  assert.ok(!ui.find('friends', { text: 'Bob' }).options.includes('Switch world'));
  const ann = ui.find('friends', { text: 'Ann' });
  ann.option(ann.options.indexOf('Switch world') + 1);
  assert.deepEqual(ui.calls('world_hop'), [{ builtin: 'world_hop', args: '302' }]);
});

test('classic\'s popout slot is a slot: the frame opens with it empty, and a panel docked there shows', async () => {
  const ui = await loadTs2Build(BUILD);
  ui.open('toplevel_classic');
  ui.cycles(10);
  ui.open('toplevel_classic', 'toplevel_classic_popout', 'logout');
  ui.cycles(10);
  assert.ok(ui.texts('logout').length > 0);
});

test('the source reads the client\'s type in lib/lib.client.ts2 alone (one client type: the gates waiting on work)', () => {
  const readers = files(SOURCE).filter((file) => file.endsWith('.ts2') && readFileSync(join(SOURCE, file), 'utf8').includes('clienttype('));
  assert.deepEqual(readers, ['lib/lib.client.ts2']);
});

test('nothing that reaches a player points at the original game\'s sites, or offers "Crown Info"', () => {
  const sites = ['osrs.game', 'runescape.com', 'jagex.network', 'jagex.com'];
  const shipped = [...files(BUILD).map((file) => join(BUILD, file)), ...files('src/main/resources').map((file) => join('src/main/resources', file))];
  const pointing = shipped.filter((file) => { const text = readFileSync(file, 'utf8'); return sites.some((site) => text.includes(site)) || text.includes('Crown Info'); });
  assert.deepEqual(pointing, []);
});

test('every frame names its friends slot at its own side 9 (the Friends List tab\'s panel)', () => {
  for (const [name, root] of [['resizable', 'toplevel_resizable'], ['classic', 'toplevel_classic'], ['mobile', 'toplevel_mobile']]) {
    const toml = readFileSync(`src/main/resources/META-INF/rift/toplevels/${name}.toml`, 'utf8');
    assert.ok(toml.includes(`"tab.friends" = "${root}_side9"`), name);
  }
});

const plain = (text) => text.replace(/<[^>]*>/g, '');

async function chatbox(builtins = {}) {
  const ui = await frame({ chat_container: 'chatbox' }, { builtins });
  ui.state('rift.engine:has_display_name', true);
  return ui;
}

function say(ui, line) {
  for (const char of line) ui.call('chatbox.chatdefault-onkey.chatDefaultOnKey', 0, char.charCodeAt(0));
  ui.call('chatbox.chatdefault-onkey.chatDefaultOnKey', ENTER, 0);
}
const ENTER = 84;

const IN_FRIENDS_CHAT = { friendschat_chat_count_get: () => 2, friendschat_chat_rank_get: () => 7, friendschat_chat_min_kick_get: () => 0 };

test('a friends chat line reads "[Channel] Name: text", and the Channel tab\'s Off hides it', async () => {
  const ui = await chatbox(IN_FRIENDS_CHAT);
  ui.chat(9, 'Bob', 'hello channel', 'Rift');
  ui.cycles(5);
  const shown = ui.texts('chatbox').map(plain);
  assert.equal(shown[shown.indexOf('hello channel') - 1], '[Rift] Bob:');
  ui.state('game:chat_filter_friendschat', 2);
  ui.cycles(5);
  assert.ok(!ui.texts('chatbox').map(plain).includes('hello channel'));
});

test('"/" and "/f " send to the friends chat channel (chat_sendpublic type 2); outside one, "/f " is said publicly', async () => {
  const ui = await chatbox(IN_FRIENDS_CHAT);
  say(ui, '/hi friends');
  say(ui, '/f hi again');
  assert.deepEqual(ui.calls('chat_sendpublic'), [
    { builtin: 'chat_sendpublic', args: '"/hi friends", 2' },
    { builtin: 'chat_sendpublic', args: '"/hi again", 2' },
  ]);
  const alone = await chatbox({ friendschat_chat_count_get: () => 0 });
  say(alone, '/f hello');
  assert.deepEqual(alone.calls('chat_sendpublic'), [{ builtin: 'chat_sendpublic', args: '"hello", 0' }]);
});

test('a friends chat line offers Kick to a member ranked to kick, and Kick asks the channel to kick that name', async () => {
  const ui = await chatbox(IN_FRIENDS_CHAT);
  ui.chat(9, 'Bob', 'hello channel', 'Rift');
  ui.cycles(5);
  const row = ui.find('chatbox', { option: 'Kick' });
  row.option(row.options.indexOf('Kick') + 1);
  assert.deepEqual(ui.calls('friendschat_kickuser'), [{ builtin: 'friendschat_kickuser', args: '"Bob"' }]);
});

test('the join prompt joins the friends chat channel typed into it', async () => {
  const ui = await chatbox();
  ui.call('chatbox.meslayer.meslayerOpen', JOIN_PROMPT);
  for (const char of 'Rift') ui.call('chatbox.meslayer.meslayerOnKey', 0, char.charCodeAt(0), '');
  ui.call('chatbox.meslayer.meslayerOnKey', ENTER, 0, '');
  assert.deepEqual(ui.calls('friendschat_joinchat'), [{ builtin: 'friendschat_joinchat', args: '"Rift"' }]);
});
const JOIN_PROMPT = 10;

test('a mode-21 string dialog keeps "jagex" in its answer, and still blanks "admin"', async () => {
  const ui = await chatbox();
  ui.call('chatbox.meslayer.meslayerOpen', FILTERED_STRING_DIALOG);
  for (const char of 'jagex admin') ui.call('chatbox.meslayer.meslayerOnKey', 0, char.charCodeAt(0), '');
  ui.call('chatbox.meslayer.meslayerOnKey', ENTER, 0, '');
  assert.deepEqual(ui.calls('stringdialog_resume'), [{ builtin: 'stringdialog_resume', args: '"jagex "' }]);
});
const FILTERED_STRING_DIALOG = 21;

async function chatboxOn(frame, phone) {
  const keyboard = [];
  const builtins = {
    on_mobile: () => phone,
    mobile_keyboardshowstring: (typed, limit) => keyboard.push(['show', typed, limit]),
    mobile_keyboardhide: () => keyboard.push(['hide']),
  };
  const ui = await loadTs2Build(BUILD, { builtins });
  ui.state('rift.engine:has_display_name', true);
  ui.open(frame);
  ui.open(frame, `${frame}_chat_container`, 'chatbox');
  ui.cycles(10);
  return { ui, keyboard };
}

function tap(component) {
  component.dragTo(component);
}

for (const frame of ['toplevel_mobile', 'toplevel_resizable']) {
  test(`on a phone in ${frame}, a tap on the chat input raises the keyboard with the line typed so far, and sending it drops the keyboard`, async () => {
    const { ui, keyboard } = await chatboxOn(frame, true);

    for (const char of 'hi') ui.call('chatbox.chatdefault-onkey.chatDefaultOnKey', 0, char.charCodeAt(0));
    const input = ui.component('chatbox', 'chatbox_open_input');
    assert.equal(input.hidden, false);

    tap(input);
    ui.cycles(1);
    assert.deepEqual(keyboard, [['show', 'hi', CHAT_LIMIT]]);

    ui.call('chatbox.chatdefault-onkey.chatDefaultOnKey', ENTER, 0);
    assert.deepEqual(keyboard, [['show', 'hi', CHAT_LIMIT], ['hide']]);
    assert.deepEqual(ui.calls('chat_sendpublic'), [{ builtin: 'chat_sendpublic', args: '"hi", 0' }]);
  });
}

test('on a phone, the first tap on the chat input after login raises the keyboard, and a tap while it is up drops it', async () => {
  const { ui, keyboard } = await chatboxOn('toplevel_mobile', true);
  const input = ui.component('chatbox', 'chatbox_open_input');

  tap(input);
  ui.cycles(1);
  assert.deepEqual(keyboard, [['show', '', CHAT_LIMIT]]);

  tap(input);
  ui.cycles(1);
  assert.deepEqual(keyboard, [['show', '', CHAT_LIMIT], ['hide']]);
});

test('on a desktop, the chat input has no tap layer, and typing and sending a line never call the phone keyboard', async () => {
  const { ui, keyboard } = await chatboxOn('toplevel_resizable', false);

  assert.equal(ui.component('chatbox', 'chatbox_open_input').hidden, true);

  say(ui, 'hi');
  ui.call('chatbox.meslayer.chatboxOpenInput');
  assert.deepEqual(keyboard, []);
});
const CHAT_LIMIT = 80;

const IN_CLAN = {
  activeclanchannel_affined_find: (group) => (group === 0 ? 1 : 0),
  activeclanchannel_user_slot_get: () => 0,
  activeclanchannel_user_rank_get: () => 1,
  activeclanchannel_rank_talk_get: () => 0,
};

test('a clan line reads "[Clan] Name: text", and "//" sends to the clan channel', async () => {
  const ui = await chatbox(IN_CLAN);
  ui.chat(41, 'Zezima', 'hello clan', 'Rift');
  ui.cycles(5);
  const shown = ui.texts('chatbox').map(plain);
  const at = shown.indexOf('hello clan');
  assert.deepEqual(shown.slice(at - 2, at), ['[Rift]', 'Zezima:']);
  say(ui, '//hi clan');
  assert.deepEqual(ui.calls('chat_sendclan'), [{ builtin: 'chat_sendclan', args: '"hi clan", 3, 0' }]);
});

function tabOption(ui, tab, label) {
  const button = ui.component('chatbox', `chatbox_tab${tab}`);
  const at = button.options.findIndex((option) => plain(option) === label);
  assert.ok(at >= 0, `tab ${tab} offers "${label}" (it offers ${JSON.stringify(button.options.map(plain))})`);
  button.option(at + 1);
  ui.cycles(5);
}
const shownLines = (ui) => ui.texts('chatbox').map(plain);

const CHAT_BAR = ['chatbox_tab0', 'chatbox_tab1', 'chatbox_tab2', 'chatbox_tab3', 'chatbox_tab4', 'chatbox_tab6', 'chatbox_report'];
const CHAT_BAR_GAP = 6;
const CHAT_BAR_EDGE = 3;

test('the chat bar\'s buttons share its width equally, a constant gap apart, with no hole where no tab is docked', async () => {
  const ui = await frame({ chat_container: 'chatbox' });
  const bar = ui.component('chatbox', 'chatbox_controls').bounds;
  const buttons = CHAT_BAR.map((name) => ui.component('chatbox', name).bounds);

  assert.equal(new Set(buttons.map((button) => button.width)).size, 1, `equal widths: ${buttons.map((button) => button.width)}`);

  const gaps = buttons.slice(1).map((button, at) => button.x - (buttons[at].x + buttons[at].width));
  assert.deepEqual(gaps, gaps.map(() => CHAT_BAR_GAP));

  const left = buttons[0].x - bar.x;
  const right = bar.x + bar.width - (buttons.at(-1).x + buttons.at(-1).width);
  assert.ok(left >= CHAT_BAR_EDGE && right >= CHAT_BAR_EDGE && Math.abs(left - right) <= 1, `the bar is filled, edge to edge: ${left} / ${right}`);

  for (const at of [0, 1, 2, 3, 4]) {
    assert.equal(ui.component('chatbox', `chatbox_tab${at}_plate`).bounds.width, buttons[at].width, `tab ${at}'s art is as wide as its button`);
  }
  assert.equal(ui.component('chatbox', 'chatbox_tab6_plate').bounds.width, buttons[5].width, 'Trade\'s art is as wide as its button');
});

test('with a tab docked in chat.tab.extra (rift.clans\' Clan tab), the bar\'s eight buttons share its width the same way', async () => {
  const ui = await frame({ chat_container: 'chatbox' });
  ui.open('chatbox', 'chatbox_extra_tab', 'pm_chat');
  ui.call('chatbox.chatbox-chrome.extraTabOpen');
  ui.cycles(5);

  const names = [...CHAT_BAR.slice(0, 5), 'chatbox_extra_tab', ...CHAT_BAR.slice(5)];
  const buttons = names.map((name) => ui.component('chatbox', name).bounds);
  assert.equal(new Set(buttons.map((button) => button.width)).size, 1, `equal widths: ${buttons.map((button) => button.width)}`);

  const gaps = buttons.slice(1).map((button, at) => button.x - (buttons[at].x + buttons[at].width));
  assert.deepEqual(gaps, gaps.map(() => CHAT_BAR_GAP));
  assert.ok(buttons[0].width < ui.component('chatbox', 'chatbox_controls').bounds.width / 7, 'narrower than with seven');
});

test('a tab docked in chat.tab.extra reflows the bar by itself, with no call from the docking plugin', async () => {
  const ui = await frame({ chat_container: 'chatbox' });
  ui.open('chatbox', 'chatbox_extra_tab', 'pm_chat');
  ui.cycles(5);

  const docked = ui.component('chatbox', 'chatbox_extra_tab');
  const trade = ui.component('chatbox', 'chatbox_tab6').bounds;
  assert.equal(docked.hidden, false, 'the docked tab shows');
  assert.equal(docked.bounds.width, trade.width, `the docked tab is as wide as Trade: ${docked.bounds.width} / ${trade.width}`);
});

test('the Group tab reads "Group", and its options and the chat mode say Group', async () => {
  const ui = await frame({ chat_container: 'chatbox' });
  assert.ok(ui.texts('chatbox').some((text) => text.startsWith('Group')), `a tab reads Group: ${ui.texts('chatbox')}`);
  assert.ok(!ui.texts('chatbox').some((text) => text.startsWith('Channel')), 'no tab reads Channel');

  const group = ui.find('chatbox', { option: '<col=ffff00>Group:</col> Show all' });
  assert.ok(group, 'the Group tab offers "Group: Show all"');
  assert.ok(ui.find('chatbox', { option: '<col=ffff00>Set chat mode:</col> Group (/@f)' }), 'All offers "Set chat mode: Group (/@f)"');
});

test('Switch tab shows that tab\'s lines alone, and All shows them all again', async () => {
  const ui = await chatbox();
  ui.chat(0, '', 'a game line');
  ui.chat(2, 'Ann', 'hello public');
  ui.cycles(5);
  tabOption(ui, 2, 'Switch tab');
  assert.ok(shownLines(ui).includes('hello public'));
  assert.ok(!shownLines(ui).includes('a game line'));
  tabOption(ui, 0, 'Switch tab');
  assert.ok(shownLines(ui).includes('hello public') && shownLines(ui).includes('a game line'));
});

test('a tab\'s Show none hides its lines and its label says Off; Show all brings them back', async () => {
  const ui = await chatbox(IN_FRIENDS_CHAT);
  ui.chat(9, 'Bob', 'hello channel', 'Rift');
  ui.cycles(5);
  tabOption(ui, 4, 'Group: Show none');
  assert.ok(!shownLines(ui).includes('hello channel'));
  const shown = shownLines(ui);
  assert.equal(shown[shown.indexOf('Group ') + 1], 'Off', 'the Group tab\'s label');
  tabOption(ui, 4, 'Group: Show all');
  assert.ok(shownLines(ui).includes('hello channel'));
});

test('Clear history hides the tab\'s lines so far, and shows the ones after', async () => {
  const ui = await chatbox();
  ui.chat(2, 'Ann', 'before');
  ui.cycles(5);
  tabOption(ui, 2, 'Public: Clear history');
  assert.ok(!shownLines(ui).includes('before'));
  ui.cycles(5);
  ui.chat(2, 'Ann', 'after');
  ui.cycles(5);
  assert.ok(shownLines(ui).includes('after'));
});

test('the All tab\'s Set chat mode: Clan sends an unprefixed line to the clan channel', async () => {
  const ui = await chatbox(IN_CLAN);
  tabOption(ui, 0, 'Set chat mode: Clan (/@c)');
  assert.ok(ui.calls('message')[0].args.startsWith('"Your chatbox mode is now set to Clan chat.'));
  say(ui, 'hi all');
  assert.deepEqual(ui.calls('chat_sendclan'), [{ builtin: 'chat_sendclan', args: '"hi all", 3, 0' }]);
});

test('the chatbox has no Clan tab of its own: its tab row keeps a slot for another package\'s tab, hidden until one is docked', async () => {
  const ui = await chatbox();
  assert.ok(!shownLines(ui).includes('Clan '), 'no Clan tab');
  assert.equal(ui.component('chatbox', 'chatbox_extra_tab').hidden, true);
  ui.open('chatbox', 'chatbox_extra_tab', 'logout');
  ui.call('chatbox.chatbox-chrome.extraTabOpen');
  ui.cycles(5);
  assert.equal(ui.component('chatbox', 'chatbox_extra_tab').hidden, false);
});

test('every frame names the chatbox\'s extra tab slot', () => {
  for (const name of ['resizable', 'classic', 'mobile']) {
    const toml = readFileSync(`src/main/resources/META-INF/rift/toplevels/${name}.toml`, 'utf8');
    assert.ok(toml.includes('"chat.tab.extra" = { interface = "chatbox", component = "chatbox_extra_tab" }'), name);
  }
});

const FRAMES = ['toplevel_mobile', 'toplevel_resizable', 'toplevel_classic'];

function idOf(frame, ref) {
  const iface = JSON.parse(readFileSync(join(BUILD, 'interfaces.json'), 'utf8')).find((def) => def.name === frame);
  const at = iface.componentRefs.find((named) => named.name === ref);
  assert.ok(at !== undefined && at.childIndex < 0, `${frame} names a component ${ref}`);
  return (iface.id << 16) | at.component;
}

async function opened(frame, builtins) {
  const ui = await loadTs2Build(BUILD, builtins === undefined ? {} : { builtins });
  ui.open(frame);
  ui.cycles(1);
  return ui;
}

test('each frame\'s chat slot is its own chat container, and the phone frame\'s chat stone its chat toggle', async () => {
  for (const frame of FRAMES) {
    const ui = await opened(frame);
    assert.equal(ui.call('chatbox.chatbox-chrome.chatContainer'), idOf(frame, `${frame}_chat_container`), frame);
    const stone = frame === 'toplevel_mobile' ? idOf(frame, 'toplevel_mobile_chat_toggle') : -1;
    assert.equal(ui.call('chatbox.chat-buttons.mobileChatStone'), stone, frame);
  }
});

test('each frame\'s side tab N is its own sideN: a panel docked there is the open one', async () => {
  for (const frame of FRAMES) {
    const ui = await opened(frame);
    for (let tab = 0; tab < 14; tab++) {
      assert.equal(ui.call('orbs.orbs.helpers.sidePanelOpen', tab), 0, `${frame} side${tab} before`);
      ui.open(frame, `${frame}_side${tab}`, 'logout');
      assert.equal(ui.call('orbs.orbs.helpers.sidePanelOpen', tab), 1, `${frame} side${tab}`);
    }
  }
});

test('each frame\'s floater and side modal slots are its own components of those names', async () => {
  for (const frame of FRAMES) {
    const ui = await opened(frame);
    assert.equal(ui.call('orbs.orbs.helpers.floatingPanelOpen'), 0, frame);
    ui.open(frame, `${frame}_floater`, 'logout');
    assert.equal(ui.call('orbs.orbs.helpers.floatingPanelOpen'), 1, `${frame}_floater`);

    const tab = await opened(frame);
    tab.open(frame, `${frame}_side4`, 'equipment_side');
    tab.cycles(5);
    assert.equal(tab.call('inventory.inventory-highlight.component.equipmentSideTakes'), 0, frame);
    ui.open(frame, `${frame}_sidemodal`, 'equipment_side');
    ui.cycles(5);
    assert.equal(ui.call('inventory.inventory-highlight.component.equipmentSideTakes'), 1, `${frame}_sidemodal`);

  }
});

const LEFT = 0;
const ENHANCED_CLIENT = 4;

test('each frame\'s floater, main modal, helper, mouseover row and overlay HUD are what the scripts that use them read', async () => {
  for (const frame of FRAMES) {
    let asked = [];
    const ui = await opened(frame, { if_sub_has: (component) => { asked.push(component); return 0; } });
    asked = [];
    ui.call('lib.lib.dialogue.dialogueMayAdvance', -1, -1);
    assert.deepEqual(asked, [idOf(frame, `${frame}_floater`), idOf(frame, `${frame}_mainmodal`)], frame);

    let heights = [];
    const stacking = await opened(frame, { if_height_get: (component) => { heights.push(component); return 0; } });
    heights = [];
    stacking.call('lib.lib.overlay.stackBelow', 0, 1 << 6, -1, LEFT, idOf(frame, frame), 0);
    assert.equal(heights[0], idOf(frame, `${frame}_helper_content`), frame);

    let read = [];
    const hover = await opened(frame, {
      clienttype: () => ENHANCED_CLIENT,
      mouse_x_get: () => 10,
      mouse_y_get: () => 10,
      if_hide_get: (component) => { read.push(component); return 1; },
    });
    read = [];
    hover.call('lib.enhanced.mouseover.mouseoverOps');
    assert.equal(read[0], idOf(frame, `${frame}_mouseover`), frame);

    let cleared = [];
    const notice = await opened(frame, {
      clienttype: () => ENHANCED_CLIENT,
      mouse_x_get: () => -1,
      mouse_y_get: () => -1,
      cc_all_delete: (component) => { cleared.push(component); },
    });
    cleared = [];
    notice.call('lib.enhanced.renderer-notice.component.rendererNoticeBuild');
    const hud = frame === 'toplevel_resizable' ? [] : [idOf(frame, `${frame}_overlay_hud`)];
    assert.deepEqual(cleared, hud, frame);
  }
});

test('the frame checks: only the phone frame is mobile, only classic keeps no tab open, and "no frame" only with none', async () => {
  const layout = (ui) => ui.call('lib.lib.helpers.toplevelComponents');
  for (const frame of [...FRAMES, undefined]) {
    const ui = await loadTs2Build(BUILD);
    if (frame !== undefined) ui.open(frame);
    ui.cycles(1);
    const name = frame ?? 'no frame';
    assert.equal(ui.call('orbs.orbs.helpers.onMobileFrame'), frame === 'toplevel_mobile' ? 1 : 0, name);
    assert.equal(ui.call('lib.lib.overlay.mobileGameframe', layout(ui)), frame === 'toplevel_mobile' ? 1 : 0, name);
    assert.equal(ui.call('orbs.orbs.helpers.noFrame'), frame === undefined ? 1 : 0, name);
    const deselects = ui.call('toplevel.toplevel.helpers.deselectsOpenTab', layout(ui));
    assert.equal(deselects, frame === 'toplevel_classic' ? 1 : 0, name);
  }
});

test('the spec orb shows the special attack energy and offers Use with no weapon in the table: which weapon has a special is the server\'s to say', async () => {
  const ui = await loadTs2Build(BUILD, { session: { members: true } });
  ui.state('game:sa_energy', 750);
  ui.open('orbs');
  ui.cycles(5);
  assert.ok(ui.texts('orbs').includes('75'), 'the energy, in percent');
  assert.deepEqual(ui.find('orbs', { option: 'Use' }).options.filter((option) => option !== ''), ['Use']);
});

test('every world plays as a members world: on a free world, for a free player, the spec orb offers Use and fills as on any world', async () => {
  const free = await loadTs2Build(BUILD, { session: { members: false }, builtins: { map_members: () => false } });
  const member = await loadTs2Build(BUILD, { session: { members: true } });
  for (const ui of [free, member]) {
    ui.state('game:sa_energy', 750);
    ui.open('orbs');
    ui.cycles(5);
  }

  assert.deepEqual(free.find('orbs', { option: 'Use' }).options.filter((option) => option !== ''), ['Use']);
  assert.deepEqual(free.texts('orbs'), member.texts('orbs'));
});

test('the world map button is named, and its Floating and Fullscreen World Map reach the server as options 2 and 3', async () => {
  const ui = await frame({ orbs: 'orbs' });
  const button = ui.component('orbs', 'orbs_worldmap');

  assert.deepEqual(button.options.slice(1, 3), ['Floating <col=ff9040>World Map</col>', 'Fullscreen <col=ff9040>World Map</col>']);

  button.option(2);
  button.option(3);

  assert.deepEqual(ui.calls('if_button').map((call) => call.args), ['"orbs_worldmap", 2', '"orbs_worldmap", 3']);
});

const LOGIN_PANELS = { chat_container: 'chatbox', pm_container: 'pm_chat', orbs: 'orbs', side3: 'inventory', side4: 'wornitems', side9: 'friends', side10: 'logout' };

async function loggedIn(frame, options = {}) {
  const ui = await loadTs2Build(BUILD, options);
  ui.open(frame);
  for (const [slot, panel] of Object.entries(LOGIN_PANELS)) ui.open(frame, `${frame}_${slot}`, panel);
  ui.cycles(10);
  return ui;
}

function everyComponent(component) {
  return [component, ...component.children.flatMap(everyComponent)];
}

test('after login the run orb offers Toggle Run in every frame, and a click reaches the server as orbs_runbutton', async () => {
  for (const frame of FRAMES) {
    const ui = await loggedIn(frame);
    const button = ui.component('orbs', 'orbs_runbutton');

    assert.equal(button.hidden, false, frame);
    assert.equal(button.options[0], 'Toggle Run', frame);

    button.option(1);

    assert.deepEqual(ui.calls('if_button').map((call) => call.args), ['"orbs_runbutton", 1'], frame);
  }
});

test('the run orb\'s icon follows the server\'s running state', async () => {
  const ui = await loggedIn(FRAME);
  const icons = () => everyComponent(ui.component('orbs', 'orbs')).map((component) => component.spriteName);

  assert.ok(icons().includes('orb_icon_2'), 'walking');
  assert.ok(!icons().includes('orb_icon_3'), 'walking');

  ui.state('rift.engine:running', true);
  ui.cycles(5);

  assert.ok(icons().includes('orb_icon_3'), 'running');
  assert.ok(!icons().includes('orb_icon_2'), 'running');
});

test('the equipment screen shows its stat bonuses and offers no set-bonus pane: a game\'s set effects are its own panel\'s', async () => {
  const ui = await loadTs2Build(BUILD, { session: { members: true } });
  ui.open('equipment');
  ui.cycles(5);
  const shown = ui.texts('equipment');
  assert.ok(shown.includes('Equip Your Character...'));
  assert.ok(!shown.includes('Set Bonus') && !shown.includes('Set Effect Bonus'), 'no set-bonus toggle or pane');
});

const EXAMINED = 1001;
const PLAIN = 1002;

async function itemPanel(panel, item) {
  const ui = await loadTs2Build(BUILD, {
    params: { has_examine: { [EXAMINED]: true, default: false } },
    builtins: {
      inv_item_get: (inventory, slot) => (slot === 0 ? item : -1),
      inv_num_get: (inventory, slot) => (slot === 0 ? 1 : 0),
    },
  });
  ui.open(panel);
  if (panel === 'equipment_side') ui.call('equipment_side.equipment-side.helpers.equipmentSideInit', 0, 0, 4, 7, 0, 0, 'Equip', '', '', '', '');
  ui.cycles(5);
  return ui;
}

for (const panel of ['inventory', 'equipment_side', 'wornitems', 'equipment']) {
  test(`${panel}: an item offers Examine only when it has examine text (has_examine)`, async () => {
    const examined = await itemPanel(panel, EXAMINED);
    assert.equal(examined.find(panel, { option: 'Examine' }).options[9], 'Examine', 'Examine is option 10');

    const plain = await itemPanel(panel, PLAIN);
    assert.throws(() => plain.find(panel, { option: 'Examine' }), /shows no component/, 'an item with no examine text offers none');
  });
}

function componentOps() {
  return JSON.parse(readFileSync(join(BUILD, 'component-ops.json'), 'utf8')).components;
}

test('the bag and the equipment side\'s bag each publish their rows as showing the bag', () => {
  const rows = componentOps()
    .filter((row) => row.target === 'row')
    .map((row) => [row.interface, row.component, row.inventory?.name]);

  assert.deepEqual(rows, [
    ['equipment_side', 'equipment_side', 'bag'],
    ['inventory', 'inventory', 'bag'],
  ]);
});

test('each worn tab slot publishes itself as showing its own slot of the worn equipment', () => {
  const wornSlots = [['HEAD', 0], ['CAPE', 1], ['AMULET', 2], ['WEAPON', 3], ['BODY', 4], ['SHIELD', 5], ['LEGS', 7], ['HANDS', 9], ['FEET', 10], ['RING', 12], ['AMMO', 13]];

  const rows = componentOps()
    .filter((row) => row.interface === 'wornitems')
    .map((row) => [row.component, row.target, row.inventory?.name, row.slot?.name, row.slot?.value])
    .sort();

  const expected = wornSlots.map(([name, value]) => [`wornitems_slot${value}`, 'self', 'worn_equipment', name, value]).sort();
  assert.deepEqual(rows, expected);
});

test('each equipment screen slot publishes itself as showing its own slot of the worn equipment', () => {
  const equipmentSlots = [['head', 'HEAD', 0], ['cape', 'CAPE', 1], ['amulet', 'AMULET', 2], ['weapon', 'WEAPON', 3], ['body', 'BODY', 4], ['shield', 'SHIELD', 5], ['legs', 'LEGS', 7], ['hands', 'HANDS', 9], ['feet', 'FEET', 10], ['ring', 'RING', 12], ['ammo', 'AMMO', 13]];

  const rows = componentOps()
    .filter((row) => row.interface === 'equipment')
    .map((row) => [row.component, row.target, row.inventory?.name, row.slot?.name, row.slot?.value])
    .sort();

  const expected = equipmentSlots.map(([ref, name, value]) => [`equipment_${ref}`, 'self', 'worn_equipment', name, value]).sort();
  assert.deepEqual(rows, expected);
});

test('a click on the side panel, its moulding or the stone rows never walks; one on the open view does', async () => {
  const ui = await frame({ side3: 'inventory' });
  ui.resize(765, 503);
  ui.cycles(5);

  const middle = (ref) => {
    const { x, y, width, height } = ui.component(FRAME, `${FRAME}_${ref}`).bounds;
    return [x + Math.floor(width / 2), y + Math.floor(height / 2)];
  };
  const menu = ui.component(FRAME, `${FRAME}_side_menu`).bounds;
  const moulding = [menu.x + 2, menu.y + Math.floor(menu.height / 2)];

  assert.equal(ui.reachesWorld(...middle('side_container')), false, 'the inventory panel');
  assert.equal(ui.reachesWorld(...moulding), false, 'the moulding beside it');
  assert.equal(ui.reachesWorld(...middle('side_top')), false, 'the top stone row');
  assert.equal(ui.reachesWorld(...middle('side_bottom')), false, 'the bottom stone row');
  assert.equal(ui.reachesWorld(200, 150), true, 'the open view');
});

test('a click on an orb\'s plate or the store button\'s ring never walks, beside the part that takes the click', async () => {
  const ui = await loadTs2Build(BUILD, { session: { members: true } });
  ui.state('game:tli_storebutton_toggle_mobile', 1);
  ui.state('game:tli_storebutton_toggle_desktop', 1);
  ui.open('toplevel_mobile');
  ui.open('toplevel_mobile', 'toplevel_mobile_orbs', 'orbs');
  ui.resize(765, 503);
  ui.cycles(10);

  const shown = [];
  const walk = (component) => {
    shown.push(component);
    component.children.forEach(walk);
  };
  walk(ui.component('orbs', 'orbs'));

  const leftEdge = ({ bounds }) => [bounds.x + 1, bounds.y + Math.floor(bounds.height / 2)];
  const plates = shown.filter((component) => component.spriteName === 'orb_frame_0');
  const ring = shown.find((component) => component.spriteName === 'ring_34_0');
  assert.equal(plates.length, 4, 'the hitpoints, prayer, run and special attack orbs');
  assert.ok(ring !== undefined && !ring.hidden, 'the store button shows');

  for (const [at, plate] of plates.entries()) assert.equal(ui.reachesWorld(...leftEdge(plate)), false, `orb ${at}'s plate`);
  assert.equal(ui.reachesWorld(...leftEdge(ring)), false, 'the store button\'s ring');
});

const WORN_SLOTS = [0, 1, 2, 3, 4, 5, 7, 9, 10, 12, 13];

test('every worn tab slot, the weapon slot included, offers Remove and Examine for the item worn there', async () => {
  for (const slot of WORN_SLOTS) {
    const ui = await loadTs2Build(BUILD, {
      params: { has_examine: { [EXAMINED]: true, default: false } },
      builtins: {
        inv_item_get: (inventory, at) => (at === slot ? EXAMINED : -1),
        inv_num_get: (inventory, at) => (at === slot ? 1 : 0),
      },
    });
    ui.open('wornitems');
    ui.cycles(5);

    const options = ui.component('wornitems', `wornitems_slot${slot}`).options;
    assert.equal(options[0], 'Remove', `slot ${slot}`);
    assert.equal(options[9], 'Examine', `slot ${slot}`);
  }
});

const REVEALED_TABS = [
  { side: 1, option: 'Skills' },
  { side: 3, option: 'Inventory' },
  { side: 4, option: 'Worn Equipment' },
  { side: 9, option: 'Friends List' },
  { side: 10, option: 'Logout' },
  { side: 11, option: 'Settings' },
  { side: 13, option: 'Music Player' },
];
const FRAMES_WITHOUT_A_TAB = ['toplevel_classic', 'toplevel_mobile'];
const UNREVEALED_SLOTS = ['side0', 'side2', 'side12', 'mainmodal', 'sidemodal', 'floater', 'chat_container', 'orbs'];
const SERVER_BOUND = new Set([...SERVER_REACHING_OPS.keys(), 'if_button', 'if_buttond']);
const NO_STONE = -1;

async function frameWithTabs(frame, sides, options = {}) {
  const ui = await loadTs2Build(BUILD, options);
  ui.open(frame);
  ui.cycles(5);
  for (const side of sides) ui.open(frame, `${frame}_side${side}`, 'logout');
  ui.cycles(5);
  return ui;
}

const sideSlot = (ui, frame, side) => ui.component(frame, `${frame}_side${side}`);

const stoneSprite = (ui, frame, option) => ui.find(frame, { option }).sprite;

const clickTab = (ui, frame, option) => {
  ui.find(frame, { option }).option(1);
  ui.cycles(2);
};

function serverCallsOf(ui, act) {
  const before = ui.calls().length;
  act();
  return ui.calls().slice(before).filter((call) => SERVER_BOUND.has(call.builtin));
}

function assertSelected(ui, frame, tab, others, what) {
  assert.equal(sideSlot(ui, frame, tab.side).hidden, false, `${what}: side${tab.side} shows`);
  assert.equal(ui.component(frame, `${frame}_side_container`).hidden, false, `${what}: the side panel shows`);
  assert.notEqual(stoneSprite(ui, frame, tab.option), NO_STONE, `${what}: its tab is lit`);
  for (const other of others) assert.equal(sideSlot(ui, frame, other.side).hidden, true, `${what}: side${other.side} is put away`);
}

test('each frame\'s side tab slot reveals by selecting its tab, from another tab, as a click on it does, telling the server nothing', async () => {
  for (const frame of FRAMES) {
    for (const [at, tab] of REVEALED_TABS.entries()) {
      const before = REVEALED_TABS[(at + 1) % REVEALED_TABS.length];
      const what = `${frame} side${tab.side} from side${before.side}`;
      const ui = await frameWithTabs(frame, [tab.side, before.side]);
      clickTab(ui, frame, before.option);
      assert.equal(sideSlot(ui, frame, before.side).hidden, false, `${what}: the tab before shows`);

      let revealed = false;
      const told = serverCallsOf(ui, () => { revealed = ui.reveal(`${frame}_side${tab.side}`); });

      assert.equal(revealed, true, `${what}: the slot has a reveal`);
      assertSelected(ui, frame, tab, [before], what);
      assert.deepEqual(told, [], `${what}: the server is told nothing`);
    }
  }
});

test('on the frames that can keep no tab open, a side tab slot reveals by opening the side panel on its tab', async () => {
  for (const frame of FRAMES_WITHOUT_A_TAB) {
    for (const tab of REVEALED_TABS) {
      const what = `${frame} side${tab.side} from none`;
      const ui = await frameWithTabs(frame, [tab.side]);
      clickTab(ui, frame, tab.option);
      clickTab(ui, frame, tab.option);
      assert.equal(sideSlot(ui, frame, tab.side).hidden, true, `${what}: no tab is open before`);
      assert.equal(ui.component(frame, `${frame}_side_container`).hidden, true, `${what}: the side panel is closed before`);

      assert.equal(ui.reveal(`${frame}_side${tab.side}`), true, what);
      assertSelected(ui, frame, tab, [], what);
    }
  }
});

test('revealing the tab already open keeps it open, where a second click on it would close it', async () => {
  for (const frame of FRAMES) {
    const tab = REVEALED_TABS.at(-1);
    const ui = await frameWithTabs(frame, [tab.side]);
    clickTab(ui, frame, tab.option);

    assert.equal(ui.reveal(`${frame}_side${tab.side}`), true, frame);
    assertSelected(ui, frame, tab, [], frame);
  }
});

test('a side tab the game hides (nothing open there, flashside on another tab) is not selected by its reveal', async () => {
  for (const frame of FRAMES) {
    for (const [at, tab] of REVEALED_TABS.entries()) {
      const before = REVEALED_TABS[(at + 1) % REVEALED_TABS.length];
      const what = `${frame} side${tab.side}`;
      const ui = await frameWithTabs(frame, [before.side]);
      ui.state('game:flashside', before.side + 1);
      clickTab(ui, frame, before.option);

      assert.equal(ui.reveal(`${frame}_side${tab.side}`), true, what);
      ui.cycles(2);

      assert.equal(sideSlot(ui, frame, before.side).hidden, false, `${what}: the tab before still shows`);
      assert.notEqual(stoneSprite(ui, frame, before.option), NO_STONE, `${what}: the tab before is still lit`);
    }
  }
});

test('a side tab flashside shows, with nothing open there yet, is selected by its reveal', async () => {
  for (const frame of FRAMES) {
    const tab = REVEALED_TABS.at(-1);
    const before = REVEALED_TABS[0];
    const ui = await frameWithTabs(frame, [before.side]);
    ui.state('game:flashside', tab.side + 1);
    clickTab(ui, frame, before.option);

    assert.equal(ui.reveal(`${frame}_side${tab.side}`), true, frame);
    assert.notEqual(stoneSprite(ui, frame, tab.option), NO_STONE, `${frame}: the flashing tab is lit`);
    assert.equal(sideSlot(ui, frame, before.side).hidden, true, `${frame}: the tab before is put away`);
  }
});

test('while a cutscene takes the side panel away, a side tab\'s reveal selects nothing', async () => {
  for (const frame of FRAMES) {
    const tab = REVEALED_TABS.at(-1);
    const before = REVEALED_TABS[0];
    const ui = await frameWithTabs(frame, [tab.side, before.side]);
    clickTab(ui, frame, before.option);
    ui.state('game:cutscene_status', 1);
    ui.cycles(2);

    assert.equal(ui.reveal(`${frame}_side${tab.side}`), true, frame);
    ui.state('game:cutscene_status', 0);
    ui.cycles(2);

    assert.equal(sideSlot(ui, frame, before.side).hidden, false, `${frame}: the tab before shows after the cutscene`);
    assert.equal(sideSlot(ui, frame, tab.side).hidden, true, `${frame}: the revealed tab was not selected`);
  }
});

test('a frame\'s slot with no reveal reports it: revealing it does nothing', async () => {
  for (const frame of FRAMES) {
    const ui = await frameWithTabs(frame, []);
    for (const slot of UNREVEALED_SLOTS) assert.equal(ui.reveal(`${frame}_${slot}`), false, `${frame}_${slot}`);
  }
});

const EXTRA_TAB = 'chatbox_extra_tab';
const CLAN_TAB = 5;
const SWITCH_TAB = 1;

async function chatboxOnPublic(docked) {
  const ui = await chatbox(IN_CLAN);
  if (docked) {
    ui.open('chatbox', EXTRA_TAB, 'logout');
    ui.call('chatbox.chatbox-chrome.extraTabOpen');
  }
  ui.chat(41, 'Zezima', 'hello clan', 'Rift');
  ui.chat(2, 'Ann', 'hello public');
  ui.cycles(5);
  tabOption(ui, 2, 'Switch tab');
  assert.ok(shownLines(ui).includes('hello public') && !shownLines(ui).includes('hello clan'), 'Public is selected before');
  return ui;
}

test('chat.tab.extra reveals by selecting the extra tab, as a click on it does, telling the server nothing', async () => {
  const ui = await chatboxOnPublic(true);

  let revealed = false;
  const told = serverCallsOf(ui, () => { revealed = ui.reveal(EXTRA_TAB); });
  ui.cycles(5);

  assert.equal(revealed, true, 'the slot has a reveal');
  assert.equal(ui.component('chatbox', EXTRA_TAB).hidden, false, 'the extra tab shows');
  assert.ok(shownLines(ui).includes('hello clan') && !shownLines(ui).includes('hello public'), 'the clan lines alone show');
  assert.deepEqual(told, [], 'the server is told nothing');

  const clicked = await chatboxOnPublic(true);
  clicked.call('chatbox.chat-tabs.chatTabOp', CLAN_TAB, SWITCH_TAB);
  clicked.cycles(6);
  assert.deepEqual(shownLines(ui), shownLines(clicked), 'the chatbox shows what a click on the extra tab shows');
});

test('revealing chat.tab.extra with its tab already selected keeps it selected', async () => {
  const ui = await chatboxOnPublic(true);
  ui.reveal(EXTRA_TAB);

  assert.equal(ui.reveal(EXTRA_TAB), true);
  ui.cycles(5);

  assert.ok(shownLines(ui).includes('hello clan') && !shownLines(ui).includes('hello public'), 'the clan lines alone still show');
});

test('with nothing open in chat.tab.extra, its reveal selects nothing: the row keeps the empty tab hidden', async () => {
  const ui = await chatboxOnPublic(false);

  assert.equal(ui.reveal(EXTRA_TAB), true, 'the slot has a reveal');
  ui.cycles(5);

  assert.equal(ui.component('chatbox', EXTRA_TAB).hidden, true, 'the empty extra tab stays hidden');
  assert.ok(shownLines(ui).includes('hello public') && !shownLines(ui).includes('hello clan'), 'Public is still selected');
});

test('a worn item\'s own option reaches the server as that worn op, in every worn tab slot', async () => {
  for (const slot of WORN_SLOTS) {
    const ui = await loadTs2Build(BUILD, {
      session: { members: true },
      params: { 'game:property_451': { [EXAMINED]: 'Rub', default: '' } },
      builtins: {
        inv_item_get: (inventory, at) => (at === slot ? EXAMINED : -1),
        inv_num_get: (inventory, at) => (at === slot ? 1 : 0),
      },
    });
    ui.open('wornitems');
    ui.cycles(5);

    ui.component('wornitems', `wornitems_slot${slot}`).option(2);

    assert.deepEqual(ui.calls('if_button').at(-1)?.itemOp, { menu: 'worn', k: 1 }, `slot ${slot}`);
  }
});

test('every world plays as a members world: a free player on a free world is offered a members item\'s worn options, in the worn tab and on the equipment screen', async () => {
  for (const panel of ['wornitems', 'equipment']) {
    const ui = await loadTs2Build(BUILD, {
      session: { members: false },
      params: { 'game:property_451': { [EXAMINED]: 'Rub', default: '' } },
      builtins: {
        map_members: () => false,
        item_members: () => 1,
        inv_item_get: (inventory, at) => (at === 0 ? EXAMINED : -1),
        inv_num_get: (inventory, at) => (at === 0 ? 1 : 0),
      },
    });
    ui.open(panel);
    ui.cycles(5);

    assert.equal(ui.find(panel, { option: 'Rub' }).options[1], 'Rub', panel);
  }
});

test('an item\'s first bag option reaches the server as its inventory op 1', async () => {
  const ui = await loadTs2Build(BUILD, {
    builtins: {
      inv_item_get: (inventory, at) => (at === 0 ? EXAMINED : -1),
      inv_num_get: () => 1,
      item_iop: (item, op) => (op === 1 ? 'Wield' : ''),
    },
  });
  ui.open('inventory');
  ui.cycles(5);

  ui.find('inventory', { option: 'Wield' }).option(2);

  assert.deepEqual(ui.calls('if_button').at(-1)?.itemOp, { menu: 'inventory', k: 1 });
});

test('with shift-click drop on and shift held, a bag item\'s first option is its shift-click op, moved up from that op\'s own place', async () => {
  const ui = await loadTs2Build(BUILD, {
    builtins: {
      inv_item_get: (inventory, at) => (at === 0 ? EXAMINED : -1),
      inv_num_get: () => 1,
      item_iop: (item, op) => (op === 1 ? 'Wield' : op === 5 ? 'Drop' : ''),
      item_shiftclickop: () => 5,
      key_held: () => 1,
    },
  });
  ui.state('game:desktop_shiftclickdrop_enabled', 1);
  ui.open('inventory');
  ui.cycles(5);

  const slot = ui.find('inventory', { option: 'Drop' });
  assert.deepEqual(slot.options.filter((option) => option !== ''), ['Drop', 'Wield']);
  assert.equal(slot.options[0], 'Drop', 'the shift-click op first');

  slot.option(1);

  const sent = ui.calls('if_button').at(-1);
  assert.equal(sent?.slot, 0, 'the slot it was chosen on');
  assert.ok(sent?.args.endsWith(', 1'), 'as the slot\'s op 1');
});

const BAG_SIZE = 28;
const LOGS = 1511;
const SHRIMPS = 315;
const FIRST_OPTION_OF = { [LOGS]: 'Light', [SHRIMPS]: 'Eat' };

async function bagHolding(items, counts = {}) {
  const ui = await loadTs2Build(BUILD, {
    builtins: {
      inv_size: () => BAG_SIZE,
      inv_item_get: (inventory, at) => items[at] ?? -1,
      inv_num_get: (inventory, at) => counts[at] ?? 1,
      item_iop: (item, op) => (op === 1 ? FIRST_OPTION_OF[item] ?? '' : ''),
    },
  });
  ui.open('inventory');
  ui.cycles(5);
  return ui;
}

function bagSlot(ui, slot) {
  const grid = ui.component('inventory', 'inventory').children.find((child) => child.children.length >= BAG_SIZE);
  return grid.children[slot];
}

test('an item\'s option in bag slot k reaches the server as slot k', async () => {
  for (const slot of [0, 5, BAG_SIZE - 1]) {
    const ui = await bagHolding({ [slot]: LOGS });

    ui.find('inventory', { option: 'Light' }).option(2);

    assert.equal(ui.calls('if_button').at(-1)?.slot, slot, `slot ${slot}`);
  }
});

test('an item dragged onto another bag item swaps places with it at once, before the server answers', async () => {
  const ui = await bagHolding({ 0: LOGS, 5: SHRIMPS });

  ui.find('inventory', { option: 'Light' }).dragTo(ui.find('inventory', { option: 'Eat' }));
  ui.cycles(1);

  assert.equal(bagSlot(ui, 5).item, LOGS, 'slot 5 shows the dragged item');
  assert.equal(bagSlot(ui, 0).item, SHRIMPS, 'slot 0 shows the item it swapped with');
});

test('an item dragged onto an empty bag slot shows there at once, before the server answers', async () => {
  const ui = await bagHolding({ 0: LOGS });

  ui.find('inventory', { option: 'Light' }).dragTo(bagSlot(ui, 5));
  ui.cycles(1);

  assert.equal(bagSlot(ui, 5).item, LOGS, 'slot 5 shows the dragged item');
  assert.notEqual(bagSlot(ui, 0).item, LOGS, 'slot 0 no longer shows it');
});

test('a dragged stack swaps with the stack it lands on, each keeping its count', async () => {
  const ui = await bagHolding({ 0: LOGS, 5: SHRIMPS }, { 0: 5, 5: 3 });

  ui.find('inventory', { option: 'Light' }).dragTo(ui.find('inventory', { option: 'Eat' }));
  ui.cycles(1);

  assert.equal(bagSlot(ui, 5).itemCount, 5, 'slot 5 shows the dragged stack of 5');
  assert.equal(bagSlot(ui, 0).itemCount, 3, 'slot 0 shows the stack of 3 it swapped with');
});

test('the compass turns the camera in the client\'s 16384-unit angles, keeping its pitch', async () => {
  const ui = await frame({}, { builtins: { cam_angle_xa_get: () => 1800 } });
  const compass = ui.find(FRAME, { option: 'Look East' });

  for (const [look, yaw] of [['Look East', 12288], ['Look North', 0], ['Look West', 4096], ['Look South', 8192]]) {
    compass.option(compass.options.indexOf(look) + 1);
    assert.deepEqual(ui.calls('cam_forceangle').at(-1), { builtin: 'cam_forceangle', args: `1800, ${yaw}` }, look);
  }
});
