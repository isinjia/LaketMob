// node tools/balancetest.js
// 실제 전투·저장·스토리 코드를 사용한다. 화면, 오디오, 대기 시간만 대체한다.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, assert, URLSearchParams, location: { search: '' } });
function run(code, filename) { return vm.runInContext(code, context, { filename }); }
run(`
let seed = 123456789;
Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const J = (name, particle) => name + particle;
const window = globalThis, Ease = {}, ROOMS = {}, BADGES = [];
window.addEventListener = () => {};
const IMG = { bg: {} }, Settings = { difficulty: 1 };
const LOW_MEM = false;
const noop = () => {};
const setInterval = noop;
const Audio2 = new Proxy({}, { get: () => noop });
const FX = { doFlash: noop, doShake: noop }, Particles = { clear: noop };
const wait = async () => {};
const tween = async (obj, props) => Object.assign(obj, props);
const messages = [];
const say = async text => { messages.push(text); };
const ask = async () => 1;
class ListNav { constructor(n) { this.n = n; this.i = 0; } }
const UI = { push: async () => {}, stack: [] };
const World = { id: 'lab', def: {}, player: { x: 6, y: 6, dir: 'up' }, locked: false, bgmKey: () => 'base' };
const storage = new Map();
const localStorage = { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) };
`);
for (const file of ['js/data.js', 'js/maps.js', 'js/game.js', 'js/league.js', 'js/rosterdata.js', 'js/roster.js', 'js/quests.js', 'js/battle.js']) {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file === 'js/game.js') source = source.replace(/\nboot\(\);\s*$/, '\n');
  run(source, file);
}

