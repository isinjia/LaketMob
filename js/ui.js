// =====================================================================
//  라켓몬스터 - UI 시스템 (위젯 스택 / 대화창 / 메뉴 / 각종 화면)
// =====================================================================
const UI = {
  stack: [],
  push(w) { this.stack.push(w); w.openT = 0; w._fresh = true; return new Promise(r => { w._resolve = r; }); },
  close(w, v) { const i = this.stack.indexOf(w); if (i >= 0) this.stack.splice(i, 1); if (w._resolve) { const r = w._resolve; w._resolve = null; r(v); } },
  top() { return this.stack[this.stack.length - 1]; },
  busy() { return this.stack.length > 0; },
  update(dt) {
    for (const w of this.stack) w.openT += dt;
    const t = this.top(); if (t && t.update) { if (t._fresh) t._fresh = false; else t.update(dt); }
  },
  draw() { for (const w of this.stack) if (w.draw) w.draw(); },
};

// ---------------------------------------------------------------------
//  리스트 선택 헬퍼 (키보드 + 마우스)
// ---------------------------------------------------------------------
class ListNav {
  constructor(n, o = {}) { this.n = n; this.i = o.start || 0; this.cols = o.cols || 1; this.rects = []; this.visible = o.visible || 999; this.scroll = 0; this.wrap = o.wrap !== false; }
  setN(n) { this.n = n; this.i = clamp(this.i, 0, Math.max(0, n - 1)); }
  // returns 'a' | 'b' | null
  update(dt, o = {}) {
    const n = this.n; if (n <= 0) { if (Input.pressed.b) return 'b'; return null; }
    const prev = this.i;
    const c = this.cols;
    if (Input.rep('down', dt)) this.i = this.i + c < n ? this.i + c : (this.wrap && c === 1 ? 0 : this.i);
    if (Input.rep('up', dt)) this.i = this.i - c >= 0 ? this.i - c : (this.wrap && c === 1 ? n - 1 : this.i);
    if (c > 1) {
      if (Input.rep('right', dt) && this.i % c < c - 1 && this.i + 1 < n) this.i++;
      if (Input.rep('left', dt) && this.i % c > 0) this.i--;
    }
    if (Input.mouse.moved) for (const r of this.rects) if (r && Input.mouse.x >= r.x && Input.mouse.x <= r.x + r.w && Input.mouse.y >= r.y && Input.mouse.y <= r.y + r.h) this.i = r.i;
    if (this.i !== prev) { Audio2.cursor(); if (o.onMove) o.onMove(this.i); }
    // 스크롤
    const row = Math.floor(this.i / c), vis = this.visible;
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + vis) this.scroll = row - vis + 1;
    if (Input.mouse.click) {
      for (const r of this.rects) if (r && Input.mouse.click.x >= r.x && Input.mouse.click.x <= r.x + r.w && Input.mouse.click.y >= r.y && Input.mouse.click.y <= r.y + r.h) { this.i = r.i; return 'a'; }
    }
    if (Input.pressed.a) return 'a';
    if (Input.pressed.b) return 'b';
    return null;
  }
  beginDraw() { this.rects = []; }
  rect(i, x, y, w, h) { this.rects.push({ i, x, y, w, h }); }
}

