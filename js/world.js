// =====================================================================
//  라켓몬스터 - 필드(오버월드)
// =====================================================================
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
function hash2(x, y, s = 0) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h = Math.imul(h ^ (h >>> 16), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967295; }

const THEME = {
  town:   { grass: ['#78c25a', '#6db552', '#86cc66'], path: '#dcbc80', pathEdge: '#b8945c', plaza: '#cfc8b8', plazaLine: '#b4ad9c', water: ['#3b93db', '#2f7fc4'], ground: '.' },
  route:  { grass: ['#8dbf58', '#80b24e', '#9acb64'], path: '#d3b37b', pathEdge: '#a98a58', asphalt: '#5f646c', water: ['#3b93db', '#2f7fc4'], ground: '.' },
  forest: { grass: ['#4c9444', '#43883d', '#57a04d'], path: '#b88d5a', pathEdge: '#8e6a40', water: ['#2e86a8', '#236f8f'], ground: '.' },
  coast:  { grass: ['#9db96a', '#91ad5f', '#a8c476'], path: '#cdb17a', pathEdge: '#9f8656', asphalt: '#575b62', water: ['#2f93c4', '#2479a8'], sand: '#ead6a0', ground: '.' },
  snow:   { grass: ['#e6eef5', '#dbe6ef', '#f1f6fa'], path: '#c9d3dc', pathEdge: '#9fb0bf', asphalt: '#6a7480', water: ['#7fc4e8', '#5aa6d0'], ground: '.', snow: 1 },
  factory:{ grass: ['#8c917f', '#7f8473', '#989d8c'], path: '#a3977f', pathEdge: '#6f6656', asphalt: '#565a60', water: ['#4a6a7a', '#3a5664'], ground: '.', concrete: 1 },
  resort: { grass: ['#7fd16a', '#70c45e', '#8edb7a'], path: '#f0d8a8', pathEdge: '#c9a878', plaza: '#f6e9d8', asphalt: '#6a6f78', water: ['#52d6ee', '#2fb4dc'], ground: '.' },
  nest:   { grass: ['#3b2d40', '#34283a', '#423246'], path: '#4a3550', water: ['#3a5a2a', '#2c4a20'], ground: 'N' },
  indoor: { grass: ['#c6d0d9', '#bcc7d1', '#cfd8e0'], path: '#c6d0d9', water: ['#3b93db', '#2f7fc4'], ground: 'M' },
};

// 실내: 원작 오르카 기지 시설 방 일러스트(뒷벽)와 소품
// img: 방 배경, fl: 벽과 바닥이 만나는 높이(px, 원본 1024 기준), floor: 바닥 색, props: 장식 종류 → 소품 스프라이트
const ROOMS = {
  lab:     { img: 'dis1_0', fl: 353, wall: ['#2c5f57', '#4a9a8c'], rug: ['#2f5f78', '#7cc4d8'], floor: ['#d7dcdb', '#ccd2d1', '#9fb3ae'], props: { shelf: 'dis1_12', machine: 'andr2_1' }, extra: [['mk4_1', 6, 1, 1], ['dis1_21', 7, 1, 2]] },
  center1: { img: 'train_0', fl: 365, wall: ['#5d6580', '#a3abc6'], rug: ['#3d4f86', '#9fb8ff'], floor: ['#bcc1d0', '#b1b7c7', '#8a93ab'], props: { healer: 'andr1_1' }, extra: [['iron1_5', 2, 1, 1], ['andr1_6', 7, 1, 1]] },
  center2: { img: 'train_0', fl: 365, wall: ['#5d6580', '#a3abc6'], rug: ['#3d4f86', '#9fb8ff'], floor: ['#bcc1d0', '#b1b7c7', '#8a93ab'], props: { healer: 'andr1_1' }, extra: [['iron1_5', 2, 1, 1], ['andr1_6', 7, 1, 1]] },
  shop1:   { img: 'cafe4_0', fl: 268, floorTint: 'rgba(120,95,70,0.12)', wall: ['#8f877a', '#ece7de'], rug: ['#8a5a3a', '#e8c28a'], floor: ['#eeece8', '#e3e0db', '#c4bfb6'], props: { shelf: 'iron1_6' }, extra: [['cafe5_1', 4, 1, 4]] },
  shop2:   { img: 'cafe4_0', fl: 268, floorTint: 'rgba(120,95,70,0.12)', wall: ['#8f877a', '#ece7de'], rug: ['#8a5a3a', '#e8c28a'], floor: ['#eeece8', '#e3e0db', '#c4bfb6'], props: { shelf: 'iron1_6' }, extra: [['cafe5_1', 4, 1, 4]] },
  home:    { img: 'rein1_0', fl: 358, wall: ['#6b463f', '#b07e72'], rug: ['#6e2f35', '#e0a96d'], floor: ['#d8d2cd', '#cec7c1', '#a89c92'], props: { shelf: 'mk4_1', desk: 'iron1_9' } },
};
function roomImg(name) { return IMG.room[name] || lazyImg('room', name); }
// 방 바닥: 원작 방 그림의 바닥 부분을 방 크기에 맞춰 깐다 (레이어보다 먼저)
function drawRoomFloor(w) {
  const R = ROOMS[w.id]; if (!R) return false;
  const im = roomImg(R.img), mw = w.w * TILE, mh = w.h * TILE, y1 = 2 * TILE + 6, y2 = mh - TILE + 4;
  if (im) ctx.drawImage(im, 0, R.fl, R.sw || im.width, (R.sh || im.height) - R.fl, TILE - 14, y1, mw - TILE * 2 + 28, y2 - y1);
  if (R.floorTint) { ctx.fillStyle = R.floorTint; ctx.fillRect(TILE - 14, y1, mw - TILE * 2 + 28, y2 - y1); }
  else { ctx.fillStyle = R.floor[0]; ctx.fillRect(TILE - 14, y1, mw - TILE * 2 + 28, y2 - y1); }
  // 천장 조명 아래 빛 웅덩이 + 벽 쪽 그늘
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const lx = mw * (0.22 + i * 0.28), ly = y1 + (y2 - y1) * 0.35; const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, mw * 0.2); g.addColorStop(0, 'rgba(255,255,240,0.13)'); g.addColorStop(1, 'rgba(255,255,240,0)'); ctx.fillStyle = g; ctx.fillRect(lx - mw * 0.2, ly - mw * 0.2, mw * 0.4, mw * 0.4); }
  ctx.restore();
  const sg = ctx.createLinearGradient(0, y1, 0, y1 + 60); sg.addColorStop(0, 'rgba(0,0,0,0.22)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(TILE - 14, y1, mw - TILE * 2 + 28, 60);
  // 원근 바닥 줄눈: 뒤쪽(벽)으로 갈수록 촘촘해지고 세로 줄은 소실점으로 모인다
  const fx0 = TILE - 14, fx1 = mw - TILE + 14, vpx = mw / 2, vpy = y1 - (y2 - y1) * 1.6;
  ctx.save(); ctx.beginPath(); ctx.rect(fx0, y1, fx1 - fx0, y2 - y1); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
  for (let i = 1; i < 9; i++) { const k = Math.pow(i / 9, 1.35), yy = y1 + (y2 - y1) * k; ctx.beginPath(); ctx.moveTo(fx0, yy); ctx.lineTo(fx1, yy); ctx.stroke(); }
  for (let xx = fx0 - mw; xx <= fx1 + mw; xx += TILE * 1.25) { ctx.beginPath(); ctx.moveTo(vpx + (xx - vpx) * ((y1 - vpy) / (y2 - vpy)), y1); ctx.lineTo(xx, y2); ctx.stroke(); }
  ctx.restore();
  // 옆벽: 뒤쪽 모서리에서 앞으로 갈수록 넓어지는 쐐기 (방이 안쪽으로 깊어 보이게)
  const wc = R.wall || ['#55606e', '#8a95a3'], sw = 30;
  for (const side of [0, 1]) {
    const ex = side ? fx1 : fx0, dir = side ? -1 : 1;
    const wg = ctx.createLinearGradient(ex, 0, ex + dir * sw, 0); wg.addColorStop(0, shade(wc[0], -18)); wg.addColorStop(1, wc[0]);
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(ex, y1); ctx.lineTo(ex + dir * 4, y1); ctx.lineTo(ex + dir * sw, y2); ctx.lineTo(ex, y2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + dir * 4, y1); ctx.lineTo(ex + dir * sw, y2); ctx.stroke();
  }
  return true;
}
// 방 뒷벽 (맵 위쪽 2줄 + 그 위 화면 여백)
function drawRoomBack(w) {
  const R = ROOMS[w.id]; if (!R) return false;
  const im = roomImg(R.img); if (!im) return false;
  const iw = R.sw || im.width, mw = w.w * TILE, rx = TILE - 14, rw = mw - TILE * 2 + 28, dh = R.fl * rw / iw, y1 = 2 * TILE + 6;
  ctx.drawImage(im, 0, 0, iw, R.fl, rx, y1 - dh, rw, dh);
  // 뒷벽 양옆 기둥
  ctx.fillStyle = R.wall[0]; ctx.fillRect(rx - 4, y1 - dh, 6, dh); ctx.fillRect(rx + rw - 2, y1 - dh, 6, dh);
  // 벽 아래 걸레받이 그림자
  const g = ctx.createLinearGradient(0, y1, 0, y1 + 18); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(TILE, y1, mw - TILE * 2, 18);
  return true;
}
// 소품 스프라이트 (아래 기준으로 상자에 맞춤)
function drawRoomProp(d, name) {
  const im = roomImg(name); if (!im) return false;
  const X = d.x * TILE, Y = d.y * TILE, w = d.w * TILE, h = d.h * TILE;
  // 사람형 SD(약 1.5칸)와 원근이 맞도록 소품 높이는 최대 1.8칸
  const s = Math.min((w + 8) / im.width, TILE * 1.8 / im.height), dw = im.width * s, dh = im.height * s;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h + 4, dw * 0.45, 7, 0, 0, 7); ctx.fill();
  ctx.drawImage(im, X + w / 2 - dw / 2, Y + h + 8 - dh, dw, dh);
  return true;
}

