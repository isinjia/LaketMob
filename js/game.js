// =====================================================================
//  라스트 로이드 - 게임 상태 / 스크립트 / 씬 / 메인 루프
// =====================================================================

// ---------------------------------------------------------------------
//  유닛
// ---------------------------------------------------------------------
function autoRank(base, lv) {
  let i = RANKS.indexOf(base);
  while (i < 3 && lv >= PROMOTE_LV[RANKS[i]]) i++;
  return RANKS[i];
}
class Mon {
  constructor(key, level, o = {}) {
    this.key = key; this.level = level;
    if (o.load) return;
    const sp = SPECIES[key];
    this.ivs = Array.from({ length: 4 }, () => randi(o.trainer ? 6 : 0, 15));
    // 승급은 사령관의 유닛만 한다(포켓몬의 진화처럼). 야생·지휘관 유닛은 기본 랭크로 등장하고, 영입하면 이후 레벨업 때 승급한다
    this.rank = sp.rank;
    this.exp = expForLevel(level);
    this.status = null;
    const learned = sp.moves.filter(([l]) => l <= level).map(([, id]) => id);
    const uniq = [...new Set(learned)].slice(-4);
    this.moves = uniq.map(id => ({ id, pp: MOVES[id].pp }));
    this.recalc();
    this.hp = this.maxHp;
  }
  get species() { return SPECIES[this.key]; }
  // 스킨 진화 형태 (0 = 기본)
  get formData() { const f = (typeof FORMS !== 'undefined') && FORMS[this.key]; return f && this.form ? f.forms[this.form - 1] : null; }
  get artKey() { return this.form ? this.key + '_' + this.form : this.key; }
  get iconKey() { const f = this.formData; return f && f.icon ? this.artKey : this.key; }
  get voiceKey() { const f = this.formData; return f && f.voice ? this.artKey : this.key; }
  canEvolve() { const f = (typeof FORMS !== 'undefined') && FORMS[this.key]; const k = this.form || 0; return !!(f && k < f.forms.length && this.level >= EVOLVE_LV[Math.min(k, EVOLVE_LV.length - 1)]); }
  canPromote() { return !!(PROMOTE_LV[this.rank] && this.level >= PROMOTE_LV[this.rank]); }
  hasDam() { const F = (typeof FORMS !== 'undefined') && FORMS[this.key]; if (!F) return false; return this.form ? !!(this.formData && this.formData.dam) : !!F.dam; }
  // 현재 HP에 맞는 전신 일러스트 (HP 20% 미만이면 중파)
  artName(dmg) {
    const low = dmg !== false && this.hp > 0 && this.hp < this.maxHp * 0.2 && this.hasDam();
    const name = this.artKey + (low ? '_dam' : '');
    if (lazyImg('full', name)) return name;
    if (lazyImg('full', this.artKey)) return this.artKey;
    return this.key;
  }
  art(dmg) { return IMG.full[this.artName(dmg)]; }
  get name() { return this.species.name; }
  get types() { return this.species.types; }
  get kind() { return this.species.kind; }
  recalc() {
    const b = this.species.base;
    this.maxHp = calcStat(b[0], this.level, this.ivs[0], this.rank, true);
    this.atk = calcStat(b[1], this.level, this.ivs[1], this.rank);
    this.def = calcStat(b[2], this.level, this.ivs[2], this.rank);
    this.spd = calcStat(b[3], this.level, this.ivs[3], this.rank);
  }
  expRatio() { const a = expForLevel(this.level), b = expForLevel(this.level + 1); return clamp((this.exp - a) / (b - a), 0, 1); }
  heal() { this.hp = this.maxHp; this.status = null; this.moves.forEach(m => m.pp = MOVES[m.id].pp); }
  toJSON() { return { key: this.key, level: this.level, exp: this.exp, ivs: this.ivs, rank: this.rank, hp: this.hp, status: this.status, moves: this.moves, ot: this.ot, form: this.form || 0 }; }
  static from(o) { const m = new Mon(o.key, o.level, { load: true }); Object.assign(m, o); m.recalc(); m.hp = Math.min(m.hp, m.maxHp); return m; }
}