// ---------------------------------------------------------------------
//  대화창
// ---------------------------------------------------------------------
const BOX = { x: 16, y: 482, w: 928, h: 144 };
class Dialog {
  constructor(text, o = {}) {
    this.o = o;
    this.full = String(text);
    // 전투 중에는 캐릭터를 가리지 않는 얇은 대화창
    this.box = (typeof Battle !== 'undefined' && Scene instanceof Battle && typeof BDLG !== 'undefined' && !o.portrait) ? BDLG : BOX;
    this.slim = this.box !== BOX;
    const portrait = window.MobileField && MobileField.portrait;
    this.lines = wrapText(this.full, portrait ? W - 68 : this.box.w - 64, this.slim ? 20 : 23, 600);
    this.pages = [];
    this._portraitLayout=!!portrait;
    const per = portrait ? 5 : this.slim ? 2 : 3;
    for (let i = 0; i < this.lines.length; i += per) this.pages.push(this.lines.slice(i, i + per));
    this.page = 0; this.shown = 0; this.t = 0; this.doneT = 0; this.blip = 0;
  }
  get pageText() { return this.pages[this.page].join('\n'); }
  speed() { return [0, 32, 62, 140, 999][Settings.textSpeed] || 62; }
  update(dt) {
    const total = this.pageText.length;
    if (this.shown < total) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(total, this.shown + dt * this.speed());
      if (Math.floor(this.shown) > before && !this.o.silent) { this.blip += 1; if (this.blip % 2 === 0) Audio2.textBlip(); }
      if (Input.pressed.a || Input.mouse.click || (this.o.auto && Input.held.a)) this.shown = total;
      return;
    }
    if (this.o.hold && this.page === this.pages.length - 1) { if (!this.held) { this.held = true; if (this._resolve) { const r = this._resolve; this._resolve = null; r(); } } return; }
    this.doneT += dt;
    const adv = Input.pressed.a || Input.pressed.b || Input.mouse.click || (this.o.auto != null && this.doneT * 1000 >= this.o.auto);
    if (adv) {
      if (Input.pressed.a || Input.mouse.click) Audio2.cursor();
      if (this.page < this.pages.length - 1) { this.page++; this.shown = 0; this.doneT = 0; }
      else UI.close(this);
    }
  }
  draw() {
    const o = this.o, b = this.box || BOX;
    const appear = Ease.outCubic(clamp(this.openT / 0.15, 0, 1));
    ctx.save();
    ctx.globalAlpha = appear;
    // 초상화
    if (o.portrait && IMG.full[o.portrait]) {
      const img = IMG.full[o.portrait];
      const ph = 470, pw = 360;
      const slide = (1 - appear) * 60;
      const px = o.side === 'right' ? W - pw - 10 + slide : 10 - slide;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, b.y + 30); ctx.clip();
      // 상반신 위주로 크게
      const s = Math.max(pw / img.width, (ph * 1.7) / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.globalAlpha = appear;
      ctx.drawImage(img, px + (pw - dw) / 2, b.y + 40 - dh * 0.62, dw, dh);
      ctx.restore();
    }
    if (this.slim) glass(b.x, b.y, b.w, b.h, { c: 12, top: 'rgba(10,22,42,0.86)', bottom: 'rgba(6,12,24,0.9)' });
    else panel(b.x, b.y, b.w, b.h, { top: 'rgba(14,26,48,0.96)', bottom: 'rgba(6,12,24,0.97)' });
    if (o.speaker) {
      const nw = Math.max(120, measure(o.speaker, 20, 800) + 44);
      const nx = o.side === 'right' ? b.x + b.w - nw - 30 : b.x + 30;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(nx, b.y - 30); ctx.lineTo(nx + nw, b.y - 30); ctx.lineTo(nx + nw - 12, b.y + 2); ctx.lineTo(nx, b.y + 2); ctx.closePath();
      const g = ctx.createLinearGradient(nx, 0, nx + nw, 0); g.addColorStop(0, o.nameColor || '#ff9f1a'); g.addColorStop(1, '#ffcf4a');
      ctx.fillStyle = g; ctx.fill(); ctx.restore();
      txt(o.speaker, nx + 16, b.y - 7, { size: 20, weight: 800, color: '#1b1205', shadow: false });
    }
    const t = this.pageText.slice(0, Math.floor(this.shown)).split('\n');
    if (this.slim) t.forEach((ln, i) => txt(ln, b.x + 24, b.y + 34 + i * 28, { size: 20, weight: 600, color: UI_COL.text }));
    else t.forEach((ln, i) => txt(ln, b.x + 32, b.y + 46 + i * 34, { size: 23, weight: 600, color: UI_COL.text }));
    if (this.shown >= this.pageText.length && !(o.hold && this.page === this.pages.length - 1)) {
      const by = Math.sin(Tick.time * 8) * 3;
      ctx.fillStyle = UI_COL.line;
      ctx.beginPath(); ctx.moveTo(b.x + b.w - 40, b.y + b.h - 30 + by); ctx.lineTo(b.x + b.w - 24, b.y + b.h - 30 + by); ctx.lineTo(b.x + b.w - 32, b.y + b.h - 20 + by); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
function say(text, o = {}) { return UI.push(new Dialog(text, o)); }
async function sayAll(lines, o = {}) { for (const l of lines) await say(l, o); }
async function ask(text, options, o = {}) {
  const d = new Dialog(text, Object.assign({}, o, { hold: true }));
  const p = UI.push(d);
  await new Promise(r => { if (d.held) r(); else d._resolve = r; });
  // _resolve가 hold 해제용으로 쓰였으므로 다시 닫기 가능하도록 처리
  const res = await choose(options, Object.assign({ cancel: o.cancel !== false ? options.length - 1 : -1 }, o.choice || {}));
  UI.close(d);
  return res;
}

// ---------------------------------------------------------------------
//  선택지
// ---------------------------------------------------------------------
class Choice {
  constructor(options, o = {}) {
    this.options = options; this.o = o;
    this.nav = new ListNav(options.length, { start: o.start || 0 });
    ctx.font = font(22, 700);
    this.w = Math.max(160, ...options.map(s => ctx.measureText(s).width + 70));
    this.h = options.length * 42 + 24;
    this.x = o.x != null ? o.x : BOX.x + BOX.w - this.w - 6;
    this.y = o.y != null ? o.y : ((typeof Battle !== 'undefined' && Scene instanceof Battle && typeof BDLG !== 'undefined') ? BDLG.y : BOX.y) - this.h - 10;
  }
  update(dt) {
    const r = this.nav.update(dt);
    if (r === 'a') { Audio2.select(); Audio2.sfx('confirm', 0.35); UI.close(this, this.nav.i); }
    else if (r === 'b' && this.o.cancel != null && this.o.cancel >= 0) { Audio2.cancel(); UI.close(this, this.o.cancel); }
  }
  draw() {
    const a = Ease.outBack(clamp(this.openT / 0.16, 0, 1));
    ctx.save();
    ctx.translate(this.x + this.w, this.y + this.h); ctx.scale(a, a); ctx.translate(-(this.x + this.w), -(this.y + this.h));
    panel(this.x, this.y, this.w, this.h, { c: 10 });
    this.nav.beginDraw();
    this.options.forEach((s, i) => {
      const yy = this.y + 12 + i * 42;
      this.nav.rect(i, this.x, yy, this.w, 42);
      if (i === this.nav.i) {
        ctx.fillStyle = UI_COL.sel; ctx.fillRect(this.x + 6, yy + 3, this.w - 12, 36);
        ctx.fillStyle = UI_COL.line; ctx.beginPath(); const ax = this.x + 18 + Math.sin(Tick.time * 10) * 2; ctx.moveTo(ax, yy + 12); ctx.lineTo(ax + 12, yy + 21); ctx.lineTo(ax, yy + 30); ctx.closePath(); ctx.fill();
      }
      txt(s, this.x + 40, yy + 29, { size: 22, weight: 700, color: i === this.nav.i ? '#fff' : UI_COL.sub });
    });
    ctx.restore();
  }
}
function choose(options, o = {}) { return UI.push(new Choice(options, o)); }

// 수량 선택
class NumberPick {
  constructor(max, price, o = {}) { this.max = Math.max(1, max); this.n = 1; this.price = price; this.o = o; }
  update(dt) {
    const p = this.n;
    if (Input.rep('up', dt)) this.n = this.n >= this.max ? 1 : this.n + 1;
    if (Input.rep('down', dt)) this.n = this.n <= 1 ? this.max : this.n - 1;
    if (Input.rep('right', dt)) this.n = Math.min(this.max, this.n + 10);
    if (Input.rep('left', dt)) this.n = Math.max(1, this.n - 10);
    if (p !== this.n) Audio2.cursor();
    if (Input.pressed.a || Input.mouse.click) { Audio2.select(); UI.close(this, this.n); }
    else if (Input.pressed.b) { Audio2.cancel(); UI.close(this, 0); }
  }
  draw() {
    const x = 640, y = 300, w = 290, h = 110;
    panel(x, y, w, h, { c: 10 });
    txt('수량', x + 20, y + 34, { size: 18, color: UI_COL.sub });
    txt('× ' + String(this.n).padStart(2, '0'), x + 20, y + 80, { size: 34, weight: 800 });
    if (this.price) txt((this.n * this.price).toLocaleString() + ' P', x + w - 20, y + 80, { size: 26, weight: 800, align: 'right', color: UI_COL.accent });
    txt('▲▼ ±1  ◀▶ ±10', x + w - 20, y + 34, { size: 14, align: 'right', color: UI_COL.sub });
  }
}

// ---------------------------------------------------------------------
//  공통 배경
// ---------------------------------------------------------------------
function screenBG(title, sub) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0a1630'); g.addColorStop(1, '#050913');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 육각 그리드
  ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 1;
  const r = 26, hx = r * Math.sqrt(3);
  for (let yy = -r, row = 0; yy < H + r; yy += r * 1.5, row++) for (let xx = (row % 2) * hx / 2 - hx; xx < W + hx; xx += hx) {
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; ctx.lineTo(xx + Math.cos(a) * r, yy + Math.sin(a) * r); } ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
  // 흐르는 광선
  ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#38e1ff';
  const off = (Tick.time * 60) % 240;
  for (let i = -2; i < 8; i++) { ctx.beginPath(); const x0 = i * 240 + off; ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0); ctx.lineTo(x0 - 140, H); ctx.lineTo(x0 - 200, H); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  if (title) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, 58);
    ctx.fillStyle = UI_COL.line; ctx.fillRect(0, 57, W, 2);
    txt(title, 28, 40, { size: 28, weight: 900, family: TITLE_FONT });
    if (sub) txt(sub, W - 24, 38, { size: 16, align: 'right', color: UI_COL.sub });
  }
}
function helpLine(s) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, H - 34, W, 34);
  txt(s, W / 2, H - 11, { size: 15, align: 'center', color: UI_COL.sub, shadow: false });
}