const World = {
  id: null, def: null, w: 0, h: 0, tiles: null, ents: [], buildings: [], decos: [], layer: null,
  player: { x: 0, y: 0, px: 0, py: 0, dir: 'down', moving: false, prog: 0, fx: 0, fy: 0, anim: 0, turnT: 0 },
  cam: { x: 0, y: 0 }, locked: false, banner: null, amb: [], bumpT: 0, stepCount: 0, encCool: 0, hintT: 0,

  // -------------------- 로딩 --------------------
  load(id, x, y, dir) {
    const def = MAPS[id];
    this.id = id; this.def = def;
    this.h = def.rows.length; this.w = def.rows[0].length;
    this.tiles = def.rows.map(r => r.split(''));
    const theme = THEME[def.theme];
    // 오브젝트 아래 타일을 보행 가능하게
    for (const o of def.objects) {
      if (['npc', 'trainer', 'item', 'legend'].includes(o.t)) {
        const c = this.tiles[o.y] && this.tiles[o.y][o.x];
        if (c && !TILE_DEF[c].walk) this.tiles[o.y][o.x] = theme.ground;
      }
    }
    if (window.SDF) for (const e of this.ents || []) SDF.release(e);
    this.buildings = def.objects.filter(o => o.t === 'building');
    this.decos = def.objects.filter(o => o.t === 'deco');
    if (ROOMS[id] && ROOMS[id].extra) for (const [prop, x, y, w] of ROOMS[id].extra) this.decos.push({ t: 'deco', kind: 'roomprop', prop, x, y, w, h: 1 });
    this.ents = [];
    for (const o of def.objects) {
      if (['npc', 'trainer', 'item', 'sign', 'obj', 'starter', 'legend'].includes(o.t)) {
        this.ents.push({ o, kind: o.t, x: o.x, y: o.y, px: o.x * TILE, py: o.y * TILE, dir: o.dir || 'down', ox: o.x, oy: o.y, moving: false, wanderT: rand(1, 4), bob: rand(0, 6), exclaim: 0, alpha: 1 });
      }
    }
    // 폰: 이 맵에 나오지 않는 SD 리그는 GPU 텍스처째 해제한다 (맵을 돌수록 쌓여 메모리 초과로 탭이 꺼지던 문제)
    if (LOW_MEM && window.SD && window.SDF && SDF.ok) {
      const need = new Set(this.ents.map(e => e.o.sprite || e.o.species).filter(Boolean));
      const lead = Game.party.find(m => m.hp > 0); if (lead) need.add(lead.key);
      for (const rid of SD.loaded()) {
        if (need.has(rid)) continue;
        if (this.follower && this.follower._sd && this.follower._sd.tpl.id === rid) SDF.release(this.follower);
        try { SD.evict(rid); } catch (e) { console.warn(e); }
        delete SDF.status[rid];
      }
    }
    const p = this.player;
    // 시작 위치가 막혀 있으면 가장 가까운 보행 가능 타일로
    if (this.blocked(x, y)) {
      let best = null, bd = 1e9;
      for (let yy = 0; yy < this.h; yy++) for (let xx = 0; xx < this.w; xx++) {
        const d = Math.abs(xx - x) + Math.abs(yy - y);
        if (d < bd && !this.blocked(xx, yy) && !this.objAt(xx, yy, 'warp') && !this.objAt(xx, yy, 'exit')) { bd = d; best = [xx, yy]; }
      }
      if (best) { x = best[0]; y = best[1]; }
    }
    p.x = x; p.y = y; p.px = x * TILE; p.py = y * TILE; p.moving = false; p.dir = dir || p.dir;
    this.follower = Object.assign(this.follower || {}, { x, y, px: x * TILE, py: y * TILE, fx: x, fy: y, moving: false, hidden: true, dir: p.dir });
    Game.map = id; Game.px = x; Game.py = y; Game.dir = p.dir;
    this.buildLayer();
    this.snapCam();
    this.amb = [];
    this.banner = { text: def.name, t: 0 };
    this.encCool = 2;
    Audio2.bgm(this.bgmKey(), { fadeIn: 700 });
    Audio2.ambient(def.amb || null);
    if (def.name && !def.indoor) Game.flags['visit_' + id] = 1;
    if (window.Quests) Quests.tick();
    if (Game.flags.gotStarter && Scene === World) { this.toast = { text: Game.save() ? '자동 저장됨' : '자동 저장 실패 (저장 공간 확인)', t: 0 }; }
  },
  bgmKey() { if (this.id === 'nest' && Game.flags.cleared) return 'route'; return this.def.bgm; },
  entActive(e) {
    const o = e.o;
    // cond: 플래그 하나('flag' / '!flag') 또는 배열(모두 만족)
    if (o.cond) for (const cd of [].concat(o.cond)) { const neg = cd[0] === '!'; const f = !!Game.flags[cd.replace('!', '')]; if (neg ? f : !f) return false; }
    if (e.kind === 'item' && Game.taken[o.id]) return false;
    if (e.kind === 'trainer' && o.boss && !o.stay && Game.flags['beat_' + o.id]) return false;
    if (e.kind === 'legend' && Game.flags['legend_' + o.id]) return false;
    if (e.kind === 'starter' && Game.flags.gotStarter) return false;
    if (e.hidden) return false;
    return true;
  },
  decoActive(d) { if (!d.cond) return true; const neg = d.cond[0] === '!'; const f = !!Game.flags[d.cond.replace('!', '')]; return neg ? !f : f; },

  // -------------------- 충돌 --------------------
  tile(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.tiles[y][x]; },
  buildingAt(x, y) { return this.buildings.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); },
  entAt(x, y) { return this.ents.find(e => this.entActive(e) && ((e.x === x && e.y === y) || (e.o.w && x >= e.x && x < e.x + e.o.w && y >= e.y && y < e.y + (e.o.h || 1)))); },
  blocked(x, y, self) {
    const c = this.tile(x, y);
    if (c == null || !TILE_DEF[c] || !TILE_DEF[c].walk) return true;
    const b = this.buildingAt(x, y);
    if (b && !(b.door === x && y === b.y + b.h - 1)) return true;
    for (const d of this.decos) if (d.block && this.decoActive(d) && x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return true;
    const e = this.entAt(x, y);
    if (e && e !== self && e.kind !== 'sign') return true;
    if (e && e.kind === 'sign') return true;
    const p = this.player;
    if (self && p.x === x && p.y === y) return true;
    return false;
  },
  objAt(x, y, t) { return this.def.objects.find(o => o.t === t && x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1)); },

  // -------------------- 업데이트 --------------------
  update(dt) {
    const p = this.player;
    if (this.banner) this.banner.t += dt;
    this.hintT += dt;
    this.updateAmbient(dt);
    for (const e of this.ents) { e.bob += dt; if (e.exclaim > 0) e.exclaim -= dt; }
    if (UI.busy() || this.locked || Trans.active) { if (p.moving) this.stepMove(dt); return; }
    this.updateNPCs(dt);
    this.questT = (this.questT || 0) + dt;
    if (this.questT > 0.5 && window.Quests) { this.questT = 0; Quests.tick(); }
    if (p.moving) { this.stepMove(dt); return; }
    this.encCool = Math.max(0, this.encCool - dt);
    if (Input.pressed.b || Input.pressed.menu) { Audio2.select(); UI.push(new PauseMenu()); return; }
    if (Input.pressed.a) { this.interact(); return; }
    const dir = ['up', 'down', 'left', 'right'].find(d => Input.held[d] || Input.pressed[d]);
    if (!dir) { p.turnT = 0; return; }
    if (dir !== p.dir && p.turnT <= 0) { p.dir = dir; p.turnT = 0.09; return; }
    if (p.turnT > 0) { p.turnT -= dt; if (p.turnT > 0) return; }
    this.tryMove(dir);
  },
  tryMove(dir) {
    const p = this.player; p.dir = dir;
    const [dx, dy] = DIRS[dir], nx = p.x + dx, ny = p.y + dy;
    // 건물 문
    const b = this.buildingAt(nx, ny);
    if (b && b.to && b.door === nx && ny === b.y + b.h - 1 && dir === 'up') { this.enterDoor(b); return; }
    const ex = this.objAt(nx, ny, 'exit');
    if (ex && this.id === 'lab' && !Game.flags.gotStarter && Game.flags.introDone) {
      this.locked = true; Scripts.labExit().finally(() => { this.locked = false; }); return;
    }
    if (ex) { this.leaveTo(ex.to); return; }
    const wp = this.objAt(nx, ny, 'warp');
    if (wp && !this.blockedTile(nx, ny)) { this.startMove(nx, ny); this.pendingWarp = wp; return; }
    if (this.tile(nx, ny) === 'H') { this.startMove(nx, ny); this.pendingWarp = this.objAt(nx, ny, 'warp'); return; }
    if (this.blocked(nx, ny)) {
      // 편의: 모서리·장애물 한 칸에 걸리면 멈추지 않고 옆으로 비켜 간다
      // (옆 칸이 비어 있고, 그 칸에서 원래 방향으로 나아갈 수 있을 때만. 워프·출구·트리거 칸으로는 비키지 않는다)
      // 사람(NPC·트레이너·전설 등 엔티티)에 막혔을 때는 비키지 않는다 (말을 걸려고 다가갈 때 미끄러지지 않게)
      const blocker = this.entAt(nx, ny);
      const sides = blocker ? [] : dx ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      if (this.lastSide) sides.sort(a => (a[0] === this.lastSide[0] && a[1] === this.lastSide[1] ? -1 : 1));
      const safe = (x, y) => !this.blocked(x, y) && !this.objAt(x, y, 'warp') && !this.objAt(x, y, 'exit') && !this.objAt(x, y, 'trigger') && this.tile(x, y) !== 'H';
      for (const [sx, sy] of sides) {
        if (safe(p.x + sx, p.y + sy) && !this.blocked(p.x + sx + dx, p.y + sy + dy)) { this.lastSide = [sx, sy]; this.startMove(p.x + sx, p.y + sy); return; }
      }
      if (this.bumpT <= 0) { Audio2.bump(); this.bumpT = 0.35; }
      this.bumpT -= FRAME_DT;
      return;
    }
    this.startMove(nx, ny);
  },
  // 오토바이: 퀘스트로 받은 뒤 야외에서 달리는 중
  riding() { const p = this.player; return !!(Game.flags.motorbike && p.run && !(this.def && this.def.indoor)); },
  // 걷기 4.4칸/초, 달리기 11.25칸/초, 오토바이(야외에서 달리기) 그 3배
  moveSpeed() { return this.riding() ? 11.25 * 3 : this.player.run ? 11.25 : 4.4; },
  blockedTile(x, y) { const c = this.tile(x, y); return c == null || !TILE_DEF[c].walk; },
  startMove(nx, ny) {
    const p = this.player;
    const fo = this.follower;
    if (fo) { fo.fx = fo.x; fo.fy = fo.y; fo.x = p.x; fo.y = p.y; fo.moving = !(fo.fx === fo.x && fo.fy === fo.y); fo.hidden = false; const dx = fo.x - fo.fx, dy = fo.y - fo.fy; if (dx || dy) fo.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'; }
    p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.moving = true; p.prog = 0;
    p.run = window.MobileField && MobileField.drag ? MobileField.fast : (Settings.runDefault ? !Input.held.run : Input.held.run);
    // 출발하는 프레임에도 그만큼 이동한다 (칸 사이에 한 프레임씩 쉬어 빠를수록 실제 속도가 깎이던 문제)
    p.prog = Math.min(0.95, Math.max(0, FRAME_DT) * this.moveSpeed());
    p.px = lerp(p.fx, p.x, p.prog) * TILE; p.py = lerp(p.fy, p.y, p.prog) * TILE;
    this.bumpT = 0;
  },
  stepMove(dt) {
    const p = this.player;
    const bike = this.riding(), speed = this.moveSpeed();
    p.prog = Math.min(1, p.prog + dt * speed);
    p.anim += dt * (bike ? 6 : p.run ? 15 : 9);
    if (bike && Math.random() < dt * 30) { const [dx, dy] = DIRS[p.dir]; this.amb.push({ k: 'leafbit', x: p.px + 24 - dx * 22 + rand(-4, 4), y: p.py + 38 - dy * 10, vx: -dx * 60 + rand(-20, 20), vy: rand(-50, -20), t: 0, life: 0.45, c: 'rgba(200,200,200,0.7)' }); }
    p.px = lerp(p.fx, p.x, p.prog) * TILE; p.py = lerp(p.fy, p.y, p.prog) * TILE;
    const fo = this.follower;
    if (fo) { fo.px = lerp(fo.fx, fo.x, p.prog) * TILE; fo.py = lerp(fo.fy, fo.y, p.prog) * TILE; fo.anim = p.anim; }
    if (p.prog >= 1) { p.moving = false; if (fo) fo.moving = false; this.onStep(); }
  },
  async onStep() {
    const p = this.player;
    Game.px = p.x; Game.py = p.y; Game.dir = p.dir;
    this.stepCount++;
    const c = this.tile(p.x, p.y);
    if (c === '"' || c === 'n') { Audio2.noise(0.07, 0.05, c === 'n' ? 600 : 2600); for (let i = 0; i < 4; i++) this.amb.push({ k: 'leafbit', x: p.px + 24 + rand(-12, 12), y: p.py + 38, vx: rand(-40, 40), vy: rand(-90, -40), t: 0, life: 0.4, c: c === 'n' ? '#ff4d6a' : '#5fae4a' }); }
    if (this.pendingWarp) { const w = this.pendingWarp; this.pendingWarp = null; if (w) { await this.warpTo(w.to); return; } }
    // 트리거
    const tr = this.objAt(p.x, p.y, 'trigger');
    if (tr && Scripts[tr.run]) { this.locked = true; try { await Scripts[tr.run](tr); } finally { this.locked = false; } return; }
    if (await this.checkTrainers()) return;
    // 야생 조우
    if (c && TILE_DEF[c].enc && this.def.enc && Game.party.some(m => m.hp > 0) && this.encCool <= 0) {
      const table = ENCOUNTERS[this.def.enc];
      if (Math.random() < table.rate * TILE_DEF[c].enc) await this.wildBattle(table);
    }
  },
  updateNPCs(dt) {
    for (const e of this.ents) {
      if (e.kind !== 'npc' || !e.o.wander || !this.entActive(e)) continue;
      if (e.moving) {
        e.prog = Math.min(1, e.prog + dt * 3);
        e.px = lerp(e.fx, e.x, e.prog) * TILE; e.py = lerp(e.fy, e.y, e.prog) * TILE;
        if (e.prog >= 1) e.moving = false;
        continue;
      }
      e.wanderT -= dt;
      if (e.wanderT > 0) continue;
      e.wanderT = rand(1.5, 4);
      const d = pick(['up', 'down', 'left', 'right']);
      e.dir = d;
      const [dx, dy] = DIRS[d], nx = e.x + dx, ny = e.y + dy;
      if (Math.abs(nx - e.ox) > 2 || Math.abs(ny - e.oy) > 2) continue;
      if (this.blocked(nx, ny, e) || this.objAt(nx, ny, 'warp') || this.objAt(nx, ny, 'trigger')) continue;
      const pp = this.player; if (Math.abs(pp.x - nx) + Math.abs(pp.y - ny) === 0) continue;
      e.fx = e.x; e.fy = e.y; e.x = nx; e.y = ny; e.moving = true; e.prog = 0;
    }
  },

  // -------------------- 상호작용 --------------------
  async interact() {
    const p = this.player;
    const [dx, dy] = DIRS[p.dir];
    let tx = p.x + dx, ty = p.y + dy;
    let e = this.entAt(tx, ty);
    if (!e && this.tile(tx, ty) && TILE_DEF[this.tile(tx, ty)].counter) { tx += dx; ty += dy; e = this.entAt(tx, ty); }
    if (!e) {
      const c = this.tile(tx, ty);
      if (c === '~' && !this.def.indoor) { await say('푸른 물결이 일렁인다... 아직 바다를 건널 수단이 없다.'); }
      return;
    }
    this.locked = true;
    try { await this.runEnt(e); } finally { this.locked = false; }
  },
  async runEnt(e) {
    const o = e.o;
    if (e.kind === 'npc' || e.kind === 'trainer') e.dir = OPP[this.player.dir];
    // 퀘스트 (보고 · 제안). 상점·수복실·선물 같은 기능형 NPC는 퀘스트 대화 뒤 원래 기능을 이어서 쓴다
    if ((e.kind === 'npc' || (e.kind === 'trainer' && Game.flags['beat_' + o.id])) && window.Quests && await Quests.talk(e)) {
      if (!['shop', 'nurse', 'doctor'].includes(o.talk)) return;
    }
    if (e.kind === 'sign') { Audio2.cursor(); await say(o.text); return; }
    if (e.kind === 'item') {
      Game.taken[o.id] = 1;
      Audio2.sfx('item_get', 0.7);
      Game.addItem(o.item, o.n);
      await say('사령관은 ' + J(ITEMS[o.item].name + (o.n > 1 ? ' ×' + o.n : ''), '을') + ' 손에 넣었다!');
      return;
    }
    if (e.kind === 'starter') { await Scripts.starter(e); return; }
    if (e.kind === 'legend') { await Scripts.legend(e); return; }
    if (e.kind === 'obj') { await Scripts['obj_' + o.kind](e); return; }
    if (e.kind === 'trainer') {
      const T = TRAINERS[o.id];
      if (Game.flags['beat_' + o.id] && Game.flags.cleared && !T.boss) {
        const R = T.rematch || [];
        const c = await ask(R[0] || '사령관님, 한 번 더 승부해 주시겠어요? 저희도 훨씬 강해졌다구요!', ['승부한다', '다음에'], { speaker: T.name, portrait: T.portrait });
        if (c === 0) {
          // 재대결: 원래 레벨 +18, 그리고 내 부대 최고 레벨 근처까지 따라온다 (최대 70)
          const top = Math.max(...Game.party.map(m => m.level));
          const foes = T.team.map(([k, lv]) => new Mon(k, Math.min(70, Math.max(lv + 18, top - 2 + Math.round(lv / 20))), { trainer: true }));
          await say(R[1] || '이번엔 지지 않을 거예요!', { speaker: T.name, portrait: T.portrait });
          // 재대결 상금은 원래 상금 그대로 (무한 반복으로 자원을 불리지 않도록)
          const res = await startBattle({ kind: 'trainer', foes, trainer: Object.assign({}, T, { intro: '', lose: R[2] ? '' : T.lose }), bg: this.def.bg, bgm: 'trainer', noRun: true });
          if (res === 'win') await say(R[2] || T.lose || T.after || '...다음엔 꼭 이길 거예요!', { speaker: T.name, portrait: T.portrait });
        }
        return;
      }
      // 퀘스트 표시가 뜬 상대라도 아직 이기지 않았다면 먼저 승부. 무엇을 위한 승부인지 알려 준다
      if (!Game.flags['beat_' + o.id] && window.Quests) {
        const m = Quests.markerFor(this.id, o.id);
        if (m && m.col !== 'grey') await say('(' + T.name + '에게 ' + (m.ch === '!' ? '부탁할 일' : '나눌 이야기') + '가 있는 것 같다. 먼저 승부에서 이겨야 들을 수 있겠다!)');
      }
      if (Game.flags['beat_' + o.id]) { if (T.voice) Audio2.voice(T.voice, 'talk'); else Audio2.voice(o.sprite, 'talk', 0.8); await say(T.after || '...', { speaker: T.name, portrait: T.portrait }); return; }
      await this.trainerBattle(e);
      return;
    }
    if (o.talk && Scripts[o.talk]) { await Scripts[o.talk](e); return; }
    if (o.lines) { Audio2.voice(o.sprite, 'talk', 0.8); for (const l of o.lines) await say(l, { speaker: o.name, portrait: o.sprite }); }
  },

  // -------------------- 트레이너 --------------------
  async checkTrainers() {
    const p = this.player;
    for (const e of this.ents) {
      if (e.kind !== 'trainer' || !this.entActive(e) || Game.flags['beat_' + e.o.id]) continue;
      if (window.Quests && Quests.gymLocked(e.o.id)) continue; // 퀘스트를 받기 전에는 관장이 먼저 싸움을 걸지 않는다
      let seen = false;
      if (e.o.zone) { const [zx, zy, zw, zh] = e.o.zone; seen = p.x >= zx && p.x < zx + zw && p.y >= zy && p.y < zy + zh; }
      else {
        const [dx, dy] = DIRS[e.dir];
        for (let k = 1; k <= (e.o.sight || 3); k++) {
          const x = e.x + dx * k, y = e.y + dy * k;
          if (p.x === x && p.y === y) { seen = true; break; }
          if (this.blockedTile(x, y) || this.entAt(x, y)) break;
        }
      }
      if (seen) { this.locked = true; try { await this.trainerBattle(e, true); } finally { this.locked = false; } return true; }
    }
    return false;
  },
  async walkEnt(e, tx, ty) {
    while (Math.abs(e.x - tx) + Math.abs(e.y - ty) > 1) {
      const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y);
      let nx = e.x, ny = e.y;
      if (dx && !this.blocked(e.x + dx, e.y, e)) { nx += dx; e.dir = dx > 0 ? 'right' : 'left'; }
      else if (dy && !this.blocked(e.x, e.y + dy, e)) { ny += dy; e.dir = dy > 0 ? 'down' : 'up'; }
      else break;
      e.fx = e.x; e.fy = e.y; e.x = nx; e.y = ny;
      await new Promise(res => { let t = 0; Tick.add(dt => { t += dt * 4.5; const k = Math.min(1, t); e.px = lerp(e.fx, e.x, k) * TILE; e.py = lerp(e.fy, e.y, k) * TILE; e.walk = (e.walk || 0) + dt * 9; if (k >= 1) { res(); return false; } }); });
    }
  },
  async trainerBattle(e, spotted) {
    const o = e.o, T = TRAINERS[o.id], p = this.player;
    const lockQ = window.Quests && Quests.gymLocked(o.id);
    if (lockQ) {
      // 아직 그 관장에게 도전하라는 메인 퀘스트를 받지 않았다: 누구에게 먼저 가야 하는지 알려 준다
      const g = lockQ.giver, who = g ? Quests.npcName(g) + '(' + ((MAPS[g[0]] && MAPS[g[0]].name) || '') + ')' : '';
      await say('(관장 협회의 정식 도전 절차를 아직 밟지 않았다.' + (who ? ' 먼저 ' + who + '에게 이야기를 들어 보자.' : ' 먼저 이전 관장에게 이야기를 들어 보자.') + ')');
      return;
    }
    if (spotted) {
      Audio2.exclaim(); e.exclaim = 0.9;
      if (T.boss) Audio2.stopBgm(400); else Audio2.bgm('trainer', { fadeIn: 200 });
      await wait(650);
      await this.walkEnt(e, p.x, p.y);
      p.dir = e.x > p.x ? 'right' : e.x < p.x ? 'left' : e.y > p.y ? 'down' : 'up';
      e.dir = OPP[p.dir];
    }
    if (T.voice) Audio2.voice(T.voice, 'talk'); else Audio2.voice(o.sprite, 'talk', 0.8);
    if (Scripts['pre_' + o.id]) await Scripts['pre_' + o.id](e);
    else await say(T.intro, { speaker: T.name, portrait: T.portrait });
    const foes = T.team.map(([k, lv]) => new Mon(k, lv, { trainer: true }));
    // 흑막의 복제 부대: 원본의 랭크·개체값·기술·진화 형태까지 그대로 베낀다 (레벨만 난이도 보정)
    if (T.copyOf) T.copyOf.forEach((src, i) => {
      const f = foes[i]; if (!f || f.key !== src.key) return;
      // 쉬움에서는 랭크·개체값은 베끼지 못한 불완전한 복제 (기본 랭크)
      if (Settings.difficulty !== 0) { f.rank = src.rank; f.ivs = src.ivs.slice(); }
      f.form = src.form || 0;
      f.moves = src.moves.map(x => ({ id: x.id, pp: MOVES[x.id].pp }));
      f.recalc(); f.hp = f.maxHp;
    });
    // 첫 대사는 필드에서 이미 했으므로 전투 화면에서는 반복하지 않는다
    const res = await startBattle({ kind: 'trainer', foes, trainer: Object.assign({}, T, { intro: '' }), bg: o.id === 'mpzeta' ? 'nest' : this.def.bg, bgm: T.bgm || 'trainer', noRun: true });
    if (res === 'win') {
      Game.flags['beat_' + o.id] = 1;
      if (Scripts['post_' + o.id]) await Scripts['post_' + o.id](e);
      else if (T.after) await say(T.after, { speaker: T.name, portrait: T.portrait });
      // 이 상대가 퀘스트 의뢰인·보고 대상이면 승부 직후 바로 이어서 이야기한다
      if (window.Quests && !e.hidden) { Quests.tick(); const m = Quests.markerFor(this.id, o.id); if (m && m.col !== 'grey') await Quests.talk(e); }
    }
  },
  async wildBattle(table) {
    let total = table.list.reduce((s, x) => s + x[1], 0), r = Math.random() * total, key = table.list[0][0];
    for (const [k, w] of table.list) { if ((r -= w) < 0) { key = k; break; } }
    const lv = randi(table.lv[0], table.lv[1]);
    this.locked = true;
    try { await startBattle({ kind: 'wild', foes: [new Mon(key, lv)], bg: this.def.bg, expMul: table.expMul || 1 }); }
    finally { this.locked = false; this.encCool = 1.2; }
  },

  // -------------------- 이동 / 워프 --------------------
  async enterDoor(b) {
    this.locked = true;
    Audio2.sfx('door', 0.6);
    await Trans.fade(1, 260);
    this.load(b.to[0], b.to[1], b.to[2], 'up');
    await Trans.fade(0, 260);
    this.locked = false;
  },
  async leaveTo(to) { await this.warpTo(to); },
  async warpTo(to) {
    this.locked = true;
    if (this.def.indoor || MAPS[to[0]].indoor) Audio2.sfx('door', 0.5);
    await Trans.fade(1, 280);
    this.load(to[0], to[1], to[2], to[3] || this.player.dir);
    await Trans.fade(0, 280);
    this.locked = false;
    if (Scripts['enter_' + to[0]]) { this.locked = true; try { await Scripts['enter_' + to[0]](); } finally { this.locked = false; } }
  },

  // -------------------- 그리기 --------------------
  snapCam() {
    const p = this.player, mw = this.w * TILE, mh = this.h * TILE;
    const tx = p.px + TILE / 2 - W / 2, ty = p.py + TILE / 2 - H / 2;
    this.cam.x = mw <= W ? (mw - W) / 2 : clamp(tx, 0, mw - W);
    this.cam.y = mh <= H ? (mh - H) / 2 : clamp(ty, 0, mh - H);
  },
  buildLayer() {
    const cw = this.w * TILE, ch = this.h * TILE;
    if (!this.def.indoor && typeof Terrain !== 'undefined') {
      try { const r = Terrain.build(this, THEME[this.def.theme]); this.layer = r.canvas; this.layerScale = SCALE; this.layerS = r.S; return; } catch (e) { console.warn('terrain', e); }
    }
    const c = document.createElement('canvas');
    c.width = Math.ceil(cw * SCALE); c.height = Math.ceil(ch * SCALE);
    const g = c.getContext('2d');
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const th = THEME[this.def.theme];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) drawGround(g, this, x, y, th);
    // 건물 바닥 그림자
    this.layer = c;
    this.layerScale = SCALE; this.layerS = SCALE;
  },
  draw() {
    if (this.layerScale !== SCALE) this.buildLayer();
    const p = this.player;
    // 카메라 (부드럽게)
    const mw = this.w * TILE, mh = this.h * TILE;
    // 실내는 조금 확대해서 방을 크게 보여 준다 (뒷벽이 위로 올라가므로 아래쪽 기준)
    const Z = this.def.indoor ? 1.25 : 1, VW = W / Z, VH = H / Z;
    const tx = mw <= VW ? (mw - VW) / 2 : clamp(p.px + TILE / 2 - VW / 2, 0, mw - VW);
    const RM = ROOMS[this.id], topY = RM ? 2 * TILE + 6 - RM.fl * (mw - TILE * 2 + 28) / (RM.sw || (roomImg(RM.img) || {}).width || 1024) - 8 : 0, botY = mh - VH + 6;
    const ty = this.def.indoor ? (topY <= botY ? clamp(p.py + TILE / 2 - VH / 2, topY, botY) : (topY + botY) / 2) : mh <= VH ? (mh - VH) / 2 : clamp(p.py + TILE / 2 - VH / 2, 0, mh - VH);
    this.cam.x = tx; this.cam.y = ty;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    ctx.fillStyle = this.def.indoor ? '#0b1220' : this.def.theme === 'nest' ? '#120a14' : '#1d3a1d';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.scale(Z, Z);
    ctx.translate(-cx, -cy);
    // 바닥
    if (this.def.indoor) drawRoomFloor(this);
    const sx = Math.max(0, cx), sy = Math.max(0, cy);
    const sw = Math.min(VW, mw - sx), sh = Math.min(VH, mh - sy);
    if (sw > 0 && sh > 0) { const LS = this.layerS || SCALE; ctx.drawImage(this.layer, sx * LS, sy * LS, sw * LS, sh * LS, sx, sy, sw, sh); }
    if (this.def.indoor) drawRoomBack(this);
    const x0 = Math.max(0, Math.floor(cx / TILE) - 1), y0 = Math.max(0, Math.floor(cy / TILE) - 1);
    const x1 = Math.min(this.w - 1, Math.ceil((cx + VW) / TILE) + 1), y1 = Math.min(this.h - 1, Math.ceil((cy + VH) / TILE) + 2);
    const th = THEME[this.def.theme];
    // 애니메이션 타일
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = this.tiles[y][x];
      if (c === '~') drawWaterAnim(x, y, th, this);
      else if (c === '"' || c === 'n') drawTallGrass(x * TILE, y * TILE, c, th, x, y, false);
      else if (c === '%') drawAcid(x, y);
      else if (c === 'H') drawCave(x, y);
    }
    // Y 정렬 스프라이트
    const list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = this.tiles[y][x];
      if (c === 'T' || c === 'P' || c === 'X') list.push({ y: y * TILE + 46, f: () => drawTallTile(c, x, y, th) });
    }
    for (const b of this.buildings) list.push({ y: (b.y + b.h) * TILE - 2, f: () => { drawBuilding(b); if (window.Quests) Quests.drawDoorMarker(b); } });
    for (const d of this.decos) if (this.decoActive(d)) list.push({ y: (d.y + d.h) * TILE - 4 + (d.kind === 'shelf' || d.kind === 'machine' || d.kind === 'healer' ? -60 : 0), f: () => drawDeco(d, this) });
    for (const e of this.ents) if (this.entActive(e)) list.push({ y: e.py + 44, f: () => drawEnt(e) });
    list.push({ y: p.py + 45, f: () => {
      // 오토바이를 타면 다리를 멈추고 안장 높이로 올려 앉힌다
      if (this.riding()) { drawBike(p.px, p.py, p.dir, 'back', p.anim); drawCommander(p.px, p.py - 8, p.dir, 0, false); drawBike(p.px, p.py, p.dir, 'front', p.anim); }
      else drawCommander(p.px, p.py, p.dir, p.moving ? p.anim : 0, p.run && p.moving);
    } });
    // 동료 (부대 선두)
    const lead = Game.party.find(m => m.hp > 0), fo = this.follower;
    const showFo = lead && fo && !fo.hidden && !(fo.x === p.x && fo.y === p.y && !p.moving);
    // SD 렌더 목록
    if (window.SDF && SDF.ok) {
      const items = [];
      for (const e of this.ents) {
        if (!(e.kind === 'npc' || e.kind === 'trainer' || e.kind === 'legend') || !this.entActive(e)) continue;
        if (e.px < cx - 80 || e.px > cx + W + 80 || e.py < cy - 120 || e.py > cy + H + 60) continue;
        const key = e.o.sprite || e.o.species;
        if (!SDF.ready(key)) continue;
        if (e.dir === 'left' || e.dir === 'right') e.face = e.dir;
        items.push({ holder: e, key, anim: e.moving ? 'move' : 'idle', flip: (e.face || 'right') === 'left', h: e.o.boss || e.kind === 'legend' ? 84 : 72 });
      }
      if (showFo && SDF.ready(lead.key)) {
        if (fo.dir === 'left' || fo.dir === 'right') fo.face = fo.dir;
        // 칸과 칸 사이의 아주 짧은 멈춤에는 이동 동작을 유지한다 (매 칸마다 동작이 처음부터 다시 시작되어 끊겨 보이지 않게)
        fo.moveHold = p.moving ? 0.25 : Math.max(0, (fo.moveHold || 0) - FRAME_DT);
        items.push({ holder: fo, key: lead.key, anim: fo.moveHold > 0 ? 'move' : 'idle', flip: (fo.face || 'right') === 'left', h: 62 });
      }
      SDF.renderFrame(items, FRAME_DT);
    }
    // 동료가 사령관 바로 앞(화면 아래)에 겹치면 사령관이 가려지지 않게 반투명으로 그린다
    const foA = showFo && fo.py > p.py && fo.py - p.py < TILE * 1.6 && Math.abs(fo.px - p.px) < TILE * 0.9 ? 0.45 : 1;
    if (showFo) list.push({ y: fo.py + 44, f: () => { if (!(window.SDF && SDF.draw(fo, fo.px + 24, fo.py + 46, foA))) { ctx.save(); ctx.globalAlpha = foA; drawStandee(fo.px, fo.py, lead.iconKey, fo.dir, p.moving ? p.anim : 0, fo, false); ctx.restore(); } } });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    // 수풀 앞부분
    const pc = this.tile(p.x, p.y);
    if ((pc === '"' || pc === 'n') && !p.moving) drawTallGrass(p.x * TILE, p.y * TILE, pc, th, p.x, p.y, true);
    for (const e of this.ents) if (this.entActive(e) && (this.tile(e.x, e.y) === '"' || this.tile(e.x, e.y) === 'n')) drawTallGrass(e.x * TILE, e.y * TILE, this.tile(e.x, e.y), th, e.x, e.y, true);
    this.drawAmbient();
    drawAtmosWorld(this, cx, cy);
    ctx.restore();
    drawAtmosScreen(this);
    // 어둠
    if (this.def.dark) {
      const lx = p.px + 24 - cx, ly = p.py + 24 - cy;
      const g = ctx.createRadialGradient(lx, ly, 90, lx, ly, 440);
      g.addColorStop(0, 'rgba(10,0,10,0)'); g.addColorStop(0.6, 'rgba(10,0,12,0.35)'); g.addColorStop(1, 'rgba(8,0,10,0.75)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (this.def.indoor) { const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 600); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (!(window.MobileField && MobileField.portrait)) this.drawBanner();
    if (window.Quests) { if (!UI.busy() && !(window.MobileField && MobileField.portrait)) Quests.drawTracker(); Quests.drawNotes(); }
    if (this.toast && this.toast.t < 2) { this.toast.t += FRAME_DT; ctx.save(); ctx.globalAlpha = Math.min(1, (2 - this.toast.t) * 2); itemIcon('chip', W - 150, H - 26, 16); txt(this.toast.text, W - 18, H - 20, { size: 14, align: 'right', color: '#cfefff', stroke: 3, strokeColor: 'rgba(0,0,0,0.6)', shadow: false }); ctx.restore(); }
    if (!Game.flags.hintSeen && this.hintT < 30 && !UI.busy()) {
      ctx.save(); ctx.globalAlpha = 0.85;
      txt('방향키: 이동  Z: 조사/대화  X: 메뉴  Shift: 달리기', W - 16, H - 14, { size: 14, align: 'right', color: '#fff', stroke: 4, strokeColor: 'rgba(0,0,0,0.6)', shadow: false });
      ctx.restore();
    }
  },
  drawBanner() {
    const b = this.banner; if (!b || b.t > 3) return;
    const a = b.t < 0.35 ? Ease.outCubic(b.t / 0.35) : b.t > 2.5 ? 1 - (b.t - 2.5) / 0.5 : 1;
    ctx.save(); ctx.globalAlpha = a;
    const w = Math.max(240, measure(b.text, 24, 900) + 70);
    const x = 20 - (1 - a) * 60, y = 22;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 18, y + 52); ctx.lineTo(x, y + 52); ctx.closePath();
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(8,20,40,0.95)'); g.addColorStop(1, 'rgba(8,20,40,0.6)');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = UI_COL.line; ctx.fillRect(x, y + 50, w - 18, 2); ctx.fillRect(x, y, 6, 52);
    txt(b.text, x + 24, y + 35, { size: 24, weight: 900, family: TITLE_FONT });
    ctx.restore();
  },
  updateAmbient(dt) {
    const k = this.def.ambient;
    const cx = this.cam.x, cy = this.cam.y;
    if (k === 'leaves' && Math.random() < dt * 3) this.amb.push({ k: 'leaf', x: cx + rand(0, W + 200), y: cy - 20, vx: rand(-60, -20), vy: rand(30, 60), t: 0, life: 9, r: rand(0, 6), c: pick(['#8fd16a', '#c9e27a', '#e6b34a']) });
    if (k === 'spores' && Math.random() < dt * 10) this.amb.push({ k: 'spore', x: cx + rand(0, W), y: cy + H + 10, vx: rand(-10, 10), vy: rand(-40, -15), t: 0, life: 12, c: pick(['#ff4d6a', '#ff8a4d', '#b84dff']) });
    if (k === 'snow' && Math.random() < dt * 14) this.amb.push({ k: 'snowflake', x: cx + rand(-100, W + 100), y: cy - 10, vx: rand(-25, 10), vy: rand(35, 70), t: 0, life: 14, r: rand(0, 6), c: '#ffffff', s: rand(1.5, 3.2) });
    if (k === 'sea' && Math.random() < dt * 4) this.amb.push({ k: 'glint', x: cx + rand(0, W), y: cy + rand(0, H), t: 0, life: 0.8 });
    if (this.def.theme === 'town' && Math.random() < dt * 0.6) this.amb.push({ k: 'petal', x: cx + rand(0, W), y: cy - 10, vx: rand(-20, 20), vy: rand(20, 40), t: 0, life: 14, r: 0, c: pick(['#ffd1e8', '#fff3b0']) });
    for (let i = this.amb.length - 1; i >= 0; i--) {
      const a = this.amb[i]; a.t += dt;
      if (a.t > a.life) { this.amb.splice(i, 1); continue; }
      if (a.k === 'leafbit') a.vy += 300 * dt;
      a.x += (a.vx || 0) * dt + (a.k === 'leaf' || a.k === 'petal' ? Math.sin(a.t * 2 + (a.r || 0)) * 20 * dt : 0); a.y += (a.vy || 0) * dt;
    }
  },
  drawAmbient() {
    for (const a of this.amb) {
      ctx.save();
      if (a.k === 'leaf' || a.k === 'petal') { ctx.translate(a.x, a.y); ctx.rotate(a.t * 2 + a.r); ctx.fillStyle = a.c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, a.k === 'leaf' ? 6 : 3.5, a.k === 'leaf' ? 3 : 2.5, 0, 0, 7); ctx.fill(); }
      else if (a.k === 'spore') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * Math.sin(a.t / a.life * Math.PI); ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x + Math.sin(a.t * 1.5) * 8, a.y, 2.5, 0, 7); ctx.fill(); }
      else if (a.k === 'glint') { const c = this.tile(Math.floor(a.x / TILE), Math.floor(a.y / TILE)); if (c === '~') { ctx.globalAlpha = Math.sin(a.t / a.life * Math.PI); ctx.fillStyle = '#fff'; ctx.fillRect(a.x - 6, a.y, 12, 2); ctx.fillRect(a.x - 1, a.y - 4, 2, 10); } }
      else if (a.k === 'snowflake') { ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a.x + Math.sin(a.t * 1.3 + a.r) * 10, a.y, a.s, 0, 7); ctx.fill(); }
      else if (a.k === 'leafbit') { ctx.globalAlpha = 1 - a.t / a.life; ctx.fillStyle = a.c; ctx.fillRect(a.x, a.y, 4, 4); }
      ctx.restore();
    }
  },
};