// ---------------------------------------------------------------------
//  게임 상태
// ---------------------------------------------------------------------
const SAVE_KEY = 'racketmon_save_v1';
const GAME_VERSION = 'v0.56';
const Game = {
  party: [], box: [], bag: {}, money: 3000, dex: { seen: {}, caught: {} }, flags: {}, badges: [], stats: {}, taken: {}, quests: {},
  map: 'lab', px: 6, py: 6, dir: 'up', playTime: 0, lastHeal: ['center1', 7, 7, 'up'], pendingPromote: new Set(),
  reset() {
    this.party = []; this.box = []; this.bag = {}; this.money = 3000; this.dex = { seen: {}, caught: {} }; this.flags = {}; this.badges = []; this.stats = {}; this.taken = {}; this.quests = {};
    this.map = 'lab'; this.px = 6; this.py = 6; this.dir = 'up'; this.playTime = 0; this.lastHeal = ['home', 5, 5, 'down']; this.pendingPromote = new Set();
  },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  save() {
    const d = { party: this.party, box: this.box, bag: this.bag, money: this.money, dex: this.dex, flags: this.flags, badges: this.badges, stats: this.stats, taken: this.taken, quests: this.quests,
      map: World.id, px: World.player.x, py: World.player.y, dir: World.player.dir, playTime: this.playTime, lastHeal: this.lastHeal, savedAt: Date.now() };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); return true; } catch (e) { console.warn(e); return false; }
  },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d || !Array.isArray(d.party)) return false;
      // 알 수 없는 유닛·기술은 버리고, 맵이 없으면 마지막 회복 지점(또는 기지)으로 돌린다
      // 유닛: 알 수 없는 종은 버리고, 레벨·개체값·경험치·랭크·HP·기술·PP·형태를 범위 안으로 정리한다
      const okMon = o => o && typeof o === 'object' && SPECIES[o.key];
      const fix = o => {
        const level = clamp(Math.floor(+o.level) || 1, 1, 100);
        const ref = new Mon(o.key, level);
        const ivs = Array.isArray(o.ivs) && o.ivs.length === 4 && o.ivs.every(v => Number.isFinite(+v)) ? o.ivs.map(v => clamp(Math.floor(+v), 0, 15)) : ref.ivs;
        const moves = (Array.isArray(o.moves) ? o.moves : []).filter(x => x && MOVES[x.id]).slice(0, 4).map(x => ({ id: x.id, pp: Number.isFinite(+x.pp) && x.pp !== null && x.pp !== '' ? clamp(Math.floor(+x.pp), 0, MOVES[x.id].pp) : MOVES[x.id].pp }));
        const F = typeof FORMS !== 'undefined' && FORMS[o.key];
        const m = Mon.from({
          key: o.key, level, ivs, exp: Math.max(expForLevel(level), Math.floor(+o.exp) || 0),
          rank: RANKS.includes(o.rank) ? o.rank : ref.rank, hp: Number.isFinite(+o.hp) ? Math.max(0, Math.floor(+o.hp)) : Infinity,
          status: STATUS[o.status] ? o.status : null, moves: moves.length ? moves : ref.moves,
          ot: typeof o.ot === 'string' ? o.ot : undefined, form: F ? clamp(Math.floor(+o.form) || 0, 0, F.forms.length) : 0,
        });
        return m;
      };
      const all = d.party.filter(okMon).map(fix), box = (Array.isArray(d.box) ? d.box : []).filter(okMon).map(fix);
      const party = all.slice(0, 6); box.unshift(...all.slice(6)); // 출격 부대는 최대 6명, 넘치면 격납고로
      if (!party.length) return false;
      this.reset();
      // 항목마다 형식을 확인하고, 맞지 않으면 기본값을 쓴다
      const obj = v => v && typeof v === 'object' && !Array.isArray(v);
      const num = (v, def) => Number.isFinite(+v) && v !== '' && v !== true ? +v : def;
      const intMap = v => { const o = {}; if (obj(v)) for (const [k, n] of Object.entries(v)) if (Number.isFinite(+n)) o[k] = Math.max(0, Math.floor(+n)); return o; };
      const flagMap = v => { const o = {}; if (obj(v)) for (const [k, f] of Object.entries(v)) if (f) o[k] = typeof f === 'number' ? f : 1; return o; };
      const DIRS4 = ['up', 'down', 'left', 'right'];
      const okHeal = h => Array.isArray(h) && MAPS[h[0]] && Number.isInteger(h[1]) && Number.isInteger(h[2]) && DIRS4.includes(h[3]);
      this.bag = Object.fromEntries(Object.entries(intMap(d.bag)).filter(([k]) => ITEMS[k]));
      this.money = Math.max(0, Math.floor(num(d.money, 3000)));
      this.dex = { seen: obj(d.dex) ? flagMap(d.dex.seen) : {}, caught: obj(d.dex) ? flagMap(d.dex.caught) : {} };
      this.flags = flagMap(d.flags);
      this.badges = Array.isArray(d.badges) ? [...new Set(d.badges.filter(b => BADGES.some(x => x.id === b)))] : [];
      this.stats = intMap(d.stats);
      this.taken = flagMap(d.taken);
      this.quests = window.Quests ? Quests.sanitize(d.quests) : {};
      this.playTime = Math.max(0, num(d.playTime, 0));
      if (okHeal(d.lastHeal)) this.lastHeal = d.lastHeal;
      if (MAPS[d.map] && Number.isInteger(d.px) && Number.isInteger(d.py)) { this.map = d.map; this.px = d.px; this.py = d.py; this.dir = DIRS4.includes(d.dir) ? d.dir : 'down'; }
      else [this.map, this.px, this.py, this.dir] = okHeal(d.lastHeal) ? d.lastHeal : ['base', 6, 9, 'down'];
      this.party = party; this.box = box;
      this.pendingPromote = new Set();
      return true;
    } catch (e) { console.warn(e); return false; }
  },
  saveInfo() {
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d; } catch (e) { return null; }
  },
  mapName() { return World.def ? World.def.name : ''; },
  playTimeStr(t = this.playTime) { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60; return h + '시간 ' + String(m).padStart(2, '0') + '분'; },
  markSeen(k) { this.dex.seen[k] = 1; },
  markCaught(k) { this.dex.seen[k] = 1; this.dex.caught[k] = 1; },
  addItem(id, n = 1) { this.bag[id] = (this.bag[id] || 0) + n; },
  addMon(m) { if (this.party.length < 6) { this.party.push(m); return 'party'; } this.box.push(m); return 'box'; },
  healAll() { this.party.forEach(m => m.heal()); },
  canUseItem(id, m) {
    const it = ITEMS[id];
    if (it.kind === 'heal') return m.hp > 0 && (m.hp < m.maxHp || (it.cure && m.status));
    if (it.kind === 'cure') return m.hp > 0 && !!m.status;
    if (it.kind === 'revive') return m.hp <= 0;
    if (it.kind === 'pp') return m.moves.some(x => x.pp < MOVES[x.id].pp);
    return false;
  },
  applyItem(id, m) {
    const it = ITEMS[id];
    if (it.kind === 'heal') { const before = m.hp; m.hp = Math.min(m.maxHp, m.hp + it.heal); if (it.cure) m.status = null; return J(m.name, '의') + ' HP가 ' + (m.hp - before) + ' 회복되었다!'; }
    if (it.kind === 'cure') { m.status = null; return J(m.name, '의') + ' 상태이상이 치료되었다!'; }
    if (it.kind === 'revive') { m.hp = Math.floor(m.maxHp / 2); return J(m.name, '이') + ' 재기동되었다!'; }
    if (it.kind === 'pp') { m.moves.forEach(x => x.pp = Math.min(MOVES[x.id].pp, x.pp + 10)); return J(m.name, '의') + ' 기술 PP가 회복되었다!'; }
    return '';
  },
  async useItemField(id, m) {
    if (!this.canUseItem(id, m)) { Audio2.bump(); await say('지금은 사용해도 효과가 없다.'); return; }
    this.bag[id]--;
    Audio2.sfx('heal', 0.7);
    await say(this.applyItem(id, m));
  },
  // 레벨 도달 시 기술 습득
  async learnMovesAt(m, lv) {
    for (const [l, id] of m.species.moves) {
      if (l !== lv || m.moves.some(x => x.id === id)) continue;
      const mv = MOVES[id];
      if (m.moves.length < 4) {
        m.moves.push({ id, pp: mv.pp });
        Audio2.jingle([784, 988, 1175, 1568], 0.09, 'square', 0.06);
        await say(J(m.name, '은') + ' 새로 ' + J(mv.name, '을') + ' 배웠다!');
        continue;
      }
      await say(J(m.name, '은') + ' ' + J(mv.name, '을') + ' 배우려 하고 있다. 하지만 기술은 4개까지만 기억할 수 있다.');
      const c = await ask('다른 기술을 잊게 하고 ' + J(mv.name, '을') + ' 배우게 할까?', ['잊게 한다', '배우지 않는다']);
      if (c === 0) {
        const k = await UI.push(new MoveForgetScreen(m, id));
        if (k >= 0 && k < 4) {
          const old = MOVES[m.moves[k].id].name;
          m.moves[k] = { id, pp: mv.pp };
          await say('1, 2의... 짠! ' + J(m.name, '은') + ' ' + J(old, '을') + ' 깨끗이 잊었다!');
          Audio2.jingle([784, 988, 1175, 1568], 0.09, 'square', 0.06);
          await say('그리고 새로 ' + J(mv.name, '을') + ' 배웠다!');
          continue;
        }
      }
      await say(J(m.name, '은') + ' ' + J(mv.name, '을') + ' 배우지 않았다.');
    }
  },
};

// 기술 잊기 화면
class MoveForgetScreen {
  constructor(m, newId) { this.m = m; this.newId = newId; this.nav = new ListNav(5); }
  update(dt) {
    const r = this.nav.update(dt);
    if (r === 'a') { Audio2.select(); UI.close(this, this.nav.i === 4 ? -1 : this.nav.i); }
    if (r === 'b') { Audio2.cancel(); UI.close(this, -1); }
  }
  draw() {
    screenBG('어떤 기술을 잊게 할까?', this.m.name + '  Lv.' + this.m.level);
    drawFit(this.m.art(), 560, 70, 380, 540, { anchor: 'bottom', alpha: 0.9 });
    this.nav.beginDraw();
    const list = [...this.m.moves.map(x => x.id), this.newId];
    list.forEach((id, i) => {
      const d = MOVES[id], y = 84 + i * 84 + (i === 4 ? 16 : 0), on = i === this.nav.i;
      this.nav.rect(i, 30, y, 500, 74);
      panel(30, y, 500, 74, { c: 10, accent: i === 4 ? UI_COL.accent : on ? UI_COL.line : 'rgba(56,225,255,0.3)', top: on ? 'rgba(25,60,96,0.96)' : undefined });
      typeBadge(d.type, 46, y + 14, 60, 22, 13);
      txt(d.name, 120, y + 33, { size: 22, weight: 800 });
      txt(d.cat === 'atk' ? '위력 ' + d.pow + ' / 명중 ' + d.acc : '변화 기술', 120, y + 60, { size: 15, color: UI_COL.sub });
      txt('PP ' + d.pp, 510, y + 33, { size: 17, align: 'right', weight: 700 });
      if (i === 4) txt('NEW', 510, y + 60, { size: 15, align: 'right', weight: 900, color: UI_COL.accent });
    });
    const d = MOVES[list[this.nav.i]];
    helpLine(d.desc);
  }
}