// ---------------------------------------------------------------------
//  부대 화면
// ---------------------------------------------------------------------
class PartyScreen {
  // mode: 'view' | 'pick' (아이템 대상/교체 대상 선택: 인덱스 반환) | 'battle' (교체)
  constructor(mode = 'view', o = {}) {
    this.mode = mode; this.o = o;
    this.nav = new ListNav(Game.party.length, { cols: 2, wrap: false, start: o.start || 0 });
    this.swapFrom = -1;
  }
  async update(dt) {
    if (this.busy) return;
    this.nav.setN(Game.party.length);
    const r = this.nav.update(dt);
    if (r === 'b') {
      if (this.swapFrom >= 0) { this.swapFrom = -1; Audio2.cancel(); return; }
      if (this.o.forced) { Audio2.bump(); return; }
      Audio2.cancel(); UI.close(this, -1); return;
    }
    if (r !== 'a') return;
    Audio2.select();
    const i = this.nav.i, m = Game.party[i];
    if (this.swapFrom >= 0) {
      if (this.swapFrom !== i) { const t = Game.party[i]; Game.party[i] = Game.party[this.swapFrom]; Game.party[this.swapFrom] = t; Audio2.sfx('cloth', 0.6); }
      this.swapFrom = -1; return;
    }
    this.busy = true;
    try {
      if (this.mode === 'pick') { UI.close(this, i); return; }
      if (this.mode === 'battle') {
        const c = await choose(['출격', '상태 보기', '취소'], { cancel: 2, x: 700, y: 420 });
        if (c === 0) {
          if (m.hp <= 0) await say(J(m.name, '은') + ' 전투불능 상태다!', { auto: 1200 });
          else if (this.o.active === i) await say(J(m.name, '은') + ' 이미 전투 중이다!', { auto: 1200 });
          else { UI.close(this, i); return; }
        } else if (c === 1) await UI.push(new SummaryScreen(i));
        return;
      }
      const c = await choose(['상태 보기', '순서 변경', '취소'], { cancel: 2, x: 700, y: 420 });
      if (c === 0) { const ni = await UI.push(new SummaryScreen(i)); if (ni != null) this.nav.i = ni; }
      else if (c === 1) this.swapFrom = i;
    } finally { this.busy = false; }
  }
  draw() {
    screenBG(this.mode === 'pick' ? (this.o.title || '대상을 선택하세요') : '부대 편성', '출격 부대 ' + Game.party.length + ' / 6');
    const sel = Game.party[this.nav.i];
    // 우측 큰 일러스트
    if (sel) {
      const img = sel.art();
      ctx.save();
      const glow = ctx.createRadialGradient(780, 330, 20, 780, 330, 300);
      glow.addColorStop(0, TYPES[sel.types[0]].color + '55'); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(560, 60, 400, 560);
      ctx.restore();
      drawFit(img, 590, 70, 360, 520, { anchor: 'bottom', alpha: sel.hp > 0 ? 1 : 0.45 });
      txt(sel.name, 930, 590, { size: 28, weight: 900, align: 'right' });
    }
    this.nav.beginDraw();
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 24 + col * 272, y = 82 + row * 168, w = 260, h = 154;
      const m = Game.party[i];
      if (!m) {
        chamfer(x, y, w, h, 12); ctx.strokeStyle = 'rgba(56,225,255,0.18)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
        txt('— 빈 슬롯 —', x + w / 2, y + h / 2 + 6, { size: 16, align: 'center', color: 'rgba(143,179,201,0.5)' });
        continue;
      }
      this.nav.rect(i, x, y, w, h);
      const on = i === this.nav.i;
      const fainted = m.hp <= 0;
      panel(x, y, w, h, { c: 12, accent: this.swapFrom === i ? UI_COL.accent : on ? UI_COL.line : 'rgba(56,225,255,0.3)', top: on ? 'rgba(25,60,96,0.96)' : fainted ? 'rgba(50,16,24,0.92)' : undefined });
      if (on) { ctx.save(); chamfer(x, y, w, h, 12); ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 2 + Math.sin(Tick.time * 6); ctx.stroke(); ctx.restore(); }
      iconSquare(m.iconKey, x + 12, y + 14, 74, { gray: fainted });
      if (Game.party.indexOf(m) === (this.o.active != null ? this.o.active : -1)) txt('전투 중', x + 49, y + 104, { size: 13, align: 'center', color: UI_COL.accent, weight: 800 });
      txt(m.name, x + 98, y + 38, { size: 20, weight: 800 });
      rankBadge(m.rank, x + w - 36, y + 14, 24);
      txt('Lv.' + m.level, x + 98, y + 64, { size: 17, weight: 700, color: UI_COL.accent });
      m.types.forEach((t, k) => typeBadge(t, x + 150 + k * 50, y + 49, 46, 19, 12));
      bar(x + 98, y + 78, 146, 12, m.hp / m.maxHp, hpColors(m.hp / m.maxHp));
      txt(m.hp + ' / ' + m.maxHp, x + 244, y + 110, { size: 16, align: 'right', weight: 700 });
      if (m.status) statusBadge(m.status, x + 98, y + 94);
      if (fainted) txt('전투불능', x + 98, y + 110, { size: 15, color: UI_COL.red, weight: 800 });
      bar(x + 12, y + 132, w - 24, 6, m.expRatio(), ['#7cd9ff', '#2a8bd8']);
    }
    helpLine(this.swapFrom >= 0 ? '교체할 위치를 선택하세요 (X: 취소)' : '방향키: 이동   Z: 선택   X: 돌아가기');
  }
}