const tests = `
function mon(key, level, owned = true) {
  const m = new Mon(key, level, { trainer: true });
  m.ivs = [10, 10, 10, 10];
  if (owned) m.rank = autoRank(m.species.rank, level);
  m.recalc(); m.hp = m.maxHp; return m;
}
function battle(team, foes, trainer = {}) {
  Game.party = team;
  const b = new Battle({ kind: 'trainer', foes, trainer });
  // 표적 위치와 시청각 효과만 생략한다. 피해·회복·상태·능력 변화는 원본을 쓴다.
  for (const k of ['hitReact', 'popNumber', 'burst', 'traitPop', 'fxHeal', 'fxDrain', 'fxSpark', 'fxArrows']) b[k] = noop;
  b.playFx = async () => {};
  b.orderCutIn = async () => {};
  b.mePos = b.foePos = () => ({ x: 0, y: 0 });
  return b;
}
async function fight(team, foes, tactical = false) {
  const b = battle(team, foes);
  Game.bag = tactical ? { kit2: 3, kit3: 1 } : {};
  function bestFighter() {
    let best = b.meI, value = -1;
    Game.party.forEach((m, i) => {
      if (m.hp <= 0) return;
      const attack = Math.max(0, ...m.moves.filter(x => x.pp > 0).map(x => b.expectedDamage(m, b.foe, MOVES[x.id], 'me', 'foe')));
      const incoming = Math.max(1, ...b.foe.moves.filter(x => x.pp > 0).map(x => b.expectedDamage(b.foe, m, MOVES[x.id], 'foe', 'me')));
      const score = attack * m.hp / incoming;
      if (score > value) { best = i; value = score; }
    });
    return best;
  }
  if (tactical) b.meI = bestFighter();
  b.checkFaints = async function () {
    if (this.foe.hp <= 0) {
      const next = this.foes.findIndex(m => m.hp > 0);
      if (next < 0) return 'win';
      if (Game.party.every(m => m.hp <= 0)) return 'lose';
      this.foeI = next; this.resetStages('foe');
      if (this.me.hp <= 0) { this.meI = Game.party.findIndex(m => m.hp > 0); this.resetStages('me'); }
      if (tactical) { const chosen = bestFighter(); if (chosen !== this.meI) { this.meI = chosen; this.resetStages('me'); } }
      return 'cont';
    }
    if (this.me.hp <= 0) {
      const next = Game.party.findIndex(m => m.hp > 0);
      if (next < 0) return 'lose';
      this.meI = next; this.resetStages('me'); return 'cont';
    }
    return null;
  };
  for (let turn = 0; turn < 300; turn++) {
    const attacks = b.me.moves.filter(x => x.pp > 0 && MOVES[x.id].cat === 'atk');
    attacks.sort((a, z) => b.expectedDamage(b.me, b.foe, MOVES[z.id], 'me', 'foe') - b.expectedDamage(b.me, b.foe, MOVES[a.id], 'me', 'foe'));
    const id = attacks[0]?.id || '__struggle';
    const kit = ['kit2', 'kit3'].find(k => Game.bag[k] > 0);
    const heal = tactical && kit && b.me.hp < b.me.maxHp * 0.35;
    const result = await b.doTurn(heal ? { type: 'item', item: kit, target: b.meI } : { type: 'move', id, order: id !== '__struggle' && b.cmdG >= 3 });
    if (result) return { result, turns: turn + 1 };
  }
  throw new Error('전투 300턴 초과');
}
async function test() {
  // 전체 도감의 기술·타입·순서와 모든 레벨의 생성 가능성을 확인한다.
  assert.equal(DEX_LIST.length, 196);
  for (const s of SPECIES_LIST) {
    let previous = 0;
    for (const [level, id] of s.moves) {
      assert.ok(MOVES[id], s.key + ':' + id);
      assert.ok(level >= previous, s.key + ' 습득 순서'); previous = level;
    }
    for (let level = 1; level <= 100; level++) {
      const m = mon(s.key, level);
      assert.ok(m.maxHp > 0 && m.moves.length > 0 && m.moves.length <= 4);
    }
  }
  const signatures = new Set(EXPANDED_ROSTER.map(s => JSON.stringify(SPECIES[s.key].moves)));
  assert.ok(signatures.size >= 30);
  assert.equal(Object.keys(ROSTER_MOVE_PROFILES).length, 20);
  assert.equal(typeEff('ice', ['air']), 1);
  assert.equal(typeEff('elec', ['heavy']), 1);
  for (const s of DEX_LIST) assert.equal(typeEff('phys', s.types), 1);
  assert.equal(typeEff('fire', ['ice']), 2);
  assert.equal(typeEff('ice', ['elec']), 2);
  assert.equal(typeEff('elec', ['fire']), 2);

  // 다단 공격은 실효 피해로 비교하며, 요새화는 방어가 높아도 회복에 쓴다.
  let b = battle([mon('leprechaun', 20)], [mon('leprechaun', 20)]);
  b.foe.moves = [{ id: 'burst', pp: 20 }, { id: 'shot', pp: 20 }];
  assert.ok(b.moveScore(MOVES.burst) > b.moveScore(MOVES.shot) * 1.3);
  b = battle([mon('leprechaun', 25)], [mon('spriggan', 25)]);
  b.foe.hp = Math.floor(b.foe.maxHp * 0.2);
  b.stage.foe.def = 6;
  b.foe.moves = [{ id: 'fortify', pp: 10 }, { id: 'shot', pp: 10 }];
  assert.equal(b.foeAI(), 'fortify');
  const hp = b.foe.hp;
  await b.useMove('foe', 'fortify');
  assert.ok(b.foe.hp > hp);
  b.foe.heal();
  assert.equal(b.moveScore(MOVES.fortify), 0);
  b.foe.moves.forEach(m => m.pp = 0);
  assert.equal(b.foeAI(), '__struggle');
  b = battle([mon('harpy', 20)], [mon('lemonzeta', 24)]);
  assert.equal(b.moveScore(MOVES.emp), 0); // 전기 타입 면역
  b = battle([mon('leprechaun', 20)], [mon('leprechaun', 20)]);
  assert.ok(b.moveScore(MOVES.aimed) > 0);
  b.stage.foe.atk = 2;
  assert.equal(b.moveScore(MOVES.aimed), 0);

  // 새 공격의 부가 효과는 기존 전투 흐름에서 실제로 작동한다.
  b = battle([mon('draculina', 25)], [mon('spriggan', 25)]);
  b.me.moves = [{ id: 'bloodlink', pp: 10 }]; b.me.hp = Math.floor(b.me.maxHp / 2);
  const injured = b.me.hp;
  b.orderNext = true;
  await b.useMove('me', 'bloodlink');
  assert.ok(b.me.hp > injured);
  assert.ok(messages.some(t => t.includes('체력을 흡수했다')));
  b = battle([mon('fortune', 25)], [mon('spriggan', 25)]);
  await b.useMove('me', 'coverfire');
  assert.equal(b.stage.me.def, 1);
  b = battle([mon('poi', 25)], [mon('spriggan', 40)]);
  const random = Math.random;
  try {
    Math.random = () => 0; // 명중 및 30% 부가 효과가 발동하는 경계 조건
    await b.useMove('me', 'expose');
    assert.equal(b.stage.foe.def, -1);
    assert.equal(b.foe.status, null);
  } finally { Math.random = random; }

  // 경험치 배율은 야생 전투에 전달된 값만 적용, 대기 부대원은 50%.
  Game.party = [mon('leprechaun', 10), mon('gnome', 10)];
  b = battle(Game.party, [mon('brownie', 5, false)]);
  b.kind = 'wild'; b.o.expMul = 1.5; b.participants.add(b.me);
  const shares = []; b.addExp = async (m, amount) => shares.push(amount);
  await b.giveExp(b.foe);
  assert.deepEqual(shares, [75, 37]);
  delete b.o.expMul; shares.length = 0; b.participants.add(b.me);
  await b.giveExp(b.foe); assert.deepEqual(shares, [50, 25]);

  assert.equal(defeatCost(999999, 0), 0);
  assert.equal(defeatCost(999999, 1), 300);
  assert.equal(defeatCost(999999, 7), 900);
  assert.equal(defeatCost(50, 7), 50);
  Game.badges = []; Game.money = 3000;
  b = battle([mon('leprechaun', 10)], [mon('lemongamma', 11, false)], TRAINERS.gamma);
  await b.finish('lose'); assert.equal(Game.money, 3000);
  Game.badges = ['gamma']; Game.money = 3000;
  await b.finish('lose'); assert.equal(Game.money, 2700);

  // 예전 세이브의 도감 키·기억 기술·PP를 보존한다.
  Game.reset(); Game.party = [mon('draculina', 25)];
  Game.party[0].moves = [{ id: 'dive', pp: 3 }, { id: 'taunt', pp: 7 }];
  Game.flags.beat_alpha = 1; Game.save();
  assert.ok(Game.load());
  assert.equal(Game.party[0].moves[1].id, 'taunt');
  assert.equal(Game.party[0].moves[0].pp, 3);
  assert.equal(Game.flags.beat_alpha, 1);

  // 최종전 진입 시 이전 세이브도 작전을 준비하고 지휘를 받는다.
  Game.flags = {}; Game.box = []; messages.length = 0;
  await Scripts.pre_mpzeta();
  assert.equal(Game.flags.counterlink, 1);
  b = battle(Game.party, TRAINERS.mpzeta.team.map(([k,l]) => mon(k,l,false)), TRAINERS.mpzeta);
  assert.equal(b.cmdG, 3);
  assert.ok(!messages.some(t => t.includes('일곱 밤')));
  assert.ok(messages.some(t => t.includes('중계핵')));
  const normalBattle = battle(Game.party, [mon('brownie', 10)], TRAINERS.gamma);
  assert.equal(normalBattle.cmdG, 0);

  messages.length = 0; Game.flags = {}; Game.badges = [];
  await Scripts.post_alpha({ o: { id: 'alpha' } });
  assert.equal(Game.flags.counterlink, 1);
  const shield = messages.findIndex(t => t.includes('더는 데이터를 보내지'));
  const night = messages.findIndex(t => t.includes('오늘 밤의 기록'));
  assert.ok(shield >= 0 && night > shield);
  await Scripts.post_omega({ o: { id: 'omega' } });
  assert.equal(Game.flags.resortRed, 1);
  assert.ok(Game.badges.includes('omega'));
  assert.ok(messages.some(t => t.includes('위장 신호')));
  runEnding = async () => {};
  await Scripts.post_mpzeta();
  assert.equal(Game.flags.cleared, 1);
  assert.ok(messages.some(t => t.includes('제 책임')));

  // 난이도 보정은 실제 전투 진입 함수에서 검사한다. 복제 부대에는 중복 적용하지 않는다.
  Game.reset(); Game.party = [mon('leprechaun', 20)];
  const originalRun = Battle.prototype.run;
  const originalTick = Quests.tick;
  let adjusted;
  Battle.prototype.run = async function () { adjusted = this.foes; return 'run'; };
  Quests.tick = noop;
  try {
    for (const difficulty of [0, 1, 2]) {
      Settings.difficulty = difficulty;
      await startBattle({ kind: 'trainer', trainer: TRAINERS.gamma, foes: [mon('lemongamma', 11, false)] });
      assert.equal(adjusted[0].level, [8, 11, 14][difficulty]);
      assert.ok(!adjusted[0].moves.some(m => m.id === 'barrage'));
    }
    await startBattle({ kind: 'trainer', trainer: { copyOf: [Game.party[0]] }, foes: [mon('leprechaun', 19, false)] });
    assert.equal(adjusted[0].level, 19);
  } finally {
    Battle.prototype.run = originalRun; Quests.tick = originalTick; Settings.difficulty = 1;
  }

  // 같은 육성 조건으로 스타터마다 100회. 공격·지휘만 사용하고 아이템은 쓰지 않는다.
  Game.flags = {};
  const results = [];
  for (const starter of ['leprechaun', 'gnome', 'harpy']) {
    let wins = 0, turns = 0;
    for (let i = 0; i < 100; i++) {
      const team = [mon(starter, 12), mon('brownie', 10), mon('sylphid', 10)];
      const foes = TRAINERS.gamma.team.map(([k,l]) => mon(k,l,false));
      const r = await fight(team, foes); if (r.result === 'win') wins++; turns += r.turns;
    }
    results.push({ starter, wins, battles: 100, averageTurns: +(turns / 100).toFixed(1) });
    assert.ok(wins >= 65, starter + ' 첫 관장 승률 ' + wins);
  }
  // 전역 상성·AI 조정 후 중후반 관장의 전투가 멈추거나 과도하게 늘어지는지 검사한다.
  const league = [];
  for (const id of ['beta', 'delta', 'zeta', 'epsilon', 'alpha', 'omega']) {
    const level = Math.max(...TRAINERS[id].team.map(x => x[1])) + 1;
    let wins = 0, turns = 0;
    for (let i = 0; i < 20; i++) {
      const team = ['leprechaun', 'gnome', 'harpy', 'nymph', 'spriggan', 'impet'].map(k => mon(k, level));
      const r = await fight(team, TRAINERS[id].team.map(([k,l]) => mon(k,l,false)), true);
      if (r.result === 'win') wins++; turns += r.turns;
    }
    league.push({ id, level, wins, battles: 20, averageTurns: +(turns / 20).toFixed(1) });
    assert.ok(wins >= 10, id + ' 교체·회복 활용 승률 ' + wins);
  }
  console.log(JSON.stringify({ expandedLearnsets: signatures.size, gamma: results, league }, null, 2));
  console.log('PASS: 데이터, AI, 기술 효과, 경험치, 패배 비용, 세이브, 후반 스토리, 난이도, 관장 420전');
}
test();
`;
Promise.resolve(run(tests, 'balance checks')).catch(error => { console.error(error); process.exitCode = 1; });