// ---------------------------------------------------------------------
//  화면 전환
// ---------------------------------------------------------------------
const Trans = {
  a: 0, active: false, mode: 'fade', t: 0,
  fade(to, ms) { this.mode = 'fade'; this.active = true; return tween(this, { a: to }, ms).then(() => { this.active = to > 0 && this.a > 0 ? true : false; if (to === 0) this.active = false; }); },
  async battleIn() {
    this.mode = 'battle'; this.active = true; this.t = 0; this.a = 0;
    await tween(this, { t: 1 }, 900, Ease.inQuad);
    this.mode = 'fade'; this.a = 1;
  },
  draw() {
    if (this.mode === 'battle' && this.active) {
      const t = this.t;
      ctx.save();
      // 번쩍임 2회 후 사선 셔터
      if (t < 0.3) { ctx.globalAlpha = Math.sin(t / 0.3 * Math.PI * 2) > 0 ? 0.7 : 0; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      else {
        const k = (t - 0.3) / 0.7;
        ctx.fillStyle = '#05070d';
        const n = 12;
        for (let i = 0; i < n; i++) {
          const y = i * H / n, w = W * Ease.inOutQuad(clamp(k * 1.4 - (i % 2 ? 0 : 0.2), 0, 1));
          if (i % 2) ctx.fillRect(W - w, y, w, H / n + 1); else ctx.fillRect(0, y, w, H / n + 1);
        }
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, k * 600, 0, 7); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (this.a > 0) { ctx.save(); ctx.globalAlpha = this.a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  },
};

// ---------------------------------------------------------------------
//  씬 관리
// ---------------------------------------------------------------------
let Scene = null;
async function startBattle(o) {
  if (!Game.party.some(m => m.hp > 0)) { Game.healAll(); }
  // 난이도: 상대 레벨 보정 (쉬움 -3 / 보통 0 / 어려움 +3). 보정한 레벨에 맞는 기술을 다시 배운다.
  // 흑막전(copyOf)은 league.js pre_mpzeta 에서 난이도를 따로 반영하므로 여기서는 건너뛴다
  const adj = [-3, 0, 3][Settings.difficulty] || 0;
  if (adj && o.foes && !(o.trainer && o.trainer.copyOf)) for (const f of o.foes) {
    f.level = clamp(f.level + adj, 1, 100); f.exp = expForLevel(f.level);
    f.moves = new Mon(f.key, f.level, { trainer: true }).moves;
    f.recalc(); f.hp = f.maxHp;
  }
  const wasLocked = World.locked; World.locked = true;
  Audio2.sfx('encounter', 0.8);
  if (o.kind === 'trainer' || o.legend) Audio2.bgm(o.bgm || 'trainer', { fadeIn: 100 });
  else Audio2.bgm('wild', { fadeIn: 100 });
  Audio2.ambient(null);
  await Trans.battleIn();
  const b = new Battle(o);
  Scene = b;
  await Trans.fade(0, 300);
  let res = 'run', crashed = false;
  try { res = await b.run(); }
  catch (e) { console.error(e); crashed = true; res = Game.party.some(m => m.hp > 0) ? 'run' : 'lose'; UI.stack.length = 0; }
  await Trans.fade(1, 450);
  Particles.clear();
  if (LOW_MEM && window.BFX) try { BFX.trim(); } catch (e) { console.warn(e); }
  Scene = World;
  if (res === 'lose') {
    Game.healAll();
    const [m, x, y, d] = Game.lastHeal;
    World.load(m, x, y, d);
    await Trans.fade(0, 500);
    await say('사령관은 서둘러 부대를 이끌고 마지막으로 들렀던 수복 시설로 돌아왔다...');
    if (MAPS[m].indoor && m.startsWith('center')) await say('많이 다치셨네요... 모두 치료해 두었어요. 무리하지 마세요, 주인님.', { speaker: '다프네', portrait: 'daphne' });
  } else {
    Audio2.bgm(World.bgmKey(), { fadeIn: 600 });
    Audio2.ambient(World.def.amb || null);
    await Trans.fade(0, 400);
  }
  if (crashed) console.error('전투 중 오류로 전투를 중단함');
  if (crashed) await say('(전투 중 문제가 생겨 전투를 중단했습니다. 진행 상황은 그대로 유지됩니다.)');
  await runPromotions();
  World.locked = wasLocked;
  if (window.Quests) Quests.tick();
  return res;
}
async function runPromotions() {
  for (const m of [...Game.pendingPromote]) {
    Game.pendingPromote.delete(m);
    if (!Game.party.includes(m) && !Game.box.includes(m)) continue;
    while (m.canPromote() || m.canEvolve()) await UI.push(new PromotionScreen(m));
  }
}

// 승급 연출 (진화 대용)
class PromotionScreen {
  constructor(m) {
    this.m = m; this.t = 0; this.from = m.rank; this.promote = m.canPromote(); this.to = this.promote ? RANKS[RANKS.indexOf(m.rank) + 1] : m.rank; this.stage = 0;
    this.run();
  }
  async run() {
    Audio2.setDuck(0.3);
    if (this.m.canEvolve()) lazyImg('full', this.m.key + '_' + ((this.m.form || 0) + 1));
    await wait(300);
    await say('어라...? ' + J(this.m.name, '의') + (this.promote ? ' 링크 출력이...!' : ' 모습이...!'), { auto: 1200 });
    this.stage = 1; Audio2.sfx('charge', 0.8);
    for (let i = 0; i < 6; i++) { Audio2.tone(400 + i * 120, 0.25, 'triangle', 0.08); await wait(260 - i * 20); }
    this.stage = 2; Audio2.sfx('levelup', 0.9); Audio2.sfx('shine', 0.8); FX.doFlash('#fff', 1);
    this.evolved = this.m.canEvolve();
    if (this.evolved) { this.m.form = (this.m.form || 0) + 1; lazyImg('full', this.m.artKey); }
    for (let i = 0; i < 60; i++) Particles.add({ x: W / 2, y: H / 2 - 40, vx: rand(-400, 400), vy: rand(-400, 300), size: rand(4, 10), life: rand(0.6, 1.4), color: pick([RANK_COLOR[this.to], '#fff', '#ffe14d']), shape: pick(['star', 'square', 'circle']), rot: 0, vr: 5, add: true, drag: 0.95 });
    const oldMax = this.m.maxHp;
    if (this.promote) { this.m.rank = this.to; this.m.recalc(); this.m.hp += this.m.maxHp - oldMax; }
    Audio2.voice(this.m.voiceKey, this.evolved ? 'join' : 'mvp');
    await wait(600);
    Audio2.jingle([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.07);
    if (this.promote) await say('축하합니다! ' + J(this.m.name, '은') + ' ' + this.to + '랭크로 승급했다!');
    if (this.evolved) { const sn = typeof SKIN_NAMES !== 'undefined' && SKIN_NAMES[this.m.artKey]; await say((this.promote ? '' : '축하합니다! ') + J(this.m.name, '은') + (sn ? ' 「' + sn + '」의 모습으로 진화했다!' : ' 새로운 모습으로 진화했다!')); }
    Audio2.setDuck(1);
    UI.close(this);
  }
  update() { }
  draw() {
    this.t += FRAME_DT;
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    const col = RANK_COLOR[this.stage >= 2 ? this.to : this.from];
    // 방사 광선
    ctx.translate(W / 2, H / 2 - 40);
    ctx.rotate(this.t * 0.4);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? col + '22' : col + '11'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(700, -60); ctx.lineTo(700, 60); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    const pulse = this.stage === 1 ? 0.5 + 0.5 * Math.sin(this.t * (8 + this.t * 6)) : 0;
    ctx.save();
    if (this.stage === 1) ctx.filter = 'brightness(' + (1 + pulse * 3) + ')';
    if (this.m.form && this.stage >= 2) { lazyImg('full', this.m.artKey); }
    drawFit(this.m.art(false), W / 2 - 220, 40, 440, 430, { anchor: 'bottom' });
    ctx.restore();
    Particles.draw();
    rankBadge(this.stage >= 2 ? this.to : this.from, W / 2 - 30, 22, 60);
  }
}

// ---------------------------------------------------------------------
//  이벤트 스크립트
// ---------------------------------------------------------------------
// 콘스탄챠·라비아타 대사, 관장 전후 연출은 league.js, 전설 조우는 quests.js 에서 정의한다
const Scripts = {
  async gate(tr) {
    if (Game.flags.gotStarter) return;
    const p = World.player;
    const c = World.ents.find(x => x.o.id === 'constantia');
    if (c) c.dir = 'right';
    Audio2.exclaim(); if (c) c.exclaim = 0.9;
    await wait(400);
    await say('잠깐만요, 주인님! 혼자 밖으로 나가시면 위험해요! 먼저 연구소의 라비아타 언니를 만나 주세요.', { speaker: '콘스탄챠', portrait: 'constantia' });
    World.startMove(p.x, p.y + 1); p.dir = 'down';
    await wait(300);
  },
  async starter(e) {
    const sp = SPECIES[e.o.sp];
    Audio2.sfx('shine', 0.6);
    UI.push(new StarterPreview(sp));
    Audio2.voice(sp.key, 'start');
    const c = await ask(TYPES[sp.types[0]].name + '형 바이오로이드 ' + sp.name + '. ' + J(sp.name, '으로') + ' 결정하시겠어요?', ['결정한다', '다시 생각한다'], { speaker: '라비아타' });
    UI.close(UI.stack.find(w => w instanceof StarterPreview));
    if (c !== 0) return;
    await this.joinStarter(sp);
    const o = { speaker: '라비아타', portrait: 'labiata' };
    Audio2.voice('labiata', 'talk');
    await say('좋은 선택이에요! 그 아이라면 분명 사령관님을 지켜 줄 거예요.', o);
    await this.starterGifts(o);
  },
  async joinStarter(sp) {
    const m = new Mon(sp.key, 6, { trainer: true });
    m.ot = '사령관';
    Game.addMon(m); Game.markCaught(sp.key);
    Game.flags.gotStarter = 1; Game.flags.hasDex = 1;
    Audio2.voice(sp.key, 'join');
    Audio2.jingle([659, 784, 988, 1319, 0, 988, 1319], 0.12, 'square', 0.07);
    await say(J(sp.name, '이') + ' 사령관의 부대에 합류했다!');
  },
  // 링크 코어를 고르지 않고 연구소를 나가려 하면 라비아타가 전설 유닛 램파리온을 맡긴다
  async labExit() {
    const o = { speaker: '라비아타', portrait: 'labiata' };
    const lab = World.ents.find(x => x.o.id === 'labiata');
    if (lab) { lab.exclaim = 0.9; lab.dir = 'down'; }
    Audio2.exclaim();
    await wait(400);
    Audio2.voice('labiata', 'talk');
    await say('사령관님, 잠깐만요! 빈손으로 나가시면 위험해요.', o);
    await say('...링크 코어 셋 중에 마음에 드는 아이가 없으셨나요? 후훗, 괜찮아요.', o);
    await say('그럼 제가 아껴 두던 아이를 맡길게요. 램파트의 전투 데이터로 깨어난 용자 로봇, 램파리온이에요.', o);
    const sp = SPECIES.lamparion;
    Audio2.sfx('shine', 0.6);
    UI.push(new StarterPreview(sp));
    Audio2.voice(sp.key, 'start');
    await say('조금 시끄럽지만 정의감만큼은 누구에게도 지지 않아요. 제가 있으니까 너무 걱정 마세요.', o);
    UI.close(UI.stack.find(w => w instanceof StarterPreview));
    await this.joinStarter(sp);
    await this.starterGifts(o);
  },
  async starterGifts(o) {
    await say('이건 제 선물이에요. 바이오로이드 도감과 링크 코어, 수복 키트, 그리고 전술 귀환 장치예요.', o);
    Audio2.sfx('item_get', 0.8);
    Game.addItem('core', 30); Game.addItem('kit', 3); Game.flags.warpKit = 1;
    await say('사령관은 바이오로이드 도감, 링크 코어 ×30, 수복 키트 ×3, 전술 귀환 장치를 받았다!');
    await say('귀환 장치가 있으면 메뉴의 「지도」에서 한 번 가 본 마을로 언제든 순간이동할 수 있어요.', o);
    await say('도감은 메뉴(X 키)에서 볼 수 있어요. 수풀에서 만난 바이오로이드는 자동으로 기록된답니다.', o);
    await say('레모네이드 일곱 자매가 관장 협회를 열었어요. 첫 관장 감마 씨는 경장·기동·중장 부대를 차례로 내보낸대요.', o);
    await say('1번 폐도로에서 브라우니는 기동에, 실피드는 중장에 강해요. 서로 다른 병종을 영입하면 첫 부대원의 약점을 메울 수 있어요.', o);
    await say('물리 기술은 모든 타입에 보통 피해를 줘요. 불리한 상성에선 사격이나 연속 사격도 써 보세요.', o);
    await say('공고문도 좋지만, 폭주한 아이들을 진정시키는 일도 부탁드려요. 첫 배지 전에는 패배해도 자원을 잃지 않으니 부담 없이 도전하세요.', o);
    Game.save();
  },
  async nurse(e) {
    const o = { speaker: '다프네', portrait: 'daphne' };
    Audio2.voice('daphne', 'talk', 0.8);
    const c = await ask('아, 주인님... 어서 오세요. 부대원들을 쉬게 해 드릴까요?', ['부탁해요', '괜찮아요'], o);
    if (c !== 0) { await say('그럼... 언제든 다시 들러 주세요, 주인님.', o); return; }
    await say('그럼 잠시만... 맡아 둘게요.', Object.assign({ auto: 700 }, o));
    Audio2.setDuck(0.2);
    const notes = [659, 784, 988, 784, 1047, 1319];
    for (let i = 0; i < Game.party.length; i++) { Audio2.tone(880, 0.08, 'square', 0.05); await wait(180); }
    Audio2.sfx('heal', 0.8); Audio2.jingle(notes, 0.14, 'triangle', 0.09);
    await wait(1100);
    Audio2.setDuck(1);
    Game.healAll();
    Game.lastHeal = [World.id, 7, 5, 'up'];
    await say('기다리셨죠? 모두 건강해졌어요... 주인님도 너무 무리하지 마세요.', o);
  },
  async shop(e) {
    const o = { speaker: e.o.name, portrait: e.o.sprite };
    Audio2.voice(e.o.sprite, 'talk', 0.8);
    await say('오셨습니까, 주인님. 무엇이 필요하십니까?', o);
    let stock = e.o.stock;
    if (World.id === 'shop1' && Game.badges.length) stock = ['core', 'core2', 'kit', 'kit2', 'chip', 'revive'];
    if (World.id === 'shop1' && Game.badges.length >= 2) stock = ITEM_ORDER.filter(k => k !== 'core3');
    await UI.push(new ShopScreen(stock, { name: e.o.name, portrait: e.o.sprite, title: World.def.name }));
    await say('또 오십시오, 주인님. ...다음엔 쓸데없는 걸 사지 않으시길 바랍니다.', o);
  },
  async merlin(e) {
    const o = { speaker: '멀린', portrait: 'merlin' };
    Audio2.voice('merlin', 'talk', 0.8);
    if (!Game.flags.merlinGift) {
      await say('오호, 당신이 소문의 사령관? 숲 지나오느라 고생했겠네. 마법... 아니, 과학의 선물을 줄게!', o);
      Game.addItem('cell', 2); Game.addItem('core2', 2); Game.flags.merlinGift = 1;
      Audio2.sfx('item_get', 0.8);
      await say('사령관은 에너지 셀 ×2, 고급 링크 코어 ×2를 받았다!');
      await say('에너지 셀은 기술 PP를 회복해 줘. 강한 기술은 PP가 적으니까 아껴 써, 사령관.', o);
    } else await say('해안의 폭주 바이오로이드들은 숲과는 차원이 달라. 수복실에서 충분히 정비하고 가.', o);
  },
  async obj_pc(e) { Audio2.sfx('stage_in', 0.6); await say('사령관은 격납고 단말기를 켰다.', { auto: 700 }); await UI.push(new PCScreen()); },
  async obj_healpod(e) {
    const c = await ask('야전 수복 포드다. 부대를 회복시킬까?', ['회복한다', '그만둔다']);
    if (c !== 0) return;
    Audio2.sfx('heal', 0.8); Audio2.jingle([659, 784, 988, 1319], 0.13, 'triangle', 0.08);
    FX.doFlash('#5dff9c', 0.4);
    Game.healAll();
    Game.lastHeal = [World.id, e.x, e.y + 1, 'up'];
    await wait(500);
    await say('부대원들의 HP와 PP가 모두 회복되었다!');
  },
  async obj_bed(e) {
    const c = await ask('사령관의 침대다. 잠시 쉴까?', ['쉰다', '그만둔다']);
    if (c !== 0) return;
    await Trans.fade(1, 500);
    Audio2.setDuck(0.2); Audio2.jingle([523, 659, 784, 659, 523, 392], 0.22, 'triangle', 0.07);
    await wait(1500);
    Game.healAll(); Game.lastHeal = ['home', 3, 4, 'down'];
    Audio2.setDuck(1);
    await Trans.fade(0, 500);
    await say('푹 쉬었다! 부대원들도 모두 회복되었다.');
  },
};
class BadgeScreen {
  constructor(b) { this.b = b; this.t = 0; Audio2.setDuck(0.25); Audio2.sfx('badge', 0.9); Audio2.jingle([523, 659, 784, 1047, 0, 784, 1047, 1319, 1568], 0.13, 'square', 0.07); }
  update(dt) { this.t += dt; if (this.t > 1.4 && (Input.pressed.a || Input.pressed.b || Input.mouse.click)) { Audio2.setDuck(1); UI.close(this); } }
  draw() {
    ctx.save(); ctx.globalAlpha = Math.min(0.8, this.t * 2); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const s = Ease.outElastic(clamp(this.t / 1.0, 0, 1));
    ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.rotate(this.t * 0.3);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = this.b.color + '22'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(500, -40); ctx.lineTo(500, 40); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    drawBadge(this.b, W / 2, H / 2 - 40, true, 2.4 * s);
    if (this.t > 0.6) {
      txt(J(this.b.name, '을') + ' 손에 넣었다!', W / 2, H / 2 + 150, { size: 32, weight: 900, align: 'center', family: TITLE_FONT });
      txt('레몬 하트 배지 ' + Game.badges.length + ' / ' + BADGES.length, W / 2, H / 2 + 190, { size: 18, align: 'center', color: UI_COL.sub });
    }
    if (this.t > 1.4) txt('Z 키를 눌러 계속', W / 2, H - 30, { size: 15, align: 'center', color: UI_COL.sub });
  }
}
class StarterPreview {
  constructor(sp) { this.sp = sp; this.t = 0; }
  update() { }
  draw() {
    this.t += FRAME_DT;
    const a = Ease.outCubic(clamp(this.t / 0.4, 0, 1));
    ctx.save(); ctx.globalAlpha = 0.65 * a; ctx.fillStyle = '#020610'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const sp = this.sp, col = TYPES[sp.types[0]].color;
    ctx.save(); const g = ctx.createRadialGradient(330, 250, 10, 330, 250, 300); g.addColorStop(0, col + '88'); g.addColorStop(1, 'transparent'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, 700, 480); ctx.restore();
    drawFit(IMG.full[sp.key], 110 - (1 - a) * 80, 20, 440, 450, { anchor: 'bottom', alpha: a });
    panel(590, 60, 340, 380);
    txt(sp.name, 614, 104, { size: 30, weight: 900 });
    sp.types.forEach((t, k) => typeBadge(t, 614 + k * 70, 120, 64, 24, 14));
    txt(sp.faction, 910, 104, { size: 14, align: 'right', color: UI_COL.sub });
    wrapText(sp.desc, 290, 16, 500).forEach((l, k) => txt(l, 614, 180 + k * 26, { size: 16, weight: 500, color: '#cfe6f5' }));
    ['HP', '공격', '방어', '속도'].forEach((n, k) => { txt(n, 614, 318 + k * 28, { size: 15, color: UI_COL.sub }); bar(670, 307 + k * 28, 230 * a, 9, sp.base[k] / 100, ['#ffd76a', '#ff8a1a']); });
  }
}

// ---------------------------------------------------------------------
//  타이틀
// ---------------------------------------------------------------------
class TitleScene {
  constructor() {
    this.t = 0; this.stage = 0; this.nav = null;
    this.cast = ['leprechaun', 'harpy', 'gnome', 'leona', 'alice', 'phoenix', 'miho', 'hongryun', 'valkyrie', 'blacklilith', 'tyrant', 'hraesvelgr'];
    this.ci = 0; this.ct = 0;
    this.bg = IMG.bg.town;
  }
  update(dt) {
    this.t += dt; this.ct += dt;
    if (this.ct > 3.2) { this.ct = 0; this.ci = (this.ci + 1) % this.cast.length; }
    if (UI.busy()) return;
    if (this.stage === 0) {
      if (Input.anyPressed || Input.mouse.click) {
        Audio2.unlock(); Audio2.bgm('title', { fadeIn: 800 }); Audio2.select();
        this.stage = 1; this.opts = Game.hasSave() ? ['이어하기', '새로 시작', '설정'] : ['새로 시작', '설정'];
        this.nav = new ListNav(this.opts.length);
        Input.endFrame();
      }
      return;
    }
    const r = this.nav.update(dt);
    if (r !== 'a') return;
    Audio2.select();
    const k = this.opts[this.nav.i];
    if (k === '설정') UI.push(new SettingsScreen());
    else if (k === '이어하기') continueGame();
    else if (k === '새로 시작') {
      if (Game.hasSave()) ask('저장된 기록이 있습니다. 새로 시작하면 덮어쓰게 됩니다. 계속할까요?', ['새로 시작', '취소']).then(c => { if (c === 0) newGame(); });
      else newGame();
    }
  }
  draw() {
    const t = this.t;
    // 배경
    if (this.bg && !this.bg._bad) { const s = Math.max(W / this.bg.width, H / this.bg.height) * 1.08; ctx.drawImage(this.bg, (W - this.bg.width * s) / 2 + Math.sin(t * 0.1) * 20, (H - this.bg.height * s) / 2, this.bg.width * s, this.bg.height * s); }
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(4,10,24,0.92)'); g.addColorStop(0.55, 'rgba(4,10,24,0.55)'); g.addColorStop(1, 'rgba(4,10,24,0.2)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 캐릭터 순환
    const k = this.cast[this.ci], a = Ease.outCubic(clamp(this.ct / 0.6, 0, 1)) * (this.ct > 2.7 ? 1 - (this.ct - 2.7) / 0.5 : 1);
    ctx.save(); const rg = ctx.createRadialGradient(700, 330, 20, 700, 330, 320); rg.addColorStop(0, TYPES[SPECIES[k].types[0]].color + '55'); rg.addColorStop(1, 'transparent'); ctx.globalAlpha = a; ctx.fillStyle = rg; ctx.fillRect(380, 0, 580, H); ctx.restore();
    drawFit(IMG.full[k], 470 + (1 - a) * 60, 30, 480, 610, { anchor: 'bottom', alpha: a });
    // 로고
    const ly = 170;
    ctx.save();
    ctx.translate(60, ly);
    ctx.font = font(92, 400, TITLE_FONT);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText('라스트 로이드', 6, 8);
    const lg = ctx.createLinearGradient(0, -80, 0, 10); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.5, '#9ff3ff'); lg.addColorStop(1, '#2fb7e6');
    ctx.lineWidth = 10; ctx.strokeStyle = '#08213a'; ctx.lineJoin = 'round'; ctx.strokeText('라스트 로이드', 0, 0);
    ctx.fillStyle = lg; ctx.fillText('라스트 로이드', 0, 0);
    // 반짝임
    const sx = ((t * 260) % 900) - 100;
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(sx, -90); ctx.lineTo(sx + 30, -90); ctx.lineTo(sx - 10, 20); ctx.lineTo(sx - 40, 20); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(64, ly + 40);
    ctx.fillStyle = '#ffb22e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(370, 0); ctx.lineTo(356, 30); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
    txt('LAST ORIGIN  ·  LAST ROID', 14, 22, { size: 17, weight: 900, color: '#1b1205', shadow: false });
    // 버전 표기
    ctx.fillStyle = '#0b1d33'; ctx.beginPath(); ctx.moveTo(366, 0); ctx.lineTo(436, 0); ctx.lineTo(422, 30); ctx.lineTo(352, 30); ctx.closePath(); ctx.fill();
    txt(GAME_VERSION, 392, 22, { size: 16, weight: 900, align: 'center', color: '#9ff3ff', shadow: false });
    ctx.restore();
    txt('마지막 인간, 사령관의 링크 대모험', 66, ly + 104, { size: 20, weight: 700, color: '#cfe6f5' });
    // 메뉴
    if (this.stage === 0) {
      const blink = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save(); ctx.globalAlpha = blink; txt('PRESS ANY KEY', 66, 440, { size: 26, weight: 900, color: '#fff', family: TITLE_FONT }); ctx.restore();
      txt('키보드: 방향키 이동 · Z 결정 · X 취소/메뉴 · Shift 달리기', 66, 476, { size: 14, color: UI_COL.sub });
    } else {
      this.nav.beginDraw();
      this.opts.forEach((o, i) => {
        const y = 380 + i * 58, on = i === this.nav.i;
        this.nav.rect(i, 60, y, 330, 50);
        ctx.save(); ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(390, y); ctx.lineTo(376, y + 50); ctx.lineTo(60, y + 50); ctx.closePath();
        ctx.fillStyle = on ? 'rgba(15,184,222,0.85)' : 'rgba(10,20,40,0.7)'; ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(56,225,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        txt(o, 86, y + 34, { size: 23, weight: 900, color: on ? '#fff' : '#cfe6f5' });
        if (o === '이어하기') { const d = Game.saveInfo(); if (d) txt((MAPS[d.map] ? MAPS[d.map].name : '') + ' · ' + Game.playTimeStr(d.playTime) + ' · 배지 ' + (d.badges || []).length, 376, y + 32, { size: 13, align: 'right', color: on ? '#e8fbff' : UI_COL.sub }); }
      });
    }
    txt('© LAST ORIGIN', W - 14, H - 12, { size: 12, align: 'right', color: 'rgba(200,220,235,0.6)' });
  }
}

// 인트로 내레이션
class IntroScene {
  constructor() {
    this.lines = [
      '서기 2xxx년. 인류는 멸망했다.',
      '정체불명의 기계 생명체 "철충"의 습격으로\n지상의 도시는 모두 폐허가 되었다.',
      '인간을 섬기기 위해 태어난 인조인간 "바이오로이드"들은\n주인을 잃은 채 흩어졌고...',
      '살아남은 바이오로이드들은 저마다의 방식으로 살아가고 있었다.\n그중 레모네이드 일곱 자매는... 관장 협회를 만들었다.',
      '어느 날, 협회 게시판에 공고문 한 장이 붙었다.\n"관장을 이기는 자에게 하룻밤을 허락한다."',
      '그리고 지금—\n긴 동면에서, 마지막 인간이 눈을 뜬다.',
    ];
    this.i = 0; this.t = 0; this.done = false;
    Audio2.bgm('intro', { fadeIn: 1500 });
  }
  update(dt) {
    this.t += dt;
    if ((Input.pressed.a || Input.mouse.click) && this.t > 0.6) { this.next(); }
    else if (Input.pressed.b) { this.i = this.lines.length - 1; this.next(); }
    else if (this.t > 5.5) this.next();
  }
  next() { if (this.done) return; this.i++; this.t = 0; if (this.i >= this.lines.length) { this.done = true; startNewGameWorld(); } }
  draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // 별 / 먼지
    for (let k = 0; k < 60; k++) { const x = (hash2(k, 1) * W + Tick.time * (5 + hash2(k, 2) * 15)) % W, y = hash2(k, 3) * H; ctx.fillStyle = 'rgba(160,220,255,' + (0.2 + 0.3 * hash2(k, 4)) + ')'; ctx.fillRect(x, y, 2, 2); }
    if (this.i >= this.lines.length) return;
    const a = this.t < 0.8 ? this.t / 0.8 : this.t > 4.8 ? Math.max(0, 1 - (this.t - 4.8) / 0.7) : 1;
    ctx.save(); ctx.globalAlpha = a;
    this.lines[this.i].split('\n').forEach((l, k, arr) => txt(l, W / 2, H / 2 - (arr.length - 1) * 22 + k * 44, { size: 26, weight: 600, align: 'center', color: '#e6f4ff' }));
    ctx.restore();
    txt('Z: 다음   X: 건너뛰기', W - 20, H - 20, { size: 14, align: 'right', color: 'rgba(160,190,210,0.6)' });
  }
}

// 엔딩
async function runEnding() {
  World.locked = true;
  await Trans.fade(1, 1200);
  Audio2.ambient(null);
  const sc = new EndingScene();
  Scene = sc;
  await Trans.fade(0, 800);
  await sc.finished;
  await Trans.fade(1, 1000);
  Scene = World;
  Game.healAll();
  World.load('base', 13, 8, 'down');
  await Trans.fade(0, 800);
  const o = { speaker: '라비아타', portrait: 'labiata' };
  await say('사령관님! 무사히 돌아오셨군요...!', o);
  await say('리조트 지하의 중계핵이 봉쇄됐어요. 제타는 알파의 감독 아래 폭주한 아이들의 복구를 돕고 있어요.', o);
  await say('...그런데 사령관님, 오늘 아침 리조트 식탁 인원이 몇 명이었는지 아세요?', o);
  await say('일곱 자매에, 드라큐리나랑 세크메트까지... 아홉 명이 사령관님 옆자리를 두고 싸웠대요. 후훗.', o);
  await say('...그래서, 도감은요?', o);
  await say('(사령관은 땀을 흘렸다.)');
  await say('후훗, 농담이에요. 가방에 제가 몰래 만들어 둔 특별한 코어를 넣어 두었어요. 전설의 아이들을 만나면 써 보세요.', o);
  Audio2.sfx('item_get', 0.8);
  await say('사령관은 마스터 코어를 받았다!');
  // 메인 퀘스트 마지막 보고는 이 자리에서 라비아타에게 바로 한다
  if (window.Quests) { Quests.tick(); const q9 = Quests.byId.m9; if (Quests.active('m9') && Quests.state('m9').step === q9.steps.length - 1) await Quests.advance(q9); }
  await say('(게임 클리어! 기록이 저장되었습니다. 이제 각지의 지휘관들과 재대결할 수 있고, 퀘스트 일지(메뉴)에서 사이드 스토리와 전설의 바이오로이드 이야기를 이어 갈 수 있습니다.)');
  Game.save();
  World.locked = false;
}
class EndingScene {
  constructor() {
    this.t = 0;
    this.finished = new Promise(r => this.done = r);
    Audio2.bgm('ending', { fadeIn: 1500, restart: true });
    this.cast = Game.party.concat(Game.box).map(m => m.key);
    if (!this.cast.length) this.cast = ['leprechaun'];
    this.credits = [
      ['라스트 로이드', 'LAST ROID'],
      ['주인공', '사령관'],
      ['함께 싸운 부대원', Game.party.map(m => m.name).join(' · ')],
      ['쓰러뜨린 유닛', (Game.stats.knockouts || 0) + ' 기'],
      ['영입한 바이오로이드', DEX_LIST.filter(s => Game.dex.caught[s.key]).length + ' 명'],
      ['플레이 시간', Game.playTimeStr()],
      ['캐릭터 · 일러스트 · 음악', 'LAST ORIGIN 에셋'],
      ['THE END', '— 그리고 사령관의 이야기는 계속된다 —'],
    ];
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.credits.length * 4.2 + 2 || (this.t > 3 && Input.pressed.b)) { if (this.done) { this.done(); this.done = null; } }
  }
  draw() {
    const t = this.t;
    const bg = IMG.bg.sky; if (bg && !bg._bad) { const s = Math.max(W / bg.width, H / bg.height); ctx.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s); }
    ctx.fillStyle = 'rgba(4,10,24,0.45)'; ctx.fillRect(0, 0, W, H);
    // 캐릭터 행렬
    const n = this.cast.length;
    for (let i = 0; i < n; i++) {
      const k = this.cast[i];
      const x = ((i * 220 - t * 60) % (n * 220)) + (n * 220 > W ? 0 : 0);
      const xx = ((x % (Math.max(n, 5) * 220)) + Math.max(n, 5) * 220) % (Math.max(n, 5) * 220) - 200;
      drawFit(IMG.full[k], xx, 300, 240, 340, { anchor: 'bottom', alpha: 0.9 });
    }
    const idx = Math.min(this.credits.length - 1, Math.floor(t / 4.2));
    const lt = t - idx * 4.2;
    const a = lt < 0.8 ? lt / 0.8 : lt > 3.4 ? Math.max(0, 1 - (lt - 3.4) / 0.8) : 1;
    const [h, s] = this.credits[idx];
    ctx.save(); ctx.globalAlpha = idx === this.credits.length - 1 ? Math.min(1, lt / 0.8) : a;
    txt(h, W / 2, 170, { size: idx === 0 || idx === this.credits.length - 1 ? 64 : 28, weight: 400, align: 'center', family: TITLE_FONT, color: '#fff', stroke: 8, strokeColor: '#08213a' });
    wrapText(s, 800, 22, 700).forEach((l, k) => txt(l, W / 2, 230 + k * 32, { size: 22, weight: 700, align: 'center', color: '#cfefff', stroke: 5, strokeColor: '#08213a', shadow: false }));
    ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  시작 / 이어하기
// ---------------------------------------------------------------------
function newGame() {
  if (Scene instanceof IntroScene) return;
  Game.reset();
  Scene = new IntroScene();
}
async function startNewGameWorld() {
  await Trans.fade(1, 600);
  Scene = World;
  World.load('lab', 6, 6, 'up');
  World.locked = true;
  await Trans.fade(0, 1200);
  const o = { speaker: '???', portrait: 'labiata' };
  await say('...님. ...령관님.', Object.assign({}, o, { portrait: null }));
  Audio2.voice('labiata', 'talk');
  await say('사령관님! 정신이 드셨군요...!', o);
  o.speaker = '라비아타';
  await say('저는 라비아타. 바이오로이드들의 맏언니이자, 지금은 이 오르카 캠프를 관리하고 있어요.', o);
  await say('긴 동면에서 깨어나신 직후라 혼란스러우시겠지만... 너무 걱정 마세요. 제가 있으니까요.', o);
  await say('그런데 사령관님... 일어나시자마자 게시판의 그 공고문부터 보셨다면서요?', o);
  await say('"레모네이드 관장 일곱 명을 이기는 자에게 하룻밤을 허락한다"... 후훗, 눈빛이 달라지셨네요.', o);
  await say('...목적은 묻지 않을게요. 대신 폭주한 아이들을 링크로 되돌리는 일, 도감 채우는 일도 꼭 해 주세요.', o);
  await say('우선 함께 싸워 줄 첫 번째 부대원을 골라 주세요. 바로 앞 테이블 위의 링크 코어 중 하나를요.', o);
  Game.flags.introDone = 1;
  World.locked = false;
}
async function continueGame() {
  if (continueGame.busy) return; continueGame.busy = true;
  if (!Game.load()) { continueGame.busy = false; await say('저장 데이터를 불러오지 못했습니다.'); return; }
  if (Game.flags.beat_mpzeta && !Game.flags.cleared) { Game.flags.cleared = 1; Game.addItem('core3', 1); }
  await Trans.fade(1, 500);
  const title = Scene;
  try {
    Scene = World;
    World.load(Game.map, Game.px, Game.py, Game.dir);
  } catch (e) {
    // 저장 위치가 깨졌으면 기지로 옮겨서라도 이어간다
    console.warn(e);
    try { World.load('base', 6, 9, 'down'); } catch (e2) { console.error(e2); Scene = title; await Trans.fade(0, 400); continueGame.busy = false; await say('저장 데이터를 불러오지 못했습니다.'); return; }
  }
  Game.flags.hintSeen = 1;
  // 승급·진화 조건을 이미 넘긴 채 저장된 유닛은 이어하기 직후 처리한다
  for (const m of [...Game.party, ...Game.box]) if (m.canPromote() || m.canEvolve()) Game.pendingPromote.add(m);
  continueGame.busy = false;
  await Trans.fade(0, 600);
  if (Game.pendingPromote.size) { World.locked = true; try { await runPromotions(); } finally { World.locked = false; } }
}

async function returnToTitle() {
  await Trans.fade(1, 500);
  UI.stack.length = 0;
  World.locked = false;
  Audio2.ambient(null);
  Audio2.stopBgm(400);
  Scene = new TitleScene();
  Input.clear();
  await Trans.fade(0, 500);
}

// ---------------------------------------------------------------------
//  로딩 화면 & 메인 루프
// ---------------------------------------------------------------------
class LoadingScene {
  constructor() { this.p = 0; }
  update() { }
  draw() {
    ctx.fillStyle = '#050913'; ctx.fillRect(0, 0, W, H);
    txt('라스트 로이드', W / 2, H / 2 - 30, { size: 48, align: 'center', family: TITLE_FONT, color: '#9ff3ff' });
    bar(W / 2 - 200, H / 2 + 10, 400, 10, this.p, ['#7ce8ff', '#1a9fd0']);
    txt('에셋 불러오는 중... ' + Math.floor(this.p * 100) + '%', W / 2, H / 2 + 50, { size: 16, align: 'center', color: UI_COL.sub });
  }
}
let lastT = 0;
function frame(ts) {
  // 탭이 가려져 있으면 게임을 멈춘다 (돌아왔을 때 시간이 한꺼번에 흐르지 않도록 기준 시각만 갱신)
  if (document.hidden) { lastT = ts; return; }
  const dt = Math.min(0.1, (ts - lastT) / 1000 || 0.016);
  if (ts - lastT < 4) return;
  lastT = ts;
  try { step(dt); } catch (e) { console.error(e); Input.endFrame(); }
}
// 다음 프레임을 먼저 예약해 두어, 한 프레임에서 예외가 나도 루프가 끊기지 않게 한다
function rafLoop() { requestAnimationFrame(rafLoop); frame(performance.now()); }
// rAF가 멈추는 환경(비활성 미리보기 등) 대비 백업 타이머
setInterval(() => { if (performance.now() - lastT > 90) frame(performance.now()); }, 33);
let FRAME_DT = 1 / 60;
// 테스트용 게임 속도 배율 (?speed=N, 기본 1)
const GAME_SPEED = clamp(+(new URLSearchParams(location.search).get('speed') || 1), 1, 8);
function step(dt) {
  if (window.MobileField) MobileField.sync();
  // 히트스톱: 강한 타격 순간 잠깐 멈춘다
  if (window.HITSTOP > 0) { window.HITSTOP -= dt; dt = 0; }
  dt *= GAME_SPEED;
  FRAME_DT = dt;
  Tick.update(dt);
  FX.update(dt);
  Particles.update(dt);
  if (Scene === World && !UI.busy()) Game.playTime += dt;
  if (Scene && Scene.update && !(UI.busy() && Scene !== World && !(Scene instanceof Battle))) Scene.update(dt);
  UI.update(dt);
  ctx.save();
  if (Scene && Scene.draw) Scene.draw();
  if (Scene === World) Particles.draw();
  if (window.MobileField && MobileField.portrait) MobileField.drawUI(); else UI.draw();
  Trans.draw();
  ctx.restore();
  Input.endFrame();
}
function onResize() { if (World.def) World.buildLayer(); if (window.BFX) BFX.resize(); }
// three.js(CDN)를 비동기로 불러온다. 네트워크가 막혀도 4초 뒤에는 2D 연출로 진행한다
function loadThree(timeout = 4000) {
  if (typeof THREE !== 'undefined') return Promise.resolve(true);
  return new Promise(res => {
    const s = document.createElement('script');
    let done = false; const fin = ok => { if (!done) { done = true; res(ok && typeof THREE !== 'undefined'); } };
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.crossOrigin = 'anonymous'; s.async = true;
    // 타임아웃 뒤에 늦게 도착해도 그때 3D 연출을 켠다 (느린 연결에서도 이펙트를 잃지 않게)
    s.onload = () => { if (done) { try { if (window.__initFX) __initFX(); if (window.SDF && !SDF.ok) SDF.init(); if (window.BFX && !BFX.ok) BFX.init(); } catch (e) { console.warn(e); } } fin(true); };
    s.onerror = () => fin(false);
    document.head.appendChild(s);
    setTimeout(() => fin(false), timeout);
  });
}
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
async function boot() {
  resize();
  setupTouchPad();
  const threeReady = loadThree();
  ['school', 'center', 'shop', 'house', 'gym_gamma', 'gym_beta', 'gym_delta', 'gym_zeta', 'gym_epsilon', 'gym_alpha', 'champion', 'palm1', 'palm2', 'cherry', 'tree1', 'tree2', 'fountain', 'lamp', 'bench', 'barricade', 'ruin1', 'ruin2', 'stop', 'fairytree', 'rock', 'cafe'].forEach(k => lazyImg('bld', k));
  if (typeof ROOMS !== 'undefined') for (const r of Object.values(ROOMS)) { roomImg(r.img); Object.values(r.props).forEach(roomImg); (r.extra || []).forEach(e => roomImg(e[0])); }
  const L = new LoadingScene();
  Scene = L;
  requestAnimationFrame(rafLoop);
  try { await withTimeout(document.fonts.load('40px "Black Han Sans"'), 3000); } catch (e) { }
  await loadAssets(p => L.p = p);
  // 3D 연출(SD 리그·전투 이펙트)은 three.js가 준비됐을 때만 켠다
  // GPU 메모리: 원본 해상도 이펙트 아틀라스는 16장에 약 270MB라 폰에서는 탭이 강제 종료된다.
  // 폰은 미리 만든 절반 크기 아틀라스를 다시 줄여 쓰고(≈1/8), PC도 0.6배로 올린다. SD 아틀라스도 폰은 절반
  if (window.FXB) FXB.texScale = LOW_MEM ? 0.35 : 0.6;
  if (window.SD) SD.texScale = LOW_MEM ? 0.5 : 1;
  // SD 칸 렌더 배율은 화면 배율(SCALE)보다 낮으면 확대돼 흐려진다: 폰(SCALE≤1.6)은 2, 고해상도 PC는 3
  if (window.SDF) SDF.R = LOW_MEM ? 2 : (SCALE > 2 ? 3 : 2);
  if (await threeReady && window.__initFX) window.__initFX();
  if (window.SDF) SDF.init();
  if (window.BFX) BFX.init();
  Scene = new TitleScene();
  // 디버그용 훅
  window.RM = { Game, World, Scripts, startBattle, Mon };
}
// 이벤트·대화 도중(잠금·창 열림)에는 저장하지 않는다. 그때는 마지막 자동 저장(맵 이동 시점)이 남는다
window.addEventListener('beforeunload', () => { if (Scene === World && Game.flags.gotStarter && !World.locked && !UI.busy()) { try { Game.save(); } catch (e) { } } });
boot();