// ---------------------------------------------------------------------
//  상태 보기
// ---------------------------------------------------------------------
class SummaryScreen {
  constructor(i, o = {}) { this.i = i; this.tab = 0; this.moveI = 0; this.list = o.list || Game.party; this.anim = 0; }
  get m() { return this.list[this.i]; }
  update(dt) {
    this.anim += dt;
    if (Input.rep('right', dt)) { this.tab = (this.tab + 1) % 3; Audio2.cursor(); this.anim = 0; }
    if (Input.rep('left', dt)) { this.tab = (this.tab + 2) % 3; Audio2.cursor(); this.anim = 0; }
    if (this.tab === 2) {
      if (Input.rep('down', dt)) { this.moveI = (this.moveI + 1) % this.m.moves.length; Audio2.cursor(); }
      if (Input.rep('up', dt)) { this.moveI = (this.moveI + this.m.moves.length - 1) % this.m.moves.length; Audio2.cursor(); }
    } else {
      if (Input.rep('down', dt) && this.list.length > 1) { this.i = (this.i + 1) % this.list.length; Audio2.cursor(); this.anim = 0; this.moveI = 0; }
      if (Input.rep('up', dt) && this.list.length > 1) { this.i = (this.i + this.list.length - 1) % this.list.length; Audio2.cursor(); this.anim = 0; this.moveI = 0; }
    }
    if (Input.mouse.click) {
      const c = Input.mouse.click;
      if (c.y > 70 && c.y < 112 && c.x > 470) { this.tab = clamp(Math.floor((c.x - 470) / 156), 0, 2); Audio2.cursor(); }
      else if (c.x < 440) { UI.close(this, this.i); Audio2.cancel(); }
    }
    if (Input.pressed.b || Input.pressed.a && this.tab !== 2) { Audio2.cancel(); UI.close(this, this.i); }
  }
  draw() {
    const m = this.m, sp = SPECIES[m.key];
    screenBG('유닛 정보', 'No.' + String(sp.no).padStart(3, '0'));
    // 좌측 일러스트
    ctx.save();
    const g = ctx.createRadialGradient(230, 340, 10, 230, 340, 280);
    g.addColorStop(0, TYPES[m.types[0]].color + '66'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 60, 460, 580);
    ctx.restore();
    const a = Ease.outCubic(clamp(this.anim / 0.35, 0, 1));
    drawFit(m.art(), 20 - (1 - a) * 40, 70, 420, 500, { anchor: 'bottom', alpha: a });
    panel(20, 560, 420, 64, { c: 10 });
    txt(m.name, 40, 600, { size: 28, weight: 900 });
    rankBadge(m.rank, 250, 575, 30);
    txt('Lv.' + m.level, 420, 602, { size: 24, weight: 800, align: 'right', color: UI_COL.accent });
    // 탭
    const tabs = ['정보', '능력치', '기술'];
    tabs.forEach((t, k) => {
      const x = 470 + k * 156, on = k === this.tab;
      ctx.beginPath(); ctx.moveTo(x + 10, 72); ctx.lineTo(x + 150, 72); ctx.lineTo(x + 140, 110); ctx.lineTo(x, 110); ctx.closePath();
      ctx.fillStyle = on ? '#0fb8de' : 'rgba(15,184,222,0.15)'; ctx.fill();
      txt(t, x + 75, 99, { size: 19, weight: 800, align: 'center', color: on ? '#fff' : UI_COL.sub });
    });
    const px = 466, py = 122, pw = 474, ph = 470;
    panel(px, py, pw, ph);
    if (this.tab === 0) {
      const rows = [['도감 번호', 'No.' + String(sp.no).padStart(3, '0')], ['이름', m.name], ['타입', ''], ['등급', ''], ['소속', sp.faction || '-'], ['링크 사령관', m.ot || '사령관']];
      rows.forEach((r, k) => {
        const y = py + 44 + k * 42;
        txt(r[0], px + 24, y, { size: 17, color: UI_COL.sub });
        if (k === 2) m.types.forEach((t, j) => typeBadge(t, px + 170 + j * 70, y - 18, 64, 24, 14));
        else if (k === 3) { rankBadge(m.rank, px + 170, y - 20, 26); txt(m.rank === 'SS' ? '최고 등급' : '다음 승급 Lv.' + (PROMOTE_LV[m.rank] || '-'), px + 206, y, { size: 16, color: UI_COL.sub }); }
        else txt(r[1], px + 170, y, { size: 19, weight: 700 });
        ctx.fillStyle = 'rgba(56,225,255,0.12)'; ctx.fillRect(px + 20, y + 12, pw - 40, 1);
      });
      const ey = py + 300;
      txt('경험치', px + 24, ey, { size: 17, color: UI_COL.sub });
      txt(m.exp.toLocaleString(), px + pw - 24, ey, { size: 18, align: 'right', weight: 700 });
      txt('다음 레벨까지', px + 24, ey + 32, { size: 17, color: UI_COL.sub });
      txt(m.level >= 100 ? '-' : (expForLevel(m.level + 1) - m.exp).toLocaleString(), px + pw - 24, ey + 32, { size: 18, align: 'right', weight: 700 });
      bar(px + 24, ey + 46, pw - 48, 10, m.expRatio(), ['#7cd9ff', '#2a8bd8']);
      const tk = traitOf(m), tr = [tk && TRAITS[tk], TRAITS.rally].filter(Boolean);
      tr.forEach((T, k) => { const y = ey + 86 + k * 26; txt('◆ ' + T.name, px + 24, y, { size: 16, weight: 800, color: k === tr.length - 1 ? '#ff9f43' : '#7cf0ff' }); txt(T.desc, px + 130, y, { size: 14, weight: 500, color: '#cfe6f5' }); });
      wrapText(sp.desc, pw - 48, 16, 500).slice(0, 4 - tr.length).forEach((l, k) => txt(l, px + 24, ey + 92 + tr.length * 26 + k * 24, { size: 16, weight: 500, color: '#9fb8cc' }));
    } else if (this.tab === 1) {
      const st = [m.maxHp, m.atk, m.def, m.spd];
      const mx = [260, 200, 200, 200];
      txt('HP', px + 24, py + 50, { size: 18, color: UI_COL.sub });
      txt(m.hp + ' / ' + m.maxHp, px + pw - 24, py + 50, { size: 22, weight: 800, align: 'right' });
      bar(px + 24, py + 62, pw - 48, 14, m.hp / m.maxHp, hpColors(m.hp / m.maxHp));
      for (let k = 1; k < 4; k++) {
        const y = py + 110 + (k - 1) * 70;
        txt(STAT_NAMES[k], px + 24, y, { size: 18, color: UI_COL.sub });
        txt(String(st[k]), px + pw - 24, y, { size: 22, weight: 800, align: 'right' });
        bar(px + 24, y + 12, (pw - 48) * a, 10, st[k] / mx[k], ['#ffd76a', '#ff8a1a']);
      }
      // 레이더
      const cx = px + pw / 2, cy = py + 390, R = 64;
      const vals = sp.base.map(v => clamp(v / 130, 0.1, 1));
      ctx.save(); ctx.strokeStyle = 'rgba(56,225,255,0.3)'; ctx.lineWidth = 1;
      for (let ring = 1; ring <= 3; ring++) { ctx.beginPath(); for (let k = 0; k < 4; k++) { const an = -Math.PI / 2 + k * Math.PI / 2; ctx.lineTo(cx + Math.cos(an) * R * ring / 3, cy + Math.sin(an) * R * ring / 3); } ctx.closePath(); ctx.stroke(); }
      ctx.beginPath(); vals.forEach((v, k) => { const an = -Math.PI / 2 + k * Math.PI / 2; ctx.lineTo(cx + Math.cos(an) * R * v * a, cy + Math.sin(an) * R * v * a); }); ctx.closePath();
      ctx.fillStyle = 'rgba(56,225,255,0.35)'; ctx.fill(); ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 2; ctx.stroke();
      ['HP', '공격', '방어', '속도'].forEach((s, k) => { const an = -Math.PI / 2 + k * Math.PI / 2; txt(s, cx + Math.cos(an) * (R + 22), cy + Math.sin(an) * (R + 18) + 6, { size: 14, align: 'center', color: UI_COL.sub }); });
      ctx.restore();
      txt('종족 능력', px + 24, py + 330, { size: 15, color: UI_COL.sub });
    } else {
      m.moves.forEach((mv, k) => {
        const d = MOVES[mv.id], y = py + 18 + k * 74, on = k === this.moveI;
        chamfer(px + 16, y, pw - 32, 64, 10);
        ctx.fillStyle = on ? 'rgba(56,225,255,0.18)' : 'rgba(255,255,255,0.04)'; ctx.fill();
        if (on) { ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 2; ctx.stroke(); }
        typeBadge(d.type, px + 30, y + 10, 58, 22, 13);
        txt(d.name, px + 100, y + 29, { size: 21, weight: 800 });
        txt('PP ' + mv.pp + '/' + d.pp, px + pw - 32, y + 29, { size: 17, align: 'right', weight: 700, color: mv.pp === 0 ? UI_COL.red : '#fff' });
        txt(d.cat === 'atk' ? '위력 ' + d.pow + '   명중 ' + d.acc : '변화 기술' + (d.acc ? '   명중 ' + d.acc : ''), px + 100, y + 54, { size: 14, color: UI_COL.sub });
      });
      const d = MOVES[m.moves[this.moveI].id];
      const dy = py + 330;
      ctx.fillStyle = 'rgba(56,225,255,0.12)'; ctx.fillRect(px + 20, dy - 18, pw - 40, 1);
      wrapText(d.desc, pw - 48, 18, 500).forEach((l, k) => txt(l, px + 24, dy + 14 + k * 28, { size: 18, weight: 500, color: '#cfe6f5' }));
    }
    helpLine('◀▶ 탭 전환   ▲▼ ' + (this.tab === 2 ? '기술 선택' : '유닛 전환') + '   X: 돌아가기');
  }
}