// =====================================================================
//  타일 그리기
// =====================================================================
function same(world, x, y, set) { const c = world.tile(x, y); return c != null && set.includes(c); }
function blobTile(g, world, x, y, set, color, inset, r, edge) {
  const X = x * TILE, Y = y * TILE;
  const u = same(world, x, y - 1, set), d = same(world, x, y + 1, set), l = same(world, x - 1, y, set), rr = same(world, x + 1, y, set);
  const it = u ? 0 : inset, ib = d ? 0 : inset, il = l ? 0 : inset, ir = rr ? 0 : inset;
  g.save();
  g.beginPath();
  const x0 = X + il, y0 = Y + it, x1 = X + TILE - ir, y1 = Y + TILE - ib;
  const rtl = (!u && !l) ? r : 0, rtr = (!u && !rr) ? r : 0, rbr = (!d && !rr) ? r : 0, rbl = (!d && !l) ? r : 0;
  g.moveTo(x0 + rtl, y0); g.lineTo(x1 - rtr, y0); g.quadraticCurveTo(x1, y0, x1, y0 + rtr); g.lineTo(x1, y1 - rbr); g.quadraticCurveTo(x1, y1, x1 - rbr, y1);
  g.lineTo(x0 + rbl, y1); g.quadraticCurveTo(x0, y1, x0, y1 - rbl); g.lineTo(x0, y0 + rtl); g.quadraticCurveTo(x0, y0, x0 + rtl, y0); g.closePath();
  if (edge) { g.fillStyle = edge; g.fill(); g.translate(0, -2); }
  g.fillStyle = color; g.fill();
  g.restore();
}
function grassBase(g, x, y, th) {
  const X = x * TILE, Y = y * TILE;
  const v = hash2(x, y, 1);
  g.fillStyle = th.grass[v < 0.33 ? 0 : v < 0.66 ? 1 : 2]; g.fillRect(X, Y, TILE, TILE);
  // 미세 질감
  g.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 4; i++) { const a = hash2(x, y, 10 + i), b = hash2(x, y, 20 + i); g.fillRect(X + a * 44, Y + b * 44, 3, 2); }
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let i = 0; i < 4; i++) { const a = hash2(x, y, 30 + i), b = hash2(x, y, 40 + i); g.fillRect(X + a * 44, Y + b * 44, 2, 3); }
  if (th.ground === '.') {
    g.strokeStyle = 'rgba(30,80,20,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = hash2(x, y, 50 + i), b = hash2(x, y, 60 + i); const px = X + 6 + a * 36, py = Y + 10 + b * 32; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 2, py - 5); g.moveTo(px + 3, py); g.lineTo(px + 4, py - 6); g.stroke(); }
  }
}
function drawGround(g, world, x, y, th) {
  const c = world.tiles[y][x], X = x * TILE, Y = y * TILE;
  const tdef = TILE_DEF[c];
  if (th === THEME.indoor) {
    const RR = ROOMS[world.id];
    if (c === '#' && RR) {
      if (y <= 1) return; // 뒷벽 그림이 덮는다
      // 옆벽/앞벽: 얇은 벽 (안쪽 가장자리만)
      const left = x === 0, right = x === world.w - 1, bottom = y === world.h - 1;
      const strip = (sx, sy, sw, sh, vertical) => {
        const gr = vertical ? g.createLinearGradient(sx, 0, sx + sw, 0) : g.createLinearGradient(0, sy, 0, sy + sh);
        gr.addColorStop(0, RR.wall[1]); gr.addColorStop(1, RR.wall[0]); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
        g.fillStyle = 'rgba(255,255,255,0.25)'; if (vertical) g.fillRect(sx + (left ? sw - 2 : 0), sy, 2, sh); else g.fillRect(sx, sy, sw, 2);
      };
      if (left) strip(X + TILE - 14, Y, 14, bottom ? 20 : TILE, true);
      if (right) strip(X, Y, 14, bottom ? 20 : TILE, true);
      if (bottom) { strip(left ? X + TILE - 14 : X, Y + 4, left || right ? 14 : TILE, 16, false); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X, Y + 20, TILE, 4); }
      return;
    }
    if (c === '#') {
      g.fillStyle = '#2c3a4c'; g.fillRect(X, Y, TILE, TILE);
      g.fillStyle = '#36475c'; g.fillRect(X + 2, Y + 2, TILE - 4, TILE - 8);
      g.fillStyle = 'rgba(95,244,255,0.25)'; if (y === 1) g.fillRect(X, Y + TILE - 6, TILE, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, Y + TILE - 4, TILE, 4);
      if (y === 0 && x % 3 === 1) { g.fillStyle = '#5ff4ff'; g.globalAlpha = 0.35; g.fillRect(X + 10, Y + 18, 28, 4); g.globalAlpha = 1; }
      return;
    }
    // 바닥: 방 색에 맞춘 큰 판 (2x2 칸 = 1장)
    const RF = ROOMS[world.id] && ROOMS[world.id].floor && [ROOMS[world.id].floor[0], ROOMS[world.id].floor[1] || ROOMS[world.id].floor[0], ROOMS[world.id].floor[2] || '#9aa0a8'];
    if (RF && c === 'M') return;
    if (RF) {
      g.fillStyle = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? RF[0] : RF[1]; g.fillRect(X, Y, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.18)'; if (x % 2 === 0) g.fillRect(X, Y, 2, TILE); if (y % 2 === 0) g.fillRect(X, Y, TILE, 2);
      g.fillStyle = RF[2]; if (x % 2 === 1) g.fillRect(X + TILE - 1, Y, 1, TILE); if (y % 2 === 1) g.fillRect(X, Y + TILE - 1, TILE, 1);
    } else {
      g.fillStyle = (x + y) % 2 ? '#c3ced8' : '#bac6d1'; g.fillRect(X, Y, TILE, TILE);
      g.strokeStyle = 'rgba(70,90,110,0.25)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, TILE - 1, TILE - 1);
      g.fillStyle = 'rgba(70,90,110,0.35)'; for (const [a, b] of [[5, 5], [41, 5], [5, 41], [41, 41]]) g.fillRect(X + a, Y + b, 2, 2);
    }
    if (c === 'c' && RR) {
      const u = same(world, x, y - 1, 'c'), dn = same(world, x, y + 1, 'c'), l = same(world, x - 1, y, 'c'), r = same(world, x + 1, y, 'c');
      g.fillStyle = 'rgba(0,0,0,0.18)'; if (!dn) g.fillRect(X + 2, Y + TILE - 2, TILE, 4); if (!r) g.fillRect(X + TILE, Y + 3, 3, TILE);
      const rg = g.createLinearGradient(X, Y, X + TILE, Y + TILE); rg.addColorStop(0, RR.rug[0]); rg.addColorStop(1, shade(RR.rug[0], -22)); g.fillStyle = rg; g.fillRect(X, Y, TILE, TILE);
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X + 24, Y + 10); g.lineTo(X + 38, Y + 24); g.lineTo(X + 24, Y + 38); g.lineTo(X + 10, Y + 24); g.closePath(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(X + 24, Y + 24, 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.12)'; if (!u) g.fillRect(X, Y + 9, TILE, 1); if (!dn) g.fillRect(X, Y + TILE - 10, TILE, 1); if (!l) g.fillRect(X + 9, Y, 1, TILE); if (!r) g.fillRect(X + TILE - 10, Y, 1, TILE);
      g.fillStyle = RR.rug[1];
      if (!u) g.fillRect(X, Y + 4, TILE, 3); if (!dn) g.fillRect(X, Y + TILE - 7, TILE, 3);
      if (!l) g.fillRect(X + 4, Y, 3, TILE); if (!r) g.fillRect(X + TILE - 7, Y, 3, TILE);
      if (!u && !l) { g.fillRect(X + 10, Y + 10, 6, 6); } if (!dn && !r) { g.fillRect(X + TILE - 16, Y + TILE - 16, 6, 6); }
    }
    else if (c === 'c') { g.fillStyle = '#2f5e8e'; g.fillRect(X, Y + 2, TILE, TILE - 4); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X, Y + 6, TILE, 2); g.fillRect(X, Y + TILE - 8, TILE, 2); }
    if (c === 'k' && RR) {
      // 카운터: 상판 + 앞면 + 그림자
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(X, Y + TILE - 6, TILE, 8);
      const fg = g.createLinearGradient(0, Y + 20, 0, Y + TILE - 4); fg.addColorStop(0, '#8f98a3'); fg.addColorStop(1, '#5d6670'); g.fillStyle = fg; g.fillRect(X, Y + 20, TILE, TILE - 24);
      g.fillStyle = '#f2f3f1'; g.fillRect(X, Y + 6, TILE, 16); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(X, Y + 20, TILE, 2);
      g.fillStyle = RR.rug[1]; g.fillRect(X, Y + 30, TILE, 3);
      if (!same(world, x - 1, y, 'k')) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X, Y + 6, 2, TILE - 10); }
      if (!same(world, x + 1, y, 'k')) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + TILE - 2, Y + 6, 2, TILE - 10); }
    }
    else if (c === 'k') { g.fillStyle = '#e8edf2'; g.fillRect(X, Y + 6, TILE, TILE - 10); g.fillStyle = '#5a6b80'; g.fillRect(X, Y + TILE - 12, TILE, 8); g.fillStyle = '#38e1ff'; g.fillRect(X, Y + 6, TILE, 3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, Y + TILE - 4, TILE, 4); }
    if (c === 'x') { g.fillStyle = '#9a7a4a'; g.fillRect(X + 4, Y + 6, TILE - 8, TILE - 10); g.strokeStyle = '#6a4f2a'; g.lineWidth = 2; g.strokeRect(X + 4, Y + 6, TILE - 8, TILE - 10); g.beginPath(); g.moveTo(X + 4, Y + 6); g.lineTo(X + TILE - 4, Y + TILE - 4); g.stroke(); }
    if (c === 'D' && RR) {
      // 출구 매트 (경고 띠 + 화살표)
      g.fillStyle = '#2b2f36'; g.fillRect(X + 2, Y + 2, TILE - 4, TILE - 6);
      for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#1a1a1a' : '#e8c547'; g.fillRect(X + 2 + k * 7.3, Y + 2, 7.3, 5); }
      g.fillStyle = '#7cf0ff'; g.beginPath(); g.moveTo(X + 16, Y + 18); g.lineTo(X + 32, Y + 18); g.lineTo(X + 24, Y + 30); g.closePath(); g.fill();
    }
    else if (c === 'D') { g.fillStyle = '#7a3b3b'; g.fillRect(X + 4, Y + 10, TILE - 8, TILE - 16); g.fillStyle = '#ffb22e'; g.fillRect(X + 10, Y + 24, TILE - 20, 3); }
    return;
  }
  // 야외 공통 바닥
  grassBase(g, x, y, th);
  if (c === ',') {
    const cols = ['#ffffff', '#ffd1e8', '#fff07a', '#ff9fb0'];
    for (let i = 0; i < 3; i++) { const a = hash2(x, y, 70 + i), b = hash2(x, y, 80 + i); const px = X + 8 + a * 32, py = Y + 8 + b * 32; g.fillStyle = cols[Math.floor(hash2(x, y, 90 + i) * 4)]; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(px + Math.cos(k * 1.57) * 2.5, py + Math.sin(k * 1.57) * 2.5, 2, 0, 7); g.fill(); } g.fillStyle = '#ffcc33'; g.beginPath(); g.arc(px, py, 1.5, 0, 7); g.fill(); }
  }
  if (c === '_') blobTile(g, world, x, y, '_H', th.path, 5, 10, th.pathEdge);
  if (c === ':') { blobTile(g, world, x, y, ':', th.plaza || '#cfc8b8', 3, 6, '#9a9384'); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, TILE / 2, TILE / 2); g.strokeRect(X + TILE / 2 + 0.5, Y + TILE / 2 + 0.5, TILE / 2 - 1, TILE / 2 - 1); }
  if (c === '=' || c === '-') {
    blobTile(g, world, x, y, '=-H', th.asphalt || '#5f646c', 3, 6, '#3f434a');
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
    if (hash2(x, y, 5) < 0.4) { g.beginPath(); let px = X + hash2(x, y, 6) * 40, py = Y + 4; g.moveTo(px, py); for (let i = 0; i < 4; i++) { px += rand(-8, 8); py += 10; g.lineTo(px, py); } g.stroke(); }
    if (c === '-' && y % 2 === 0) { g.fillStyle = '#e8c547'; g.fillRect(X + 8, Y + TILE - 3, 22, 4); }
  }
  if (c === 's' || c === '~') {
    if (c === 's' || same(world, x, y - 1, 's')) blobTile(g, world, x, y, 's', th.sand || '#ead6a0', 3, 8);
    if (c === 's') { g.fillStyle = 'rgba(160,120,60,0.25)'; for (let i = 0; i < 5; i++) g.fillRect(X + hash2(x, y, 100 + i) * 44, Y + hash2(x, y, 110 + i) * 44, 2, 2); }
  }
  if (c === '~') {
    blobTile(g, world, x, y, '~', th.water[1], 4, 12, '#1d4f7a');
    g.save(); g.globalAlpha = 0.35; blobTile(g, world, x, y, '~', th.water[0], 9, 12); g.restore();
  }
  if (c === 'N' || c === 'n' || c === 'X' || c === '%' || (th === THEME.nest)) {
    g.fillStyle = hash2(x, y, 3) < 0.5 ? '#2f2334' : '#36283c'; g.fillRect(X, Y, TILE, TILE);
    g.strokeStyle = 'rgba(180,40,70,0.35)'; g.lineWidth = 1.5;
    if (hash2(x, y, 4) < 0.55) { g.beginPath(); g.moveTo(X + hash2(x, y, 5) * 48, Y); g.bezierCurveTo(X + 10, Y + 20, X + 40, Y + 30, X + hash2(x, y, 6) * 48, Y + 48); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 3; i++) g.fillRect(X + hash2(x, y, 7 + i) * 44, Y + hash2(x, y, 17 + i) * 44, 4, 3);
  }
  if (c === 'b') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X + 24, Y + 40, 20, 7, 0, 0, 7); g.fill(); bush(g, X + 24, Y + 26, 19); }
  if (c === 'f') { g.fillStyle = '#8a5a3a'; g.fillRect(X + 4, Y + 10, 40, 32); g.fillStyle = '#5a3a22'; g.fillRect(X + 4, Y + 36, 40, 6); for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff6b9a', '#ffd34d', '#fff', '#b97dff'][i % 4]; g.beginPath(); g.arc(X + 10 + (i % 3) * 14, Y + 18 + Math.floor(i / 3) * 12, 4.5, 0, 7); g.fill(); } }
  if (c === 'r') rock(g, X, Y, x, y);
  if (c === 'R') rubble(g, X, Y, x, y);
  if (c === 'W') ruinWall(g, X, Y, x, y, world);
  if (c === 'F') { g.fillStyle = '#c9b48a'; g.fillRect(X, Y + 18, TILE, 5); g.fillRect(X, Y + 30, TILE, 5); for (const px of [6, 38]) g.fillRect(X + px, Y + 10, 5, 30); }
  if (c === 'M') { g.fillStyle = '#8a96a3'; g.fillRect(X, Y, TILE, TILE); g.strokeStyle = '#6a7683'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(X, Y + i * 12 + 6); g.lineTo(X + TILE, Y + i * 12 + 6); g.stroke(); } }
  if (c === 'H') { g.fillStyle = '#2a2a2a'; g.fillRect(X, Y, TILE, TILE); }
}
function bush(g, cx, cy, r) {
  const grd = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 2, cx, cy, r * 1.2);
  grd.addColorStop(0, '#7ed36a'); grd.addColorStop(1, '#2f7a32');
  g.fillStyle = grd;
  g.beginPath(); g.arc(cx - r * 0.45, cy + 2, r * 0.65, 0, 7); g.arc(cx + r * 0.45, cy + 2, r * 0.65, 0, 7); g.arc(cx, cy - r * 0.25, r * 0.75, 0, 7); g.fill();
}
function rock(g, X, Y, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X + 24, Y + 40, 20, 7, 0, 0, 7); g.fill();
  const grd = g.createLinearGradient(X, Y + 6, X, Y + 42); grd.addColorStop(0, '#a8a8a8'); grd.addColorStop(1, '#5f5f66');
  g.fillStyle = grd; g.beginPath(); g.moveTo(X + 6, Y + 38); g.lineTo(X + 10, Y + 16); g.lineTo(X + 24, Y + 6); g.lineTo(X + 40, Y + 14); g.lineTo(X + 44, Y + 38); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(X + 12, Y + 18); g.lineTo(X + 24, Y + 9); g.lineTo(X + 28, Y + 16); g.closePath(); g.fill();
}
function rubble(g, X, Y, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X + 24, Y + 40, 22, 7, 0, 0, 7); g.fill();
  const cols = ['#9a958c', '#7c776e', '#b0aaa0', '#6a665f'];
  for (let i = 0; i < 6; i++) {
    const a = hash2(x, y, 200 + i), b = hash2(x, y, 210 + i);
    g.fillStyle = cols[i % 4]; g.save(); g.translate(X + 8 + a * 32, Y + 16 + b * 20); g.rotate(a * 3); g.fillRect(-7, -5, 14, 10); g.restore();
  }
  g.strokeStyle = '#7a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + 12, Y + 14); g.lineTo(X + 22, Y + 30); g.moveTo(X + 34, Y + 10); g.lineTo(X + 30, Y + 28); g.stroke();
}
function ruinWall(g, X, Y, x, y, world) {
  const top = hash2(x, y, 300) * 16, sx = (hash2(x, y, 302) - 0.5) * 8, w = TILE - 4 - hash2(x, y, 303) * 10;
  const L = X + 2 + sx + (TILE - 4 - w) / 2;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(L + 4, Y + 40, w, 7);
  const grd = g.createLinearGradient(0, Y + 4 + top, 0, Y + 44); grd.addColorStop(0, '#a29e95'); grd.addColorStop(1, '#6f6c66');
  g.fillStyle = grd; g.beginPath(); g.moveTo(L, Y + 44); g.lineTo(L, Y + 8 + top + hash2(x, y, 304) * 6); g.lineTo(L + w * 0.4, Y + 4 + top); g.lineTo(L + w * 0.7, Y + 9 + top + hash2(x, y, 305) * 5); g.lineTo(L + w, Y + 6 + top); g.lineTo(L + w, Y + 44); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(L, Y + 10 + top, w, 3);
  g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1;
  for (let r = 0; r < 3; r++) { const yy = Y + 20 + r * 8; if (yy < Y + 10 + top) continue; g.beginPath(); g.moveTo(L, yy); g.lineTo(L + w, yy); g.stroke(); const bx = L + ((r * 13 + x * 7) % 20) + 6; g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx, yy + 8); g.stroke(); }
  g.strokeStyle = 'rgba(40,30,20,0.6)'; g.beginPath(); const cx0 = L + w * hash2(x, y, 306); g.moveTo(cx0, Y + 12 + top); g.lineTo(cx0 + 5, Y + 26); g.lineTo(cx0 - 3, Y + 38); g.stroke();
  if (hash2(x, y, 301) < 0.55) { g.fillStyle = '#5a8a3a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(L + hash2(x, y, 310 + k) * w, Y + 9 + top + hash2(x, y, 320 + k) * 6, 3 + hash2(x, y, 330 + k) * 3, 0, 7); g.fill(); } }
  if (hash2(x, y, 307) < 0.4) { g.fillStyle = '#7a7670'; g.beginPath(); g.ellipse(L + w + 4, Y + 42, 5, 3, 0, 0, 7); g.fill(); }
}
function drawWaterAnim(x, y, th, world) {
  const X = x * TILE, Y = y * TILE, t = Tick.time;
  ctx.save();
  ctx.beginPath(); ctx.rect(X, Y, TILE, TILE); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const ph = hash2(x, y, i) * 6.28;
    const yy = Y + 14 + i * 20 + Math.sin(t * 1.6 + ph) * 3;
    const xx = X + ((t * 14 + hash2(x, y, 9 + i) * 48) % 64) - 16;
    ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 8, yy - 4, xx + 16, yy); ctx.stroke();
  }
  // 물가 거품
  if (!World.layerS && !same(world, x, y - 1, '~')) { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.15 * Math.sin(t * 2 + x)) + ')'; ctx.fillRect(X, Y + 3 + Math.sin(t * 2 + x) * 1.5, TILE, 3); }
  ctx.restore();
}
function drawTallGrass(X, Y, c, th, x, y, front) {
  const t = Tick.time, nest = c === 'n', W0 = World;
  const cols = nest ? ['#4a0f22', '#6d1f35', '#8f2440', '#c23452'] : th === THEME.snow ? ['#4f6b62', '#6d8c80', '#93b2a6', '#e4f0f2'] : th === THEME.forest ? ['#1d5a1f', '#2a7028', '#3a8a34', '#5aa84a'] : ['#2a6e26', '#3a8a33', '#4fa244', '#78c45e'];
  const hi = nest ? '#ff6a85' : '#c4ef8a';
  // 이웃이 수풀이 아닌 쪽 가장자리는 듬성하게
  const nb = (dx, dy) => { const k = W0.tile(x + dx, y + dy); return k === c; };
  const eu = nb(0, -1), ed = nb(0, 1), el = nb(-1, 0), er = nb(1, 0);
  ctx.save();
  if (front) { ctx.beginPath(); ctx.rect(X - 8, Y + 24, TILE + 16, 34); ctx.clip(); }
  const N = 12;
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / 4), colI = i % 4;
    let bx = 6 + colI * 12 + (row % 2) * 6 + (hash2(x, y, 500 + i) - 0.5) * 8, by = 18 + row * 14 + (hash2(x, y, 520 + i) - 0.5) * 6;
    if ((!el && bx < 8) || (!er && bx > 40) || (!eu && by < 18) || (!ed && by > 46)) { if (hash2(x, y, 540 + i) < 0.55) continue; }
    const h = 19 + hash2(x, y, 560 + i) * 7, sway = Math.sin(t * 2.1 + (X + bx) * 0.05 + (Y + by) * 0.03) * (2.5 + h * 0.08);
    const col = cols[1 + (row === 2 ? 1 : 0) + (hash2(x, y, 580 + i) < 0.3 ? 1 : 0)];
    const px = X + bx, py = Y + by;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(px - 9, py + 3);
    ctx.quadraticCurveTo(px - 7, py - h * 0.5, px - 6 + sway * 0.8, py - h * 0.82);
    ctx.lineTo(px - 2.5, py - h * 0.25);
    ctx.quadraticCurveTo(px - 1, py - h * 0.6, px + sway, py - h);
    ctx.lineTo(px + 2.5, py - h * 0.25);
    ctx.quadraticCurveTo(px + 7, py - h * 0.45, px + 8 + sway * 0.7, py - h * 0.75);
    ctx.lineTo(px + 9, py + 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = cols[0]; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
    if (i % 2 === 0) { ctx.strokeStyle = hi; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.quadraticCurveTo(px, py - h * 0.6, px + 1 + sway, py - h + 1); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  if (nest && !front) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.15 * Math.sin(t * 3 + x + y); ctx.fillStyle = '#ff2a4a'; ctx.beginPath(); ctx.arc(X + 24, Y + 30, 7, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawAcid(x, y) {
  const X = x * TILE, Y = y * TILE, t = Tick.time;
  ctx.save();
  blobTile(ctx, World, x, y, '%', '#2f7a1a', 4, 16, '#163a0a');
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2 + x * 0.7 + y);
  blobTile(ctx, World, x, y, '%', '#7dff3a', 10, 16);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(220,255,160,0.75)';
  for (let i = 0; i < 2; i++) { const ph = (t * 0.8 + hash2(x, y, i)) % 1; ctx.beginPath(); ctx.arc(X + 10 + hash2(x, y, 5 + i) * 28, Y + 36 - ph * 20, 3 * (1 - ph), 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawCave(x, y) {
  const X = x * TILE, Y = y * TILE, t = Tick.time;
  ctx.save();
  ctx.fillStyle = '#0a0508'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 30, 22, 18, 0, Math.PI, 0); ctx.lineTo(X + 46, Y + 48); ctx.lineTo(X + 2, Y + 48); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(X + 24, Y + 40, 2, X + 24, Y + 40, 26); g.addColorStop(0, 'rgba(255,40,70,' + (0.5 + 0.2 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(255,40,70,0)');
  ctx.fillStyle = g; ctx.fillRect(X - 10, Y, 68, 48);
  ctx.restore();
}
// ---- 나무 / 첨탑 ----
const SPRITE_CACHE = {};
function cachedSprite(key, w, h, fn) {
  const k = key + '@' + SCALE;
  if (SPRITE_CACHE[k]) return SPRITE_CACHE[k];
  const c = document.createElement('canvas'); c.width = Math.ceil(w * SCALE); c.height = Math.ceil(h * SCALE);
  const g = c.getContext('2d'); g.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(g);
  SPRITE_CACHE[k] = c; return c;
}
function drawTallTile(c, x, y, th) {
  const X = x * TILE, Y = y * TILE;
  const v = Math.floor(hash2(x, y, 400) * 3);
  let spr;
  if (c === 'T') spr = cachedSprite('tree' + v + th.grass[0], 80, 92, g => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(40, 82, 28, 9, 0, 0, 7); g.fill();
    const tg = g.createLinearGradient(34, 0, 46, 0); tg.addColorStop(0, '#4e3520'); tg.addColorStop(0.5, '#7a5634'); tg.addColorStop(1, '#3e2a18');
    g.fillStyle = tg; g.beginPath(); g.moveTo(34, 82); g.lineTo(36, 52); g.lineTo(44, 52); g.lineTo(46, 82); g.closePath(); g.fill();
    const cols = th === THEME.forest ? ['#15461b', '#22612a', '#327a36', '#4f9a45', '#7cc060'] : ['#1f5a22', '#2e7a30', '#43943d', '#64b452', '#9ad874'];
    leafCluster(g, 40, 38, 27 + v * 2, v * 13 + 3, cols);
  });
  else if (c === 'P') spr = cachedSprite('pine' + v + (th.snow ? 's' : ''), 64, 88, g => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 80, 22, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3d22'; g.fillRect(28, 64, 8, 16);
    const cols = ['#173f22', '#1f5a2a', '#2c7436', '#3e8f45'];
    for (let i = 0; i < 4; i++) {
      const yy = 72 - i * 15, w = 27 - i * 5 + v, top = yy - 26;
      g.fillStyle = cols[0]; g.beginPath(); g.moveTo(32 - w - 1, yy + 2);
      for (let k = 0; k <= 6; k++) { const xx = 32 - w + (w * 2) * k / 6; g.lineTo(xx, yy + (k % 2 ? -3 : 2)); }
      g.lineTo(32, top - 1); g.closePath(); g.fill();
      g.fillStyle = cols[Math.min(3, i + 1)]; g.beginPath(); g.moveTo(32 - w + 2, yy - 1); g.quadraticCurveTo(26, yy - 10, 32, top); g.quadraticCurveTo(38, yy - 10, 32 + w - 2, yy - 1);
      for (let k = 6; k >= 0; k--) { const xx = 32 - w + 2 + (w * 2 - 4) * k / 6; g.lineTo(xx, yy - 1 + (k % 2 ? -3 : 0)); }
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,220,0.12)'; g.beginPath(); g.moveTo(32, top + 2); g.lineTo(32 - w * 0.6, yy - 3); g.lineTo(32 - w * 0.2, yy - 3); g.closePath(); g.fill();
      if (th.snow) { g.fillStyle = '#f4f9fc'; g.beginPath(); g.moveTo(32, top); g.lineTo(32 + w * 0.55, yy - 8); g.quadraticCurveTo(32, yy - 14, 32 - w * 0.55, yy - 8); g.closePath(); g.fill(); g.fillStyle = 'rgba(160,190,220,0.5)'; g.fillRect(32 - w * 0.5, yy - 9, w, 2); }
    }
  });
  else spr = cachedSprite('spire' + v, 64, 96, g => {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(32, 88, 24, 8, 0, 0, 7); g.fill();
    const grd = g.createLinearGradient(10, 0, 54, 0); grd.addColorStop(0, '#1c1620'); grd.addColorStop(0.5, '#3a3040'); grd.addColorStop(1, '#16111a');
    g.fillStyle = grd; g.beginPath(); g.moveTo(8, 90); g.lineTo(22 + v * 3, 12 + v * 6); g.lineTo(30, 30); g.lineTo(38, 4 + v * 4); g.lineTo(46, 34); g.lineTo(56, 90); g.closePath(); g.fill();
    g.strokeStyle = '#ff2a4a'; g.lineWidth = 2; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(26, 86); g.lineTo(30, 56); g.lineTo(36, 40); g.moveTo(40, 86); g.lineTo(40, 64); g.stroke(); g.globalAlpha = 1;
  });
  if (c === 'X') { ctx.save(); ctx.globalAlpha = 1; const k = 0.7 + hash2(x, y, 404) * 0.6, fl = hash2(x, y, 405) < 0.5; ctx.translate(X + 24 + (hash2(x, y, 406) - 0.5) * 26, Y + 48 + (hash2(x, y, 407) - 0.5) * 14); if (fl) ctx.scale(-1, 1); ctx.drawImage(spr, -32 * k, -96 * k, 64 * k, 96 * k); ctx.restore(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15 + 0.1 * Math.sin(Tick.time * 2 + x * 3 + y); ctx.fillStyle = '#ff2a4a'; ctx.beginPath(); ctx.arc(X + 26, Y + 20, 8, 0, 7); ctx.fill(); ctx.restore(); }
  else if (c === 'P') { const k = 0.9 + hash2(x, y, 401) * 0.25, w = 64 * k, h = 88 * k; ctx.drawImage(spr, X + 24 - w / 2 + (hash2(x, y, 402) - 0.5) * 8, Y + 48 - h + 8, w, h); }
  else {
    const W0 = World, nb = ['T', 'P'].includes(W0.tile(x - 1, y)) + ['T', 'P'].includes(W0.tile(x + 1, y)) + ['T', 'P'].includes(W0.tile(x, y - 1)) + ['T', 'P'].includes(W0.tile(x, y + 1));
    if (nb >= 3) {
      const d = cachedSprite('treeD' + v + th.grass[0], 80, 92, g => {
        const cols = ['#0f3814', '#18501e', '#256a2a', '#3a843a', '#5ea64e'];
        leafCluster(g, 40, 40, 31 + v * 2, v * 7 + 11, cols);
      });
      const k = 0.95 + hash2(x, y, 401) * 0.4, w = 80 * k, h = 92 * k, fl = hash2(x, y, 408) < 0.5;
      ctx.save(); ctx.translate(X + 24 + (hash2(x, y, 402) - 0.5) * 18, Y + 52 + (hash2(x, y, 403) - 0.5) * 12); if (fl) ctx.scale(-1, 1);
      ctx.drawImage(d, -w / 2, -h, w, h); ctx.restore();
      return;
    }
    const k = 0.92 + hash2(x, y, 401) * 0.22, w = 80 * k, h = 92 * k; ctx.drawImage(spr, X + 24 - w / 2 + (hash2(x, y, 402) - 0.5) * 10, Y + 52 - h + (hash2(x, y, 403) - 0.5) * 6, w, h); }
}
// ---- 건물 ----
// 원작 배경 에셋의 건물 외관 (스타일 기본값, 건물별 b.art로 덮어쓰기)
const BLD_ART = { lab: 'gym_gamma', center: 'center', shop: 'shop', house: 'house', gym: 'gym_gamma', champion: 'champion', factory: 'gym_epsilon' };
// 못 불러온 이미지(_bad, 크기 0)는 없는 것으로 취급해 절차적 그림으로 대신 그린다
function bldImg(k) { const im = IMG.bld[k] || lazyImg('bld', k); return im && !im._bad && im.width ? im : null; }
// 원작 건물 그림은 3/4 시점이라 옆면·지붕이 보여 탑다운 필드와 원근이 어긋난다 → 정면만 잘라 쓴다.
// [x0, y0, x1, y1] 은 원본 대비 비율, mirror 는 잘라 낸 정면 오른쪽에 좌우반전본을 이어 붙여 대칭 정면을 만든다
const BLD_FRONT = {
  school: [0.10, 0.08, 1, 1],
  center: [0.03, 0.13, 0.97, 1, 'ownDoor'], // 그림에 큰 출입구가 있으므로 유리문을 덧그리지 않는다
  shop: [0.18, 0, 1, 1, 'mirror'],
  house: [0, 0.19, 0.62, 1],
  champion: [0, 0.19, 0.62, 1],
  gym_gamma: [0.15, 0.07, 1, 1],
  gym_beta: [0, 0, 1, 0.70],
  gym_delta: [0.08, 0.06, 1, 1],
  gym_alpha: [0.08, 0.03, 0.52, 1, 'mirror'],
};
function frontImg(k, im) {
  const cr = BLD_FRONT[k]; if (!cr) return im;
  if (im._front) return im._front;
  const sx = Math.round(im.width * cr[0]), sy = Math.round(im.height * cr[1]), sw = Math.round(im.width * (cr[2] - cr[0])), sh = Math.round(im.height * (cr[3] - cr[1]));
  const mir = cr[4] === 'mirror';
  const c = document.createElement('canvas'); c.width = sw * (mir ? 2 : 1); c.height = sh;
  const g = c.getContext('2d');
  g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
  // 반전본은 잘린 오른쪽 끝끼리 맞닿도록 붙인다 (1px 겹쳐 이음매를 없앤다)
  if (mir) { g.save(); g.translate(sw * 2 - 1, 0); g.scale(-1, 1); g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh); g.restore(); }
  im._front = c;
  return c;
}
// 건물 실루엣 (그림자 투영용, 이미지마다 한 번 만든다)
function silhouette(im) {
  if (im._sil !== undefined) return im._sil;
  try {
    // 1/4 크기 실루엣을 만든 뒤 한 번 흐려 둔다 (부드러운 그림자 가장자리, 매 프레임 블러 비용 없음)
    const sw = Math.max(1, Math.round(im.width / 4)), sh = Math.max(1, Math.round(im.height / 4)), pad = 6;
    const a = document.createElement('canvas'); a.width = sw; a.height = sh;
    const ga = a.getContext('2d'); ga.drawImage(im, 0, 0, sw, sh); ga.globalCompositeOperation = 'source-in'; ga.fillStyle = '#000'; ga.fillRect(0, 0, sw, sh);
    const c = document.createElement('canvas'); c.width = sw + pad * 2; c.height = sh + pad * 2;
    const g = c.getContext('2d'); g.filter = 'blur(2.5px)'; g.drawImage(a, pad, pad);
    c._pad = pad / sw; // 여백 비율 (그릴 때 보정)
    im._sil = c;
  } catch (e) { im._sil = null; }
  return im._sil;
}
// 테마별 건물 기단(바닥과 닿는 판) 색
const FOUNDATION = { town: ['#cfc6b4', '#a89f8c'], route: ['#b9b3a6', '#8f897c'], forest: ['#a79a83', '#7d715d'], coast: ['#d7c79e', '#a99a72'], snow: ['#e9eef3', '#b9c4ce'], factory: ['#9a9fa6', '#6c7178'], resort: ['#f1e6d2', '#c9b897'], nest: ['#4a3c50', '#2c2232'] };
function drawBuildingArt(b, im, ownDoor) {
  const w = b.w * TILE, base = (b.y + b.h) * TILE + 6;
  let dw = w * 1.1, dh = im.height * dw / im.width;
  // 너무 높은 건물은 맵 위쪽으로 잘리지 않도록 줄인다
  const maxH = Math.min((b.h + 2.6) * TILE, base - 4); if (dh > maxH) { dw *= maxH / dh; dh = maxH; }
  const x = b.x * TILE + w / 2 - dw / 2;
  const fc = FOUNDATION[World.def && World.def.theme] || FOUNDATION.town;
  ctx.save();
  // 1) 왼쪽 위에서 비치는 해: 실루엣을 바닥에 눕혀 오른쪽 뒤로 드리운다
  const sil = silhouette(im);
  if (sil) {
    // 밑변을 축으로 높이를 0.32배로 눕히고 오른쪽으로 기울인다 (건물 뒤 오른편으로 그림자가 드리운다)
    // 눈밭처럼 밝은 바닥에서는 그림자를 옅게
    ctx.save(); ctx.globalAlpha = World.def && World.def.theme === 'snow' ? 0.13 : 0.24; ctx.translate(x, base); ctx.transform(1, 0, -0.55, 0.32, 0, 0);
    const px = dw * sil._pad, py = dh * sil._pad * (sil.width / sil.height);
    ctx.drawImage(sil, -px, -dh - py, dw + px * 2, dh + py * 2); ctx.restore();
  }
  // 2) 기단: 건물이 땅에 놓인 판
  const fx = x - 8, fw = dw + 16, fy = base - 12;
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; rrect(fx + 4, fy + 6, fw, 16, 6); ctx.fill();
  ctx.fillStyle = fc[1]; rrect(fx, fy + 2, fw, 16, 6); ctx.fill();
  ctx.fillStyle = fc[0]; rrect(fx, fy, fw, 12, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(fx + 6, fy + 1, fw - 12, 2);
  // 3) 건물
  ctx.drawImage(im, x, base - dh, dw, dh);
  // 4) 밑동 접촉 음영 (건물과 기단이 붙어 보이게)
  const ao = ctx.createLinearGradient(0, base - 22, 0, base - 4); ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = ao; ctx.fillRect(x, base - 22, dw, 18);
  // 5) 출입구: 문틀 + 유리문 + 안쪽 불빛 + 계단 디딤판 + 매트
  if (b.door >= 0) {
    const dx = b.door * TILE, by = base - 6;
    const lg = ctx.createRadialGradient(dx + 24, by + 10, 4, dx + 24, by + 10, 46); lg.addColorStop(0, 'rgba(255,226,160,0.38)'); lg.addColorStop(1, 'rgba(255,226,160,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg; ctx.fillRect(dx - 24, by - 30, 96, 70); ctx.restore();
    if (!ownDoor) {
      ctx.fillStyle = '#2b2f36'; rrect(dx + 5, by - 54, 38, 50, 4); ctx.fill();
      const gl = ctx.createLinearGradient(0, by - 50, 0, by - 6); gl.addColorStop(0, '#9fd8ec'); gl.addColorStop(1, '#ffe2a6');
      ctx.fillStyle = gl; ctx.fillRect(dx + 9, by - 50, 30, 44);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(dx + 11, by - 48); ctx.lineTo(dx + 19, by - 48); ctx.lineTo(dx + 11, by - 36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2f36'; ctx.fillRect(dx + 23, by - 50, 2, 44);
    }
    ctx.fillStyle = fc[0]; rrect(dx + 1, by - 6, 46, 10, 3); ctx.fill(); ctx.fillStyle = fc[1]; ctx.fillRect(dx + 1, by + 2, 46, 3);
    ctx.fillStyle = 'rgba(40,34,28,0.85)'; ctx.fillRect(dx + 9, by + 6, 30, 8); ctx.fillStyle = '#e8c547'; ctx.fillRect(dx + 9, by + 6, 30, 2);
  }
  if (b.label) {
    ctx.font = '700 13px ' + (typeof UI_FONT !== 'undefined' ? UI_FONT : 'sans-serif');
    const tw = ctx.measureText(b.label).width + 18, cx = (b.door >= 0 ? b.door * TILE + TILE / 2 : b.x * TILE + w / 2), cy = base - 6 - Math.min(dh * 0.42, 70);
    const st = { gym: '#ff4d8a', champion: '#c2457a', center: '#ff4d6a', shop: '#2a6fc4', lab: '#0fb8de', factory: '#4a5562', house: '#8a4a22' }[b.style] || '#334';
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(cx - tw / 2 + 2, cy - 11, tw, 22);
    ctx.fillStyle = st; ctx.fillRect(cx - tw / 2, cy - 13, tw, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(cx - tw / 2, cy - 13, tw, 2);
    txt(b.label, cx, cy + 3, { size: 13, weight: 800, align: 'center', color: '#fff', shadow: false });
  }
  ctx.restore();
}
function drawBuilding(b) {
  { const art = b.art || BLD_ART[b.style], im = art && bldImg(art); if (im && im.width) { drawBuildingArt(b, frontImg(art, im), (BLD_FRONT[art] || [])[4] === 'ownDoor'); return; } }
  const spr = cachedSprite('bld_' + b.style + b.w + 'x' + b.h + b.label, b.w * TILE, b.h * TILE + 30, g => {
    const w = b.w * TILE, h = b.h * TILE, top = 30;
    const st = {
      lab: { roof: ['#e8f4fb', '#9fc3d6'], wall: '#f4f8fb', trim: '#38c6e8', sign: '#0fb8de' },
      center: { roof: ['#ffffff', '#c8d6e0'], wall: '#f7fbfd', trim: '#ff5a7a', sign: '#ff4d6a' },
      shop: { roof: ['#5aa9ff', '#2a6fc4'], wall: '#eef3f8', trim: '#2a6fc4', sign: '#2a6fc4' },
      house: { roof: ['#ff9d5c', '#c4572a'], wall: '#f7efe2', trim: '#b5652e', sign: '#8a4a22' },
      tent: { roof: ['#9aa66a', '#5f6a3a'], wall: '#7d8752', trim: '#4a522a', sign: '#4a522a' },
      gym: { roof: ['#ffe36a', '#e3a21a'], wall: '#fffbea', trim: '#ff6f9a', sign: '#ff4d8a' },
      champion: { roof: ['#ff9ad0', '#c2457a'], wall: '#fff3f9', trim: '#ffb22e', sign: '#c2457a' },
      factory: { roof: ['#9aa3ad', '#5d6670'], wall: '#d8dde2', trim: '#e8c547', sign: '#4a5562' },
    }[b.style];
    g.translate(0, top);
    // 그림자
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(6, h - 8, w, 10);
    if (b.style === 'tent') {
      // 3/4 시점 군용 천막: 앞 삼각면 + 오른쪽 뒤로 뻗은 지붕면 + 열린 입구 + 줄과 말뚝
      const fx = w * 0.12, fw = w * 0.5, ridgeX = fx + fw / 2, ridgeY = -12, gnd = h - 6, back = w * 0.34;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(fx - 6, gnd + 4); g.lineTo(fx + fw + back + 10, gnd + 4); g.lineTo(fx + fw + back, gnd - 10); g.lineTo(fx + 4, gnd - 6); g.closePath(); g.fill();
      // 지붕 옆면 (안쪽으로 이어지는 경사면)
      const rg = g.createLinearGradient(ridgeX, ridgeY, fx + fw + back, gnd); rg.addColorStop(0, st.roof[0]); rg.addColorStop(1, st.roof[1]);
      g.fillStyle = rg; g.beginPath(); g.moveTo(ridgeX, ridgeY); g.lineTo(ridgeX + back, ridgeY - 10); g.lineTo(fx + fw + back, gnd - 12); g.lineTo(fx + fw, gnd); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { const k = i / 4; g.beginPath(); g.moveTo(ridgeX + back * k, ridgeY - 10 * k); g.lineTo(fx + fw + back * k, gnd - 12 * k); g.stroke(); }
      // 앞 삼각면
      const fg = g.createLinearGradient(0, ridgeY, 0, gnd); fg.addColorStop(0, '#8c975c'); fg.addColorStop(1, '#5f6a3a');
      g.fillStyle = fg; g.beginPath(); g.moveTo(fx, gnd); g.lineTo(ridgeX, ridgeY); g.lineTo(fx + fw, gnd); g.closePath(); g.fill();
      g.strokeStyle = '#3f4724'; g.lineWidth = 2; g.stroke();
      // 입구 (안쪽 그늘 + 젖혀진 덮개)
      g.fillStyle = '#1f2414'; g.beginPath(); g.moveTo(ridgeX - 16, gnd); g.lineTo(ridgeX, gnd - 44); g.lineTo(ridgeX + 16, gnd); g.closePath(); g.fill();
      g.fillStyle = '#a9b37a'; g.beginPath(); g.moveTo(ridgeX, gnd - 44); g.lineTo(ridgeX - 16, gnd); g.lineTo(ridgeX - 26, gnd - 6); g.closePath(); g.fill();
      // 버팀줄과 말뚝
      g.strokeStyle = 'rgba(230,220,190,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ridgeX, ridgeY); g.lineTo(fx - 12, gnd + 2); g.moveTo(ridgeX + back, ridgeY - 10); g.lineTo(fx + fw + back + 14, gnd - 6); g.stroke();
      g.fillStyle = '#5a4630'; g.fillRect(fx - 14, gnd - 2, 3, 7); g.fillRect(fx + fw + back + 12, gnd - 10, 3, 7);
      return;
    }
    const roofH = Math.min(h * 0.5, 74);
    // 벽
    g.fillStyle = st.wall; g.fillRect(4, roofH - 6, w - 8, h - roofH);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(4, h - 18, w - 8, 12);
    g.fillStyle = st.trim; g.fillRect(4, h - 8, w - 8, 4);
    // 창문
    const nW = Math.max(1, Math.floor((w - 40) / 62));
    for (let i = 0; i < nW + 1; i++) {
      const wx = 16 + i * ((w - 32 - 34) / Math.max(1, nW)), wy = roofH + 10;
      if (b.door >= 0 && Math.abs((wx + 17) - ((b.door - b.x) * TILE + 24)) < 34) continue;
      g.fillStyle = '#2b4a6a'; g.fillRect(wx, wy, 34, 26);
      g.fillStyle = 'rgba(160,230,255,0.55)'; g.fillRect(wx + 3, wy + 3, 28, 20);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(wx + 5, wy + 5, 8, 16);
    }
    // 지붕
    const grd = g.createLinearGradient(0, -20, 0, roofH);
    grd.addColorStop(0, st.roof[0]); grd.addColorStop(1, st.roof[1]);
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(-4, roofH); g.lineTo(14, -14); g.lineTo(w - 14, -14); g.lineTo(w + 4, roofH); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1;
    for (let yy = -6; yy < roofH; yy += 10) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(-4, roofH - 4, w + 8, 6);
    // 간판
    if (b.label) {
      g.font = font(18, 900); const tw = g.measureText(b.label).width + 30;
      const sx = w / 2 - tw / 2, sy = roofH - 30;
      g.fillStyle = st.sign; g.beginPath(); g.moveTo(sx + 8, sy); g.lineTo(sx + tw, sy); g.lineTo(sx + tw - 8, sy + 26); g.lineTo(sx, sy + 26); g.closePath(); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(b.label, w / 2, sy + 20);
      if (b.style === 'center') { g.fillStyle = '#ff4d6a'; g.fillRect(w - 40, 0, 8, 26); g.fillRect(w - 49, 9, 26, 8); }
    }
    // 문
    if (b.door >= 0) {
      const dx = (b.door - b.x) * TILE;
      g.fillStyle = '#3a4656'; g.fillRect(dx + 6, h - 50, 36, 46);
      g.fillStyle = st.style === 'house' ? '#7a4a22' : '#5ff4ff'; g.globalAlpha = 0.35; g.fillRect(dx + 9, h - 47, 30, 40); g.globalAlpha = 1;
      g.fillStyle = '#20262e'; g.fillRect(dx + 23, h - 47, 2, 40);
      g.fillStyle = '#ffb22e'; g.fillRect(dx + 4, h - 54, 40, 4);
    }
  });
  ctx.drawImage(spr, b.x * TILE, b.y * TILE - 30, b.w * TILE, b.h * TILE + 30);
}
// ---- 장식 ----
function drawSpriteDeco(d, art, k = 1.2, maxTiles = 4) {
  const im = bldImg(art); if (!im) return false;
  const w = d.w * TILE; let dw = w * k, dh = im.height * dw / im.width;
  if (dh > maxTiles * TILE) { dw *= maxTiles * TILE / dh; dh = maxTiles * TILE; }
  const bx = d.x * TILE + w / 2, by = (d.y + d.h) * TILE - 2;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(bx + 6, by - 2, dw * 0.35, 8, 0, 0, 7); ctx.fill();
  ctx.drawImage(im, bx - dw / 2, by - dh, dw, dh); ctx.restore();
  return true;
}
function drawDeco(d, world) {
  if (d.kind === 'sprite' && drawSpriteDeco(d, d.art, d.k || 1.2, d.max || 4)) return;
  if (d.kind === 'fountain' && drawSpriteDeco(d, 'fountain', 1.6, 2)) return;
  if (d.kind === 'lamp' && drawSpriteDeco(d, 'lamp', 0.9, 2.4)) return;
  if (d.kind === 'barrier' && bldImg('barricade')) { for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) drawSpriteDeco({ x: d.x + i, y: d.y + j, w: 1, h: 1 }, 'barricade', 1.15, 1.2); return; }
  const RP = d.prop || (ROOMS[world.id] && ROOMS[world.id].props[d.kind]);
  if (RP && drawRoomProp(d, RP)) return;
  const X = d.x * TILE, Y = d.y * TILE, w = d.w * TILE, h = d.h * TILE, t = Tick.time;
  ctx.save();
  switch (d.kind) {
    case 'fountain': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h - 10, w / 2, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#bdb6a6'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2 + 8, w / 2 - 2, h / 2 - 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3b93db'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2 + 6, w / 2 - 10, h / 2 - 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#9a9384'; ctx.fillRect(X + w / 2 - 7, Y + 10, 14, h / 2);
      for (let i = 0; i < 10; i++) { const a = (t * 2 + i * 0.63) % 1; const ang = i / 10 * Math.PI * 2; ctx.fillStyle = 'rgba(200,240,255,' + (1 - a) + ')'; ctx.beginPath(); ctx.arc(X + w / 2 + Math.cos(ang) * a * 30, Y + 12 + a * a * 40 - a * 22, 3, 0, 7); ctx.fill(); }
      break;
    }
    case 'orca': {
      const bob = Math.sin(t * 1.2) * 2;
      ctx.translate(0, bob);
      ctx.fillStyle = 'rgba(0,20,40,0.35)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h - 22, w / 2, 18, 0, 0, 7); ctx.fill();
      const grd = ctx.createLinearGradient(0, Y + 40, 0, Y + h); grd.addColorStop(0, '#2e3a4a'); grd.addColorStop(1, '#141a24');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(X + 10, Y + h - 30); ctx.quadraticCurveTo(X + 20, Y + 50, X + w * 0.4, Y + 52); ctx.lineTo(X + w - 30, Y + 56); ctx.quadraticCurveTo(X + w + 10, Y + 70, X + w - 10, Y + h - 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8edf2'; ctx.beginPath(); ctx.moveTo(X + 30, Y + h - 34); ctx.quadraticCurveTo(X + w / 2, Y + h - 20, X + w - 30, Y + h - 32); ctx.lineTo(X + w - 40, Y + h - 28); ctx.quadraticCurveTo(X + w / 2, Y + h - 14, X + 34, Y + h - 30); ctx.fill();
      ctx.fillStyle = '#263241'; ctx.fillRect(X + w * 0.45, Y + 20, 60, 36); ctx.fillStyle = '#38e1ff'; ctx.fillRect(X + w * 0.45 + 8, Y + 28, 44, 5);
      txt('ORCA', X + w * 0.28, Y + 90, { size: 22, weight: 900, color: '#e8edf2', shadow: false, family: TITLE_FONT });
      break;
    }
    case 'barrier': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X + 2, Y + h - 8, w - 4, 8);
      for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) {
        const bx = X + i * TILE, by = Y + j * TILE;
        ctx.fillStyle = '#3a3f46'; ctx.fillRect(bx + 6, by + 22, 5, 24); ctx.fillRect(bx + TILE - 11, by + 22, 5, 24);
        ctx.save(); ctx.beginPath(); ctx.rect(bx + 2, by + 12, TILE - 4, 14); ctx.clip();
        for (let k = -2; k < 8; k++) { ctx.fillStyle = k % 2 ? '#1c1c1c' : '#f2c230'; ctx.beginPath(); ctx.moveTo(bx + k * 10, by + 26); ctx.lineTo(bx + k * 10 + 10, by + 12); ctx.lineTo(bx + k * 10 + 20, by + 12); ctx.lineTo(bx + k * 10 + 10, by + 26); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = '#ff3a4a'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5 + i); ctx.beginPath(); ctx.arc(bx + TILE / 2, by + 9, 3.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      }
      break;
    }
    case 'hatch': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2 + 4, w / 2, h / 2 - 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5d6670'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2, w / 2 - 4, h / 2 - 6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3a4048'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 12, Y + h / 2); ctx.lineTo(X + w - 12, Y + h / 2); ctx.moveTo(X + w / 2, Y + 10); ctx.lineTo(X + w / 2, Y + h - 10); ctx.stroke();
      if (Game.flags.resortRed) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,70,' + (0.25 + 0.2 * Math.sin(t * 4)) + ')'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2, w / 2, h / 2, 0, 0, 7); ctx.fill(); }
      break;
    }
    case 'lamp': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 42, 10, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a4656'; ctx.fillRect(X + 21, Y - 26, 6, 68);
      ctx.fillStyle = '#2a3442'; ctx.fillRect(X + 14, Y - 34, 20, 10);
      ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(X + 24, Y - 24, 2, X + 24, Y - 24, 30); g.addColorStop(0, 'rgba(255,220,140,0.8)'); g.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = g; ctx.fillRect(X - 10, Y - 60, 70, 70);
      break;
    }
    case 'car': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + 42, w / 2, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a4a3a'; rrect(X + 4, Y + 14, w - 8, 26, 6); ctx.fill();
      ctx.fillStyle = '#5a3a2e'; rrect(X + 20, Y + 2, w - 44, 18, 5); ctx.fill();
      ctx.fillStyle = 'rgba(150,200,220,0.4)'; ctx.fillRect(X + 24, Y + 5, w - 52, 10);
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(X + 20, Y + 40, 7, 0, 7); ctx.arc(X + w - 20, Y + 40, 7, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(80,120,40,0.7)'; ctx.beginPath(); ctx.arc(X + w - 18, Y + 16, 8, 0, 7); ctx.fill();
      break;
    }
    case 'boat': {
      // 물 위에 뜬 작은 범선 (3/4 시점: 갑판이 보이는 선체 + 돛 두 장 + 물결)
      const bob = Math.sin(t * 1.5) * 3, roll = Math.sin(t * 1.1) * 0.03;
      ctx.fillStyle = 'rgba(10,40,70,0.35)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + 70, w / 2 + 6, 9, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.2 * Math.sin(t * 2)) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(X + w / 2, Y + 68, w / 2 + 2, 7, 0, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.translate(X + w / 2, Y + 60 + bob); ctx.rotate(roll); ctx.translate(-(X + w / 2), -(Y + 60));
      const hullL = X + 4, hullR = X + w - 4;
      // 선체 옆면
      const hg = ctx.createLinearGradient(0, Y + 44, 0, Y + 70); hg.addColorStop(0, '#9a6a44'); hg.addColorStop(1, '#5a3a24');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(hullL - 6, Y + 44); ctx.lineTo(hullR + 10, Y + 42); ctx.quadraticCurveTo(hullR + 2, Y + 66, hullR - 14, Y + 70); ctx.lineTo(hullL + 12, Y + 70); ctx.quadraticCurveTo(hullL - 2, Y + 60, hullL - 6, Y + 44); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e2d0'; ctx.fillRect(hullL, Y + 52, hullR - hullL, 3);
      // 갑판 (위에서 비스듬히 보이는 면)
      ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.moveTo(hullL - 6, Y + 44); ctx.lineTo(hullR + 10, Y + 42); ctx.lineTo(hullR - 2, Y + 36); ctx.lineTo(hullL + 4, Y + 37); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(90,60,30,0.45)'; ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(hullL + i * (w / 4), Y + 37); ctx.lineTo(hullL - 4 + i * (w / 4), Y + 44); ctx.stroke(); }
      // 돛대와 돛
      const mx = X + w / 2 - 2;
      ctx.fillStyle = '#6a4a2e'; ctx.fillRect(mx, Y - 22, 4, 62);
      const sg = ctx.createLinearGradient(mx, 0, mx + 44, 0); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#dfe6ee');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(mx + 5, Y - 18); ctx.quadraticCurveTo(mx + 48, Y + 6, mx + 40, Y + 32); ctx.lineTo(mx + 5, Y + 32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eef2f6'; ctx.beginPath(); ctx.moveTo(mx - 1, Y - 12); ctx.quadraticCurveTo(mx - 26, Y + 10, mx - 22, Y + 32); ctx.lineTo(mx - 1, Y + 32); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.moveTo(mx + 5, Y + 8); ctx.lineTo(mx + 42, Y + 10); ctx.stroke();
      ctx.fillStyle = '#ff4d6a'; ctx.beginPath(); ctx.moveTo(mx + 4, Y - 22); ctx.lineTo(mx + 18, Y - 18); ctx.lineTo(mx + 4, Y - 14); ctx.closePath(); ctx.fill();
      break;
    }
    case 'lighthouse': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h - 6, w / 2, 10, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X + 14, Y + h - 6); ctx.lineTo(X + 28, Y - 60); ctx.lineTo(X + w - 28, Y - 60); ctx.lineTo(X + w - 14, Y + h - 6); ctx.closePath();
      ctx.save(); ctx.clip(); for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#e8e8e8' : '#d0414a'; ctx.fillRect(X, Y - 60 + i * 26, w, 26); } ctx.restore();
      ctx.fillStyle = '#2a3442'; ctx.fillRect(X + 22, Y - 92, w - 44, 34); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(X + 28, Y - 86, w - 56, 22);
      ctx.fillStyle = '#c0353e'; ctx.beginPath(); ctx.moveTo(X + 18, Y - 92); ctx.lineTo(X + w / 2, Y - 116); ctx.lineTo(X + w - 18, Y - 92); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18;
      const ang = t * 0.8; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.moveTo(X + w / 2, Y - 75); ctx.lineTo(X + w / 2 + Math.cos(ang) * 400, Y - 75 + Math.sin(ang) * 60 - 40); ctx.lineTo(X + w / 2 + Math.cos(ang) * 400, Y - 75 + Math.sin(ang) * 60 + 40); ctx.closePath(); ctx.fill();
      break;
    }
    case 'log': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 40, 24, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5230'; rrect(X - 4, Y + 16, 56, 22, 10); ctx.fill(); ctx.fillStyle = '#c9a070'; ctx.beginPath(); ctx.ellipse(X + 48, Y + 27, 6, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4f9a45'; ctx.beginPath(); ctx.arc(X + 12, Y + 16, 6, 0, 7); ctx.fill();
      break;
    }
    case 'nestcore': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(X + w / 2, Y + h / 2, 4, X + w / 2, Y + h / 2, 90); g.addColorStop(0, 'rgba(255,40,70,' + (0.6 + 0.3 * pulse) + ')'); g.addColorStop(1, 'rgba(255,40,70,0)');
      ctx.fillStyle = g; ctx.fillRect(X - 60, Y - 60, w + 120, h + 120);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#2a0a12'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2, w / 2 - 6, h / 2 - 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff2a4a'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + h / 2, 14 + pulse * 4, 18 + pulse * 4, 0, 0, 7); ctx.fill();
      break;
    }
    case 'shelf': {
      ctx.fillStyle = '#5a4632'; ctx.fillRect(X + 2, Y + 2, w - 4, h + 6);
      for (let r = 0; r < 3; r++) { ctx.fillStyle = '#3e2f20'; ctx.fillRect(X + 4, Y + 6 + r * 14, w - 8, 2); for (let i = 0; i < w / 9; i++) { ctx.fillStyle = ['#c0353e', '#2a6fc4', '#e8c547', '#4fa845'][(i + r + d.x) % 4]; ctx.fillRect(X + 6 + i * 9, Y + 8 + r * 14 - 0, 6, 11); } }
      break;
    }
    case 'machine': {
      ctx.fillStyle = '#2b3a4f'; ctx.fillRect(X + 2, Y + 2, w - 4, h + 8);
      for (let i = 0; i < d.w * 2; i++) { ctx.fillStyle = (Math.floor(t * 3 + i) % 3) ? '#38e1ff' : '#ff4d6a'; ctx.fillRect(X + 10 + i * 22, Y + 10, 8, 4); }
      ctx.fillStyle = 'rgba(56,225,255,0.4)'; ctx.fillRect(X + 8, Y + 20, w - 16, 18);
      ctx.strokeStyle = '#5ff4ff'; ctx.beginPath(); for (let i = 0; i < w - 16; i += 4) ctx.lineTo(X + 8 + i, Y + 29 + Math.sin(i * 0.2 + t * 6) * 6); ctx.stroke();
      break;
    }
    case 'healer': {
      ctx.fillStyle = '#e8edf2'; rrect(X + 6, Y + 4, w - 12, h + 4, 8); ctx.fill();
      ctx.fillStyle = '#ff4d6a'; ctx.fillRect(X + w / 2 - 3, Y + 12, 6, 20); ctx.fillRect(X + w / 2 - 10, Y + 19, 20, 6);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3); ctx.fillStyle = '#5dff9c'; ctx.fillRect(X + 10, Y + 38, w - 20, 6);
      break;
    }
    case 'plant': {
      ctx.fillStyle = '#8a5a3a'; ctx.fillRect(X + 14, Y + 26, 20, 18); bush(ctx, X + 24, Y + 18, 16); break;
    }
    case 'desk': {
      ctx.fillStyle = '#6a4a2e'; ctx.fillRect(X + 4, Y + 20, w - 8, h - 24); ctx.fillStyle = '#8a6a44'; ctx.fillRect(X + 4, Y + 16, w - 8, 10);
      ctx.fillStyle = '#1c2632'; ctx.fillRect(X + w / 2 - 26, Y - 8, 52, 30); ctx.fillStyle = '#38e1ff'; ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 2); ctx.fillRect(X + w / 2 - 22, Y - 4, 44, 22);
      break;
    }
  }
  ctx.restore();
}
// ---- 엔티티 ----
const NPC_COLORS = ['#3a5f9a', '#9a3a5f', '#3a8a6a', '#7a4a9a', '#9a6a2a', '#2a7a9a', '#5a5a6a', '#a04040'];
function npcColor(key) { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0; return NPC_COLORS[Math.abs(h) % NPC_COLORS.length]; }
function drawEnt(e) {
  const o = e.o, X = e.px, Y = e.py;
  if (e.kind === 'npc' || e.kind === 'trainer') { if (!(window.SDF && SDF.draw(e, X + 24, Y + 46, e.alpha != null ? e.alpha : 1))) drawStandee(X, Y, o.sprite, e.dir, e.moving ? e.prog * 6 : Math.sin(e.bob * 2) * 0.5, e, o.boss); }
  else if (e.kind === 'item') {
    const b = Math.sin(e.bob * 3) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 38, 11, 4, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(e.bob * 4); const g = ctx.createRadialGradient(X + 24, Y + 26, 1, X + 24, Y + 26, 20); g.addColorStop(0, '#5ff4ff'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(X, Y, 48, 48); ctx.restore();
    itemIcon('core', X + 24, Y + 26 + b, 22);
  }
  else if (e.kind === 'sign') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 42, 14, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4a2e'; ctx.fillRect(X + 21, Y + 22, 6, 20);
    ctx.fillStyle = '#2a3442'; rrect(X + 6, Y + 4, 36, 24, 3); ctx.fill(); ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#38e1ff'; ctx.fillRect(X + 12, Y + 11, 24, 2); ctx.fillRect(X + 12, Y + 17, 16, 2);
  }
  else if (e.kind === 'obj') drawObj(e);
  else if (e.kind === 'starter') {
    const b = Math.sin(e.bob * 2.5 + e.x) * 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(X + 24, Y + 18, 2, X + 24, Y + 18, 26); g.addColorStop(0, TYPES[SPECIES[o.sp].types[0]].color); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.globalAlpha = 0.6; ctx.fillRect(X - 6, Y - 12, 60, 60); ctx.restore();
    itemIcon('core', X + 24, Y + 16 + b, 28);
  }
  else if (e.kind === 'legend') {
    const b = Math.sin(e.bob * 2) * 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(X + 24, Y + 10, 2, X + 24, Y + 10, 60); g.addColorStop(0, 'rgba(255,107,154,0.7)'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(X - 40, Y - 60, 128, 128); ctx.restore();
    if (!(window.SDF && SDF.draw(e, X + 24, Y + 46 + b))) drawStandee(X, Y + b - 6, o.species, 'down', 0, e, true);
  }
  if (e.exclaim > 0) {
    const s = Ease.outBack(clamp((0.9 - e.exclaim) / 0.2, 0, 1));
    ctx.save(); ctx.translate(X + 24, Y - 44); ctx.scale(s, s);
    ctx.fillStyle = '#fff'; rrect(-14, -18, 28, 32, 6); ctx.fill(); ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 2; ctx.stroke();
    txt('!', 0, 9, { size: 26, weight: 900, align: 'center', color: '#ff4d5e', shadow: false });
    ctx.restore();
  } else if (window.Quests) Quests.drawEntMarker(e);
}
function drawObj(e) {
  const k = e.o.kind, X = e.px, Y = e.py, t = Tick.time;
  if (k === 'pc') {
    ctx.fillStyle = '#2b3a4f'; ctx.fillRect(X + 6, Y - 6, 36, 50); ctx.fillStyle = '#1c2632'; ctx.fillRect(X + 10, Y - 2, 28, 22);
    ctx.fillStyle = '#38e1ff'; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3); ctx.fillRect(X + 12, Y, 24, 18); ctx.globalAlpha = 1;
    ctx.fillStyle = '#5ff4ff'; ctx.fillRect(X + 12, Y + 26, 24, 3);
  } else if (k === 'bikepart') {
    // 버려진 차 옆 엔진 부품 (반짝임으로 조사할 수 있음을 알린다)
    const b = Math.sin(t * 3) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 40, 14, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a4f57'; rrect(X + 10, Y + 20 + b, 28, 18, 4); ctx.fill();
    ctx.fillStyle = '#7a828c'; ctx.fillRect(X + 13, Y + 23 + b, 22, 4); ctx.fillRect(X + 13, Y + 29 + b, 22, 3);
    ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(X + 34, Y + 22 + b, 5, 0, 7); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 5); ctx.fillStyle = '#fff6c0';
    ctx.beginPath(); ctx.moveTo(X + 24, Y + 6 + b); ctx.lineTo(X + 27, Y + 14 + b); ctx.lineTo(X + 24, Y + 22 + b); ctx.lineTo(X + 21, Y + 14 + b); ctx.closePath(); ctx.fill(); ctx.restore();
  } else if (k === 'healpod') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X + 24, Y + 42, 20, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8e2ea'; rrect(X + 8, Y - 14, 32, 56, 14); ctx.fill(); ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(93,255,156,' + (0.4 + 0.25 * Math.sin(t * 3)) + ')'; rrect(X + 13, Y - 8, 22, 34, 9); ctx.fill();
    ctx.fillStyle = '#ff4d6a'; ctx.fillRect(X + 21, Y + 30, 6, 8); ctx.fillRect(X + 18, Y + 33, 12, 3);
  } else if (k === 'bed') {
    // 다른 소품(정면 3/4 시점)과 같은 시점: 벽에 붙은 헤드보드 + 위에서 비스듬히 보이는 상판 + 앞쪽 옆면
    const L = X + 4, R = X + 92, top = Y + 8, front = Y + 70, foot = Y + 90;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(X + 50, foot + 4, 50, 9, 0, 0, 7); ctx.fill();
    // 헤드보드
    const hb = ctx.createLinearGradient(0, Y - 30, 0, top + 14); hb.addColorStop(0, '#7a5a3e'); hb.addColorStop(1, '#4e3826');
    ctx.fillStyle = hb; rrect(L - 2, Y - 30, R - L + 4, top + 14 - (Y - 30), 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(L + 4, Y - 26, R - L - 8, 3);
    // 침대 틀 옆면과 다리
    ctx.fillStyle = '#5a4230'; ctx.fillRect(L, front, R - L, foot - front - 6);
    ctx.fillStyle = '#3e2c1e'; ctx.fillRect(L + 2, foot - 8, 8, 10); ctx.fillRect(R - 10, foot - 8, 8, 10);
    // 매트리스 상판 (깊이 방향으로 납작하게)
    ctx.fillStyle = '#eef2f6'; ctx.fillRect(L + 2, top, R - L - 4, front - top);
    ctx.fillStyle = '#d6dde4'; ctx.fillRect(L + 2, front - 4, R - L - 4, 10);
    // 베개
    ctx.fillStyle = '#ffffff'; rrect(L + 12, top + 3, R - L - 24, 15, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(L + 14, top + 14, R - L - 28, 3);
    // 이불: 상판 아래쪽을 덮고 앞면으로 흘러내린다
    const bl = ctx.createLinearGradient(0, top + 24, 0, front + 12); bl.addColorStop(0, '#4a82b8'); bl.addColorStop(1, '#2e5d8e');
    ctx.fillStyle = bl; ctx.beginPath(); ctx.moveTo(L + 2, top + 26); ctx.lineTo(R - 2, top + 26); ctx.lineTo(R - 2, front + 12); ctx.lineTo(L + 2, front + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9f1f8'; ctx.fillRect(L + 2, top + 24, R - L - 4, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L + 20, top + 36); ctx.quadraticCurveTo(X + 48, top + 44, R - 20, top + 38); ctx.stroke();
  }
}
function drawStandee(X, Y, key, dir, walk, e, big) {
  const bob = Math.abs(Math.sin(walk * Math.PI)) * 3;
  const cx = X + 24, foot = Y + 44;
  const col = npcColor(key);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(cx, foot - 2, 15, 5, 0, 0, 7); ctx.fill();
  // 다리
  const sw = Math.sin(walk * Math.PI) * 3;
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(cx - 7, foot - 14 + Math.max(0, sw), 5, 12 - Math.max(0, sw)); ctx.fillRect(cx + 2, foot - 14 + Math.max(0, -sw), 5, 12 - Math.max(0, -sw));
  // 몸
  ctx.translate(0, -bob);
  const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0); g.addColorStop(0, col); g.addColorStop(1, shade(col, -30));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 9, foot - 30); ctx.lineTo(cx + 9, foot - 30); ctx.lineTo(cx + 13, foot - 12); ctx.lineTo(cx - 13, foot - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 5, foot - 30); ctx.lineTo(cx, foot - 24); ctx.lineTo(cx + 5, foot - 30); ctx.closePath(); ctx.fill();
  // 머리 (아이콘)
  const r = big ? 19 : 16;
  const hy = foot - 30 - r + 4;
  iconCircle(key, cx + (dir === 'left' ? -2 : dir === 'right' ? 2 : 0), hy, r, { border: big ? '#ff6b9a' : '#fff', lw: big ? 3 : 2.5, zoom: 1.15, dy: 2 });
  ctx.restore();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// =====================================================================
//  분위기 패스: 맵별 빛 / 색보정
// =====================================================================
const ATMOS = {
  town:   { sun: 'rgba(255,236,190,0.16)', shade: 'rgba(20,40,70,0.10)', spots: 0 },
  route:  { sun: 'rgba(255,230,180,0.18)', shade: 'rgba(30,40,60,0.12)', spots: 0 },
  forest: { sun: 'rgba(255,240,170,0.10)', shade: 'rgba(0,30,10,0.28)', spots: 1 },
  coast:  { sun: 'rgba(255,225,170,0.22)', shade: 'rgba(20,50,90,0.10)', spots: 0 },
  snow:   { sun: 'rgba(225,242,255,0.20)', shade: 'rgba(40,60,110,0.16)', spots: 0 },
  factory:{ sun: 'rgba(255,215,160,0.14)', shade: 'rgba(25,25,30,0.24)', spots: 0 },
  resort: { sun: 'rgba(255,205,225,0.20)', shade: 'rgba(60,20,60,0.10)', spots: 0 },
  nest:   { sun: 'rgba(255,40,70,0.10)', shade: 'rgba(30,0,20,0.25)', spots: 0, rim: 1 },
};
let _spotCanvas = null;
function drawAtmosWorld(w, cx, cy) {
  const A = ATMOS[w.def.theme]; if (!A || w.def.indoor || !A.spots) return;
  // 숲: 나뭇잎 사이로 떨어지는 햇빛 얼룩 (월드 고정, 천천히 흔들림)
  if (!_spotCanvas) {
    _spotCanvas = document.createElement('canvas'); _spotCanvas.width = _spotCanvas.height = 512;
    const g = _spotCanvas.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = hash2(i, 1, 801) * 512, y = hash2(i, 2, 801) * 512, r = 30 + hash2(i, 3, 801) * 60;
      for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(255,240,170,0.5)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x + ox, y + oy, r, r * 0.7, 0.4, 0, 7); g.fill();
      }
    }
  }
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.75 + 0.15 * Math.sin(Tick.time * 0.7);
  const sx = Math.sin(Tick.time * 0.35) * 10, sy = Math.cos(Tick.time * 0.28) * 6;
  ctx.fillStyle = ctx.createPattern(_spotCanvas, 'repeat');
  ctx.translate(sx, sy); ctx.fillRect(cx - 40, cy - 40, W + 80, H + 80);
  ctx.restore();
}
function drawAtmosScreen(w) {
  const A = ATMOS[w.def.theme]; if (!A || w.def.indoor) return;
  ctx.save();
  // 좌상단 햇빛 → 우하단 그늘
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, A.sun); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, A.shade);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 가장자리 비네트
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, A.rim ? 'rgba(90,0,25,0.35)' : 'rgba(0,10,20,0.22)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