// ---------------------------------------------------------------------
//  가방
// ---------------------------------------------------------------------
class BagScreen {
  constructor(mode = 'field') { this.mode = mode; this.refresh(); this.nav = new ListNav(this.items.length + 1, { visible: 8 }); }
  refresh() {
    this.items = ITEM_ORDER.filter(k => (Game.bag[k] || 0) > 0);
    if (this.nav) this.nav.setN(this.items.length + 1);
  }
  async update(dt) {
    if (this.busy) return;
    const r = this.nav.update(dt);
    if (r === 'b' || (r === 'a' && this.nav.i === this.items.length)) { Audio2.cancel(); UI.close(this, null); return; }
    if (r !== 'a') return;
    Audio2.select();
    const id = this.items[this.nav.i], it = ITEMS[id];
    this.busy = true;
    try {
      if (this.mode === 'battle') {
        if (it.kind === 'ball') { UI.close(this, { item: id }); return; }
        const t = await UI.push(new PartyScreen('pick', { title: J(it.name, '을') + ' 누구에게?' }));
        if (t >= 0) {
          const ok = Game.canUseItem(id, Game.party[t]);
          if (!ok) { await say('지금은 효과가 없다.', { auto: 1100 }); return; }
          UI.close(this, { item: id, target: t }); return;
        }
        return;
      }
      if (it.kind === 'ball') { await say('링크 코어는 전투 중에 사용할 수 있다.'); return; }
      const t = await UI.push(new PartyScreen('pick', { title: J(it.name, '을') + ' 누구에게 사용할까?' }));
      if (t >= 0) await Game.useItemField(id, Game.party[t]);
      this.refresh();
    } finally { this.busy = false; }
  }
  draw() {
    screenBG('가방', '보유 자원 ' + Game.money.toLocaleString() + ' P');
    panel(24, 76, 520, 520);
    this.nav.beginDraw();
    const vis = 8, start = this.nav.scroll;
    for (let k = 0; k < vis; k++) {
      const i = start + k; if (i > this.items.length) break;
      const y = 92 + k * 60, on = i === this.nav.i;
      this.nav.rect(i, 36, y, 496, 54);
      if (on) { chamfer(36, y, 496, 54, 8); ctx.fillStyle = UI_COL.sel; ctx.fill(); ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (i === this.items.length) { txt('닫기', 90, y + 35, { size: 21, weight: 700, color: on ? '#fff' : UI_COL.sub }); continue; }
      const id = this.items[i];
      itemIcon(id, 66, y + 27, 30);
      txt(ITEMS[id].name, 96, y + 35, { size: 21, weight: 700, color: on ? '#fff' : '#cfe6f5' });
      txt('× ' + Game.bag[id], 510, y + 35, { size: 20, weight: 800, align: 'right', color: UI_COL.accent });
    }
    if (this.items.length === 0) txt('가방이 비어 있다.', 284, 300, { size: 20, align: 'center', color: UI_COL.sub });
    const id = this.items[this.nav.i];
    panel(566, 76, 370, 520);
    if (id) {
      ctx.save(); const g = ctx.createRadialGradient(751, 230, 5, 751, 230, 120); g.addColorStop(0, 'rgba(56,225,255,0.35)'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(566, 90, 370, 280); ctx.restore();
      ctx.save(); ctx.translate(751, 230); ctx.rotate(Math.sin(Tick.time * 2) * 0.08); itemIcon(id, 0, Math.sin(Tick.time * 3) * 6, 110); ctx.restore();
      txt(ITEMS[id].name, 751, 380, { size: 26, weight: 900, align: 'center' });
      wrapText(ITEMS[id].desc, 320, 18, 500).forEach((l, k) => txt(l, 590, 430 + k * 30, { size: 18, weight: 500, color: '#cfe6f5' }));
    }
    helpLine('Z: 사용   X: 닫기');
  }
}

// ---------------------------------------------------------------------
//  도감
// ---------------------------------------------------------------------
class DexScreen {
  constructor() { this.nav = new ListNav(DEX_LIST.length, { cols: 8, visible: 4, wrap: false }); this.detail = false; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (this.detail) {
      if (Input.pressed.b || Input.pressed.a || Input.mouse.click) { Audio2.cancel(); this.detail = false; }
      if (Input.rep('right', dt) || Input.rep('down', dt)) { this.step(1); }
      if (Input.rep('left', dt) || Input.rep('up', dt)) { this.step(-1); }
      return;
    }
    const r = this.nav.update(dt);
    if (r === 'b') { Audio2.cancel(); UI.close(this); return; }
    if (r === 'a') {
      const s = DEX_LIST[this.nav.i];
      if (Game.dex.seen[s.key]) { Audio2.select(); this.detail = true; this.t = 0; if (Game.dex.caught[s.key]) Audio2.voice(s.key, 'start', 0.8); }
      else Audio2.bump();
    }
  }
  step(d) {
    let i = this.nav.i;
    for (let k = 0; k < DEX_LIST.length; k++) { i = (i + d + DEX_LIST.length) % DEX_LIST.length; if (Game.dex.seen[DEX_LIST[i].key]) break; }
    if (i !== this.nav.i) { this.nav.i = i; Audio2.cursor(); this.t = 0; }
  }
  draw() {
    const seen = DEX_LIST.filter(s => Game.dex.seen[s.key]).length;
    const caught = DEX_LIST.filter(s => Game.dex.caught[s.key]).length;
    screenBG('바이오로이드 도감', '발견 ' + seen + '   영입 ' + caught + '   / ' + DEX_LIST.length);
    if (this.detail) return this.drawDetail();
    this.nav.beginDraw();
    const cols = 8, size = 96, gap = 14, x0 = 34, y0 = 82;
    const start = this.nav.scroll * cols;
    for (let k = 0; k < cols * 4; k++) {
      const i = start + k; if (i >= DEX_LIST.length) break;
      const s = DEX_LIST[i];
      const x = x0 + (k % cols) * (size + gap), y = y0 + Math.floor(k / cols) * (size + 30);
      this.nav.rect(i, x, y, size, size + 22);
      const on = i === this.nav.i;
      const isSeen = Game.dex.seen[s.key], isCaught = Game.dex.caught[s.key];
      if (isSeen) iconSquare(s.key, x, y, size, { gray: !isCaught && s.kind !== 'worm', border: on ? '#fff' : s.kind === 'worm' ? 'rgba(255,77,94,0.7)' : undefined, lw: on ? 3 : 1.5 });
      else { chamfer(x, y, size, size, 13); ctx.fillStyle = 'rgba(20,34,58,0.9)'; ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(56,225,255,0.25)'; ctx.lineWidth = on ? 3 : 1; ctx.stroke(); txt('?', x + size / 2, y + size / 2 + 14, { size: 40, weight: 900, align: 'center', color: 'rgba(143,179,201,0.4)' }); }
      if (isCaught) { itemIcon('core', x + size - 14, y + 14, 18); }
      txt(String(s.no).padStart(3, '0'), x + 4, y + size + 18, { size: 13, color: UI_COL.sub });
      let label = isSeen ? s.name : '???';
      while (label.length > 1 && measure(label + '…', 13, 700) > size - 28) label = label.slice(0, -1);
      if (isSeen && label !== s.name) label += '…';
      txt(label, x + size - 2, y + size + 18, { size: 13, align: 'right', weight: 700, color: on ? '#fff' : '#cfe6f5' });
      if (on) { ctx.save(); chamfer(x - 4, y - 4, size + 8, size + 8, 15); ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Tick.time * 6); ctx.stroke(); ctx.restore(); }
    }
    helpLine('방향키: 이동   Z: 상세 보기   X: 닫기   ·   ' + (this.nav.i + 1) + ' / ' + DEX_LIST.length);
  }
  drawDetail() {
    const s = DEX_LIST[this.nav.i];
    const caught = Game.dex.caught[s.key];
    const a = Ease.outCubic(clamp(this.t / 0.4, 0, 1));
    ctx.save(); const g = ctx.createRadialGradient(300, 360, 10, 300, 360, 300); g.addColorStop(0, TYPES[s.types[0]].color + '55'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(0, 60, 600, 580); ctx.restore();
    ctx.save();
    if (!caught && s.kind !== 'worm') ctx.filter = 'brightness(0.15) saturate(0)';
    drawFit(IMG.full[s.key] || lazyImg('full', s.key), 40 + (1 - a) * -60, 76, 520, 540, { anchor: 'bottom', alpha: a });
    ctx.restore();
    panel(560, 80, 376, 520);
    txt('No.' + String(s.no).padStart(3, '0'), 584, 120, { size: 18, color: UI_COL.sub, weight: 700 });
    txt(s.name, 584, 160, { size: Math.min(32, Math.max(14, 32 * 328 / Math.max(1, measure(s.name, 32, 900)))), weight: 900 });
    rankBadge(s.rank, 880, 130, 32);
    s.types.forEach((t, j) => typeBadge(t, 584 + j * 74, 176, 68, 26, 15));
    txt('소속', 584, 236, { size: 16, color: UI_COL.sub }); txt(s.kind === 'worm' ? '철충' : s.faction || '-', 660, 236, { size: 18, weight: 700 });
    txt('상태', 584, 266, { size: 16, color: UI_COL.sub }); txt(s.kind === 'worm' ? '적대 개체 (영입 불가)' : caught ? '영입 완료' : '발견', 660, 266, { size: 18, weight: 700, color: s.kind === 'worm' ? UI_COL.red : caught ? UI_COL.green : UI_COL.accent });
    ctx.fillStyle = 'rgba(56,225,255,0.2)'; ctx.fillRect(584, 286, 330, 1);
    if (s.habitat) txt('출현: ' + MAPS[s.habitat].name, 584, 307, { size: 16, color: UI_COL.accent });
    wrapText(caught || s.kind === 'worm' ? s.desc : '아직 영입하지 않아 상세 정보가 없다. 링크 코어로 영입해 보자.', 330, 18, 500).slice(0, 5).forEach((l, k) => txt(l, 584, (s.habitat ? 338 : 322) + k * 26, { size: 18, weight: 500, color: '#cfe6f5' }));
    if (caught) {
      const b = s.base;
      ['HP', '공격', '방어', '속도'].forEach((n, k) => { txt(n, 584, 478 + k * 28, { size: 15, color: UI_COL.sub }); bar(640, 466 + k * 28, 270 * a, 9, b[k] / 130, ['#ffd76a', '#ff8a1a']); });
    }
    helpLine('◀▶ 이전/다음   X: 목록으로');
  }
}

// ---------------------------------------------------------------------
//  상점
// ---------------------------------------------------------------------
class ShopScreen {
  constructor(stock, o = {}) { this.stock = stock; this.o = o; this.nav = new ListNav(stock.length + 1); }
  async update(dt) {
    if (this.busy) return;
    const r = this.nav.update(dt);
    if (r === 'b' || (r === 'a' && this.nav.i === this.stock.length)) { Audio2.cancel(); UI.close(this); return; }
    if (r !== 'a') return;
    const id = this.stock[this.nav.i], it = ITEMS[id];
    this.busy = true;
    try {
      const max = Math.min(99, Math.floor(Game.money / it.price));
      if (max <= 0) { Audio2.bump(); await say('자원이 부족합니다, 사령관님.', { speaker: this.o.name, auto: 1300 }); return; }
      Audio2.select();
      const n = await UI.push(new NumberPick(max, it.price));
      if (n > 0) {
        Game.money -= n * it.price; Game.addItem(id, n);
        Audio2.sfx('buy');
        this.flash = 1;
        let bonus = '';
        if (id === 'core' && n >= 10) { Game.addItem('core2', 1); bonus = ' 서비스로 고급 링크 코어를 하나 드릴게요!'; }
        await say(J(it.name, '을') + ' ' + n + '개 구매했습니다.' + bonus, { speaker: this.o.name, auto: 1400 });
      }
    } finally { this.busy = false; }
  }
  draw() {
    screenBG(this.o.title || '보급소', '보유 자원 ' + Game.money.toLocaleString() + ' P');
    if (this.o.portrait) drawFit(IMG.full[this.o.portrait], 560, 50, 400, 600, { anchor: 'bottom', alpha: 0.95 });
    panel(24, 76, 520, 470);
    this.nav.beginDraw();
    // 품목이 늘어나도 패널(76~546) 안에 들어가도록 줄 간격을 줄인다
    const RH = Math.min(56, Math.floor(444 / (this.stock.length + 1))), BH = RH - 6;
    for (let i = 0; i <= this.stock.length; i++) {
      const y = 92 + i * RH, ty = y + BH / 2 + 8, on = i === this.nav.i;
      this.nav.rect(i, 36, y, 496, BH);
      if (on) { chamfer(36, y, 496, BH, 8); ctx.fillStyle = UI_COL.sel; ctx.fill(); ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (i === this.stock.length) { txt('나가기', 90, ty, { size: 20, weight: 700, color: on ? '#fff' : UI_COL.sub }); continue; }
      const id = this.stock[i];
      itemIcon(id, 64, y + BH / 2, 28);
      txt(ITEMS[id].name, 94, ty, { size: 20, weight: 700 });
      txt(ITEMS[id].price.toLocaleString() + ' P', 446, ty, { size: 19, align: 'right', weight: 800, color: Game.money >= ITEMS[id].price ? UI_COL.accent : '#7a6a55' });
      txt('보유 ' + (Game.bag[id] || 0), 520, ty, { size: 14, align: 'right', color: UI_COL.sub });
    }
    const id = this.stock[this.nav.i];
    if (id) { panel(24, 556, 520, 64, { c: 10 }); txt(ITEMS[id].desc, 44, 595, { size: 16, weight: 500, color: '#cfe6f5' }); }
  }
}

// ---------------------------------------------------------------------
//  격납고 단말기 (PC)
// ---------------------------------------------------------------------
class PCScreen {
  constructor() { this.side = 0; this.navP = new ListNav(Game.party.length, { visible: 6 }); this.navB = new ListNav(Math.max(1, Game.box.length), { visible: 6 }); }
  async update(dt) {
    if (this.busy) return;
    if (Input.pressed.right && this.side === 0) { this.side = 1; Audio2.cursor(); return; }
    if (Input.pressed.left && this.side === 1) { this.side = 0; Audio2.cursor(); return; }
    this.navP.setN(Game.party.length); this.navB.setN(Game.box.length);
    const nav = this.side === 0 ? this.navP : this.navB;
    const r = nav.update(dt);
    if (r === 'b') { Audio2.cancel(); UI.close(this); return; }
    if (r !== 'a') return;
    this.busy = true;
    try {
      if (this.side === 0) {
        const m = Game.party[nav.i]; if (!m) return;
        Audio2.select();
        const c = await choose(['격납고로 보내기', '상태 보기', '취소'], { cancel: 2, x: 600, y: 360 });
        if (c === 0) {
          if (Game.party.filter(p => p.hp > 0 && p !== m).length === 0) { await say('출격 가능한 유닛이 한 명은 남아 있어야 합니다.'); return; }
          Game.party.splice(nav.i, 1); Game.box.push(m); Audio2.sfx('door', 0.6);
        } else if (c === 1) await UI.push(new SummaryScreen(nav.i));
      } else {
        const m = Game.box[nav.i]; if (!m) return;
        Audio2.select();
        const c = await choose(['부대로 편입', '상태 보기', '취소'], { cancel: 2, x: 600, y: 360 });
        if (c === 0) {
          if (Game.party.length >= 6) { await say('부대가 가득 찼습니다. (최대 6명)'); return; }
          Game.box.splice(nav.i, 1); Game.party.push(m); Audio2.sfx('stage_in', 0.6);
        } else if (c === 1) await UI.push(new SummaryScreen(nav.i, { list: Game.box }));
      }
    } finally { this.busy = false; }
  }
  drawList(list, nav, x, title, active) {
    panel(x, 76, 440, 520, { accent: active ? UI_COL.line : 'rgba(56,225,255,0.3)' });
    headerBar(x + 2, 86, 300, title, { color: active ? '#0fb8de' : '#2a4a66' });
    nav.beginDraw();
    const start = nav.scroll;
    for (let k = 0; k < 6; k++) {
      const i = start + k; const m = list[i]; if (!m) break;
      const y = 134 + k * 74, on = active && i === nav.i;
      nav.rect(i, x + 12, y, 416, 68);
      if (on) { chamfer(x + 12, y, 416, 68, 8); ctx.fillStyle = UI_COL.sel; ctx.fill(); ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 1.5; ctx.stroke(); }
      iconSquare(m.iconKey, x + 20, y + 6, 56);
      txt(m.name, x + 90, y + 30, { size: 19, weight: 800 });
      txt('Lv.' + m.level, x + 90, y + 56, { size: 15, color: UI_COL.accent, weight: 700 });
      m.types.forEach((t, j) => typeBadge(t, x + 160 + j * 52, y + 42, 48, 18, 12));
      rankBadge(m.rank, x + 390, y + 10, 24);
      bar(x + 270, y + 46, 140, 8, m.hp / m.maxHp, hpColors(m.hp / m.maxHp));
    }
    if (list.length === 0) txt('비어 있음', x + 220, 320, { size: 18, align: 'center', color: UI_COL.sub });
    if (list.length > 6) txt((nav.i + 1) + ' / ' + list.length, x + 420, 580, { size: 14, align: 'right', color: UI_COL.sub });
  }
  draw() {
    screenBG('오르카 격납고 단말기', '◀▶ 부대 / 격납고 전환');
    this.drawList(Game.party, this.navP, 24, '출격 부대 ' + Game.party.length + '/6', this.side === 0);
    this.drawList(Game.box, this.navB, 496, '격납고 ' + Game.box.length, this.side === 1);
    helpLine('◀▶ 패널 전환   Z: 선택   X: 종료');
  }
}

// ---------------------------------------------------------------------
//  일시정지 메뉴
// ---------------------------------------------------------------------
class PauseMenu {
  constructor() {
    this.items = [['퀘스트', 'quest'], ['도감', 'dex'], ['부대', 'party'], ['가방', 'bag'], ['사령관 카드', 'card'], ['상성표', 'chart'], ['저장', 'save'], ['설정', 'settings'], ['조작법', 'help'], ['타이틀로', 'title'], ['닫기', 'close']];
    this.nav = new ListNav(this.items.length, { start: PauseMenu.last || 0 });
  }
  async update(dt) {
    if (this.busy) return;
    const r = this.nav.update(dt);
    if (r === 'b' || (Input.pressed.menu)) { Audio2.cancel(); UI.close(this); return; }
    if (r !== 'a') return;
    PauseMenu.last = this.nav.i;
    const k = this.items[this.nav.i][1];
    if (k === 'dex' && !Game.flags.hasDex) { Audio2.bump(); return; }
    if ((k === 'party') && Game.party.length === 0) { Audio2.bump(); await say('아직 부대원이 없다.'); return; }
    Audio2.select();
    this.busy = true;
    try {
      if (k === 'close') { UI.close(this); return; }
      if (k === 'quest') await UI.push(new QuestLogScreen());
      if (k === 'dex') await UI.push(new DexScreen());
      if (k === 'party') await UI.push(new PartyScreen('view'));
      if (k === 'bag') await UI.push(new BagScreen('field'));
      if (k === 'card') await UI.push(new CardScreen());
      if (k === 'chart') await UI.push(new TypeChartScreen());
      if (k === 'settings') await UI.push(new SettingsScreen());
      if (k === 'save') {
        const c = await ask('지금까지의 작전 기록을 저장할까요?', ['저장한다', '그만둔다']);
        if (c === 0) {
          if (Game.save()) { Audio2.sfx('save', 0.7); await say('작전 기록이 저장되었습니다.'); }
          else { Audio2.bump(); await say('저장하지 못했습니다. 브라우저 저장 공간(시크릿 모드·용량)을 확인해 주세요.'); }
        }
      }
      if (k === 'help') await UI.push(new ControlsScreen());
      if (k === 'title') {
        const c = await ask('타이틀 화면으로 돌아갈까요? 현재 진행 상황은 저장됩니다.', ['돌아간다', '그만둔다']);
        if (c === 0) { Game.save(); UI.close(this); await returnToTitle(); return; }
      }
    } finally { this.busy = false; }
  }
  draw() {
    const a = Ease.outCubic(clamp(this.openT / 0.18, 0, 1));
    ctx.save(); ctx.globalAlpha = 0.45 * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const RH = 44, w = 250, h = this.items.length * RH + 70, x = W - w - 20 + (1 - a) * 280, y = 12;
    panel(x, y, w, h);
    txt('MENU', x + 22, y + 38, { size: 22, weight: 900, color: UI_COL.line, family: TITLE_FONT });
    txt(Game.mapName(), x + w - 18, y + 36, { size: 13, align: 'right', color: UI_COL.sub });
    this.nav.beginDraw();
    this.items.forEach(([label, k], i) => {
      const yy = y + 56 + i * RH, on = i === this.nav.i;
      this.nav.rect(i, x, yy, w, RH);
      const disabled = (k === 'dex' && !Game.flags.hasDex) || (k === 'party' && Game.party.length === 0);
      if (on) { chamfer(x + 10, yy + 3, w - 20, RH - 6, 8); ctx.fillStyle = UI_COL.sel; ctx.fill(); ctx.fillStyle = UI_COL.line; ctx.fillRect(x + 10, yy + 3, 4, RH - 6); }
      menuGlyph(k, x + 38, yy + RH / 2, on);
      txt(label, x + 66, yy + RH / 2 + 8, { size: 21, weight: 700, color: disabled ? '#4a5a6a' : on ? '#fff' : '#cfe6f5' });
    });
    txt('Z 결정 · X 닫기 · Shift 달리기', x + w / 2, y + h + 22, { size: 13, align: 'center', color: UI_COL.sub, stroke: 3, strokeColor: 'rgba(0,0,0,0.6)', shadow: false });
  }
}
function menuGlyph(k, cx, cy, on) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = on ? UI_COL.line : '#6f93ab'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
  if (k === 'dex') { rrect(-10, -12, 20, 24, 3); ctx.stroke(); ctx.fillRect(-6, -6, 12, 2); ctx.fillRect(-6, 0, 12, 2); }
  else if (k === 'party') { ctx.beginPath(); ctx.arc(-5, -4, 5, 0, 7); ctx.arc(6, -4, 5, 0, 7); ctx.fill(); ctx.fillRect(-11, 3, 22, 8); }
  else if (k === 'bag') { rrect(-10, -7, 20, 17, 3); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -7, 5, Math.PI, 0); ctx.stroke(); }
  else if (k === 'card') { rrect(-12, -8, 24, 16, 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-5, -1, 3, 0, 7); ctx.fill(); ctx.fillRect(1, -3, 8, 2); ctx.fillRect(1, 2, 6, 2); }
  else if (k === 'chart') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(-10 + i * 7, -10 + j * 7, 5, 5); }
  else if (k === 'save') { rrect(-10, -10, 20, 20, 2); ctx.stroke(); ctx.fillRect(-5, -10, 10, 7); }
  else if (k === 'quest') { ctx.font = font(22, 900, TITLE_FONT); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = on ? '#ffd23a' : '#b89a3a'; ctx.fillText('!', -4, 1); ctx.fillStyle = on ? '#dfe7f0' : '#7f8a96'; ctx.fillText('?', 6, 1); ctx.textBaseline = 'alphabetic'; }
  else if (k === 'help') { rrect(-12, -8, 24, 16, 3); ctx.stroke(); for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 5, -4, 3, 3); ctx.fillRect(-6, 2, 12, 3); }
  else if (k === 'title') { ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -9); ctx.lineTo(10, 0); ctx.stroke(); ctx.strokeRect(-6, 0, 12, 9); }
  else if (k === 'settings') { ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(Math.cos(a) * 9 - 2, Math.sin(a) * 9 - 2, 4, 4); } }
  else { ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, 7); ctx.moveTo(7, -7); ctx.lineTo(-7, 7); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  사령관 카드
// ---------------------------------------------------------------------
class CardScreen {
  update() { if (Input.pressed.a || Input.pressed.b || Input.mouse.click) { Audio2.cancel(); UI.close(this); } }
  draw() {
    screenBG('사령관 카드');
    const x = 80, y = 90, w = 800, h = 470;
    panel(x, y, w, h, { top: 'rgba(24,46,80,0.97)', bottom: 'rgba(8,16,32,0.97)' });
    // 엠블럼
    ctx.save(); ctx.translate(x + 150, y + 170);
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; ctx.lineTo(Math.cos(a) * 100, Math.sin(a) * 100); } ctx.closePath();
    const g = ctx.createLinearGradient(0, -100, 0, 100); g.addColorStop(0, '#1d4f7a'); g.addColorStop(1, '#0a1a2c'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = UI_COL.line; ctx.lineWidth = 3; ctx.stroke();
    drawCommanderBust(0, 10, 1.6);
    ctx.restore();
    txt('오르카 사령관', x + 150, y + 310, { size: 22, weight: 900, align: 'center' });
    txt('ORCA COMMANDER', x + 150, y + 336, { size: 13, align: 'center', color: UI_COL.sub });
    const rows = [['보유 자원', Game.money.toLocaleString() + ' P'], ['도감 (영입)', DEX_LIST.filter(s => Game.dex.caught[s.key]).length + ' / ' + DEX_LIST.filter(s => s.kind !== 'worm').length],
    ['도감 (발견)', DEX_LIST.filter(s => Game.dex.seen[s.key]).length + ' / ' + DEX_LIST.length], ['플레이 시간', Game.playTimeStr()], ['쓰러뜨린 유닛', (Game.stats.knockouts || 0) + ' 기']];
    rows.forEach((r, k) => {
      const yy = y + 60 + k * 50;
      txt(r[0], x + 320, yy, { size: 18, color: UI_COL.sub }); txt(r[1], x + w - 40, yy, { size: 22, weight: 800, align: 'right' });
      ctx.fillStyle = 'rgba(56,225,255,0.15)'; ctx.fillRect(x + 320, yy + 14, w - 360, 1);
    });
    txt('레몬 하트 배지', x + 320, y + 330, { size: 18, color: UI_COL.sub });
    BADGES.forEach((b, k) => drawBadge(b, x + 340 + k * 58, y + 395, Game.badges.includes(b.id), 0.5));
  }
}
const BADGES = [
  { id: 'forest', name: '신록 휘장', color: '#59e38a' },
  { id: 'coast', name: '파도 휘장', color: '#4fc3f7' },
  { id: 'nest', name: '여명 휘장', color: '#ffb22e' },
];
function drawBadge(b, cx, cy, got, s = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 22 : 36; const a = i * Math.PI / 4 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
  if (got) { const g = ctx.createRadialGradient(-8, -10, 2, 0, 0, 40); g.addColorStop(0, '#fff'); g.addColorStop(0.4, b.color); g.addColorStop(1, '#222'); ctx.fillStyle = g; }
  else ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill(); ctx.strokeStyle = got ? '#fff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  if (s <= 1.2) txt(got ? b.name : '???', cx, cy + 58 * s, { size: 14, align: 'center', color: got ? '#fff' : UI_COL.sub, weight: 700 });
}

// ---------------------------------------------------------------------
//  상성표
// ---------------------------------------------------------------------
class TypeChartScreen {
  update() { if (Input.pressed.a || Input.pressed.b || Input.mouse.click) { Audio2.cancel(); UI.close(this); } }
  draw() {
    screenBG('타입 상성표', '세로: 공격 기술 타입 / 가로: 방어측 타입');
    const x0 = 210, y0 = 112, cw = 76, ch = 52;
    TYPE_ORDER.forEach((t, j) => typeBadge(t, x0 + j * cw + 6, y0 - 34, cw - 12, 24, 14));
    TYPE_ORDER.forEach((at, i) => {
      typeBadge(at, x0 - 100, y0 + i * ch + 14, 84, 26, 15);
      TYPE_ORDER.forEach((dt, j) => {
        const e = (EFF[at] && EFF[at][dt]) || 1;
        const x = x0 + j * cw, y = y0 + i * ch;
        ctx.fillStyle = e > 1 ? 'rgba(93,255,156,0.25)' : e < 1 ? 'rgba(255,77,94,0.22)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
        if (e !== 1) txt(e > 1 ? '◎ ×2' : '△ ×½', x + cw / 2, y + ch / 2 + 7, { size: 17, weight: 800, align: 'center', color: e > 1 ? UI_COL.green : '#ff8a95' });
      });
    });
    txt('경장 ▶ 기동 ▶ 중장 ▶ 경장          화염 ▶ 냉기 ▶ 전기 ▶ 화염', W / 2, 560, { size: 17, align: 'center', color: UI_COL.accent, weight: 700 });
    txt('기술 타입이 자신의 타입과 같으면 위력 1.5배 (자속 보정)', W / 2, 590, { size: 15, align: 'center', color: UI_COL.sub });
  }
}

// ---------------------------------------------------------------------
//  조작법
// ---------------------------------------------------------------------
class ControlsScreen {
  update() { if (Input.pressed.a || Input.pressed.b || Input.pressed.menu || Input.mouse.click) { Audio2.cancel(); UI.close(this); } }
  draw() {
    screenBG('조작법', '키보드 · 마우스 · 터치');
    panel(80, 84, 800, 470);
    const rows = [
      ['이동 / 커서', '방향키 · WASD'],
      ['결정 · 조사 · 대화 넘기기', 'Z · Space · Enter · J'],
      ['취소 · 메뉴 열기', 'X · Esc · Backspace · K'],
      ['메뉴 바로 열기', 'M · Tab'],
      ['달리기', 'Shift 누르는 동안 (설정에서 기본 달리기)'],
      ['대화 빨리 넘기기', '결정 키를 누르거나 누르고 있기'],
      ['마우스', '항목 클릭 · 휠로 목록 스크롤 · 우클릭 취소'],
      ['터치', '화면의 가상 패드 (A·B·RUN·MENU)'],
    ];
    rows.forEach(([a, b], i) => {
      const y = 132 + i * 52;
      txt(a, 120, y, { size: 19, weight: 700 });
      txt(b, 840, y, { size: 18, align: 'right', color: UI_COL.accent, weight: 700 });
      ctx.fillStyle = 'rgba(56,225,255,0.12)'; ctx.fillRect(120, y + 16, 720, 1);
    });
    txt('수풀에서 폭주 바이오로이드가 나타납니다. 체력을 깎은 뒤 링크 코어로 영입하세요.', W / 2, 568 - 24, { size: 15, align: 'center', color: UI_COL.sub });
    helpLine('Z / X: 돌아가기');
  }
}

// ---------------------------------------------------------------------
//  설정
// ---------------------------------------------------------------------
class SettingsScreen {
  constructor() { this.nav = new ListNav(9); }
  update(dt) {
    const r = this.nav.update(dt);
    const i = this.nav.i;
    const d = (Input.rep('right', dt) ? 1 : 0) - (Input.rep('left', dt) ? 1 : 0);
    const flip = k => { Settings[k] = !Settings[k]; };
    if (d) {
      if (i <= 2) { const k = ['bgm', 'sfx', 'voice'][i]; Settings[k] = clamp(Math.round((Settings[k] + d * 0.1) * 10) / 10, 0, 1); Audio2.refreshVolume(); if (i === 1) Audio2.cursor(); if (i === 2) Audio2.voice(pick(Game.party.length ? Game.party.map(m => m.key) : ['labiata']), 'start'); }
      if (i === 3) { Settings.textSpeed = clamp(Settings.textSpeed + d, 1, 4); Audio2.cursor(); }
      if (i === 4) { flip('runDefault'); Audio2.cursor(); }
      if (i === 5) { flip('questTracker'); Audio2.cursor(); }
      if (i === 6) { Settings.difficulty = clamp(Settings.difficulty + d, 0, 2); Audio2.cursor(); }
      Settings.save();
    }
    if (r === 'a' && (i === 4 || i === 5)) { flip(i === 4 ? 'runDefault' : 'questTracker'); Audio2.select(); Settings.save(); }
    if (r === 'a' && i === 6) { Settings.difficulty = (Settings.difficulty + 1) % 3; Audio2.select(); Settings.save(); }
    if ((d || r === 'a') && i === 7) { Settings.touchStyle = Settings.touchStyle === 'buttons' ? 'modern' : 'buttons'; Settings.save(); Input.clear(); }
    if (r === 'b' || (r === 'a' && i === 8)) { Audio2.cancel(); Settings.save(); UI.close(this); }
  }
  draw() {
    screenBG('설정');
    panel(160, 76, 640, 512);
    const labels = ['배경음 (BGM)', '효과음', '음성', '텍스트 속도', '기본 달리기', '퀘스트 추적 표시', '난이도', '터치 조작', '돌아가기'];
    this.nav.beginDraw();
    labels.forEach((l, i) => {
      const y = 86 + i * 54, on = i === this.nav.i, ty = y + 32;
      this.nav.rect(i, 180, y, 600, 50);
      if (on) { chamfer(180, y, 600, 50, 8); ctx.fillStyle = UI_COL.sel; ctx.fill(); }
      txt(l, 210, ty, { size: 21, weight: 700, color: on ? '#fff' : '#cfe6f5' });
      if (i <= 2) { const v = Settings[['bgm', 'sfx', 'voice'][i]]; bar(470, y + 18, 220, 14, v, ['#7ce8ff', '#1a9fd0']); txt(Math.round(v * 100) + '%', 760, ty, { size: 18, align: 'right', weight: 700 }); }
      if (i === 3) txt(['', '느리게', '보통', '빠르게', '즉시'][Settings.textSpeed], 760, ty, { size: 20, align: 'right', weight: 800, color: UI_COL.accent });
      if (i === 4 || i === 5) { const v = i === 4 ? Settings.runDefault : Settings.questTracker; txt(v ? 'ON' : 'OFF', 760, ty, { size: 20, align: 'right', weight: 800, color: v ? UI_COL.green : UI_COL.sub }); }
      if (i === 7) txt(Settings.touchStyle === 'buttons' ? '기존 버튼' : '조이스틱 · 상황 버튼', 760, ty, { size: 18, align: 'right', color: UI_COL.accent });
      if (i === 6) txt(['쉬움 (상대 Lv -3)', '보통', '어려움 (상대 Lv +3)'][Settings.difficulty], 760, ty, { size: 18, align: 'right', weight: 800, color: ['#5dff9c', UI_COL.accent, '#ff7a85'][Settings.difficulty] });
    });
    helpLine('▲▼ 항목   ◀▶ 값 변경   Shift: 달리기(누르는 동안)   X: 돌아가기');
  }
}
