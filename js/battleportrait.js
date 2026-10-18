// =====================================================================
//  세로 폰 전투: 필드와 같은 540 폭 세로 화면으로 전투를 그린다 (화면 위아래를 꽉 채움)
//  - 전투 장면(배경·유닛·이펙트)은 폭 960의 가상 좌표에서 그린 뒤 화면 폭에 맞춰 축소한다.
//    유닛·이펙트 위치는 FOE_BOX / ME_BOX 기준이므로 이 값을 세로로 펼치고 유닛을 키운다.
//  - HUD와 명령·기술 버튼은 540 좌표에서 큼직하게 다시 그린다. 화면을 직접 눌러 고른다 (한손 조작)
//  - 대화창·가방·부대 화면은 PortraitUI(세로 UI)가 그대로 맡는다
//  titlelayout.js 다음에 로드한다.
// =====================================================================
(function () {
  const BASE = { foe: { ...FOE_BOX }, me: { ...ME_BOX } };
  const BF = window.BattleFill = {
    on: false, vw: 960, vh: 640,
    active() { return typeof Scene !== 'undefined' && Scene instanceof Battle && MobileField.enabled() && innerHeight > innerWidth; },
    // 패널 높이 (540 좌표)
    PH: 262,
    apply() {
      this.on = this.active() && MobileField.portrait;
      if (!this.on) { Object.assign(FOE_BOX, BASE.foe); Object.assign(ME_BOX, BASE.me); this.vw = W; this.vh = H; this.cam(); return; }
      const s = W / 960, vh = this.vh = Math.round(H / s); this.vw = 960;
      Object.assign(FOE_BOX, { cx: 650, base: Math.round(vh * 0.40), w: BASE.foe.w * 2.0, h: BASE.foe.h * 2.0 });
      Object.assign(ME_BOX, { cx: 290, base: Math.round((H - this.PH - 10) / s), w: BASE.me.w * 1.8, h: BASE.me.h * 1.8 });
      this.cam();
    },
    // 전투 이펙트(WebGL) 카메라를 현재 장면 좌표에 맞춘다
    cam() {
      if (typeof BFX === 'undefined' || !BFX.camera) return;
      const c = BFX.camera, U = BFX.U, w = this.vw, h = this.vh;
      if (c._w === w && c._h === h) return;
      c.left = -w / 2 / U; c.right = w / 2 / U; c.top = h / 2 / U; c.bottom = -h / 2 / U; c.updateProjectionMatrix(); c._w = w; c._h = h;
    },
    // 장면 좌표(가상 960 폭)로 잠시 바꿔 실행
    virt(fn) {
      if (!this.on) return fn();
      const w = W, h = H; W = this.vw; H = this.vh;
      try { return fn(); } finally { W = w; H = h; }
    },
  };
  // 전투도 세로 화면 대상 (MobileField 가 W=540 세로 좌표를 쓰게 한다)
  const baseCtx = MobileField.portraitContext.bind(MobileField);
  MobileField.portraitContext = function () { return baseCtx() || (typeof Scene !== 'undefined' && Scene instanceof Battle); };
  const baseDims = MobileField.dimensions.bind(MobileField);
  MobileField.dimensions = function () { baseDims(); BF.apply(); };
  const baseSync = MobileField.sync.bind(MobileField);
  MobileField.sync = function () {
    baseSync();
    if ((BF.active() && MobileField.portrait) !== BF.on) resize();
    BF.cam();
    document.body.classList.toggle('battle-fill', BF.on);
  };
  const st = document.createElement('style');
  st.textContent = 'body.battle-fill #touchpad { display: none !important; }';
  document.head.appendChild(st);
  if (typeof BFX !== 'undefined') {
    BFX.wx = function (x) { return (x - (BF.on ? BF.vw : W) / 2) / this.U; };
    BFX.wy = function (y) { return ((BF.on ? BF.vh : H) / 2 - y) / this.U; };
  }

  // ---- 그리기 ----
  const NOOP = () => { };
  const HIDE = ['drawHudFoe', 'drawHudMe', 'drawTeamDots', 'drawCommand', 'drawMoves'];
  const baseDraw = Battle.prototype.draw;
  Battle.prototype.draw = function () {
    // 세로는 2×2 버튼이므로 방향 이동도 2열로 (가로는 원래 4열 한 줄)
    for (const n of [this.menuNav, this.moveNav]) if (n) { if (n._cols == null) n._cols = n.cols; n.cols = BF.on ? 2 : n._cols; }
    if (!BF.on) return baseDraw.call(this);
    const s = W / 960;
    // 장면: 가상 좌표에서 그리고 축소 (HUD·명령은 아래에서 540 좌표로 따로 그린다)
    for (const k of HIDE) this[k] = NOOP;
    ctx.save(); ctx.scale(s, s);
    try { BF.virt(() => baseDraw.call(this)); }
    finally { ctx.restore(); for (const k of HIDE) delete this[k]; }
    drawHudFoeP(this); drawHudMeP(this);
    if (this.mode === 'command') drawCommandP(this);
    if (this.mode === 'move') drawMovesP(this);
  };
  const baseUpdate = Battle.prototype.update;
  Battle.prototype.update = function (dt) {
    const c = Input.mouse.click, R = this._backRect;
    if (BF.on && this.mode === 'move' && c && R && c.x >= R.x && c.x <= R.x + R.w && c.y >= R.y && c.y <= R.y + R.h) { Input.mouse.click = null; MobileField.pulse('b'); }
    return BF.virt(() => baseUpdate.call(this, dt));
  };
  // 비동기 전투 진행(연출·이펙트 생성)도 장면 좌표를 쓰도록
  for (const k of ['burst', 'explode', 'throwCore']) {
    const f = Battle.prototype[k]; if (typeof f !== 'function') continue;
    Battle.prototype[k] = function () { return BF.virt(() => f.apply(this, arguments)); };
  }

  // ---- 한손 제스처: 버튼은 그대로 누르고, 빈 곳을 탭하면 지금 고른 항목 선택, 상하좌우로 밀면 커서 이동 ----
  // 대상: 세로 전투의 명령·기술 메뉴, 대화 중 선택지(Choice)
  function gestureTarget() {
    if (!MobileField.enabled() || !MobileField.portrait) return null;
    const top = UI.top();
    if (top instanceof Choice) return { navs: [top.nav], extra: top._touch || [], choice: true };
    if (BF.on && !UI.busy() && Scene && (Scene.mode === 'command' || Scene.mode === 'move')) {
      const b = Scene;
      return { navs: [b.mode === 'command' ? b.menuNav : b.moveNav], extra: b.mode === 'move' ? [b._backRect, b.orderRect].filter(Boolean) : [] };
    }
    return null;
  }
  let g = null;
  window.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.target !== canvas) return;
    const t = gestureTarget(); if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation(); // 기존 탭·드래그 처리 대신 여기서 처리 (중복 선택 방지)
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
    Audio2.unlock();
    g = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }, { capture: true, passive: false });
  window.addEventListener('pointerup', e => {
    if (!g || e.pointerId !== g.id) return;
    e.stopImmediatePropagation();
    const dx = e.clientX - g.x, dy = e.clientY - g.y, t = gestureTarget(); g = null;
    if (!t) return;
    if (Math.hypot(dx, dy) >= 30) {
      let dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (t.choice && (dir === 'left' || dir === 'right')) dir = dir === 'left' ? 'up' : 'down'; // 선택지는 한 줄 목록
      MobileField.pulse(dir);
      return;
    }
    const r = canvas.getBoundingClientRect(), p = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    const inside = q => q && p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h;
    const hit = t.navs.some(n => n && n.rects.some(inside)) || t.extra.some(inside);
    if (hit) Input.mouse.click = p; else MobileField.pulse('a');
  }, { capture: true, passive: true });
  for (const ev of ['pointercancel', 'lostpointercapture']) window.addEventListener(ev, e => { if (g && e.pointerId === g.id) g = null; }, { capture: true });

  function hp(x, y, w, cur, max) {
    txt('HP', x, y + 12, { size: 15, weight: 900, color: UI_COL.accent });
    bar(x + 34, y, w - 34, 14, cur / max, hpColors(cur / max));
  }
  function drawHudFoeP(b) {
    const f = b.foe; if (!f || b.hudFoe.a <= 0) return;
    const a = b.hudFoe.a, x = 12 - (1 - a) * 300, y = 12, w = 336, h = 92;
    ctx.save(); ctx.globalAlpha = a;
    panel(x, y, w, h, { c: 12, accent: f.kind === 'boss' || b.kind === 'trainer' ? '#ff4d5e' : UI_COL.line });
    txt(f.name, x + 16, y + 32, { size: 22, weight: 900 });
    rankBadge(f.rank, x + w - 104, y + 11, 22);
    txt('Lv.' + f.level, x + w - 14, y + 32, { size: 19, weight: 800, align: 'right', color: UI_COL.accent });
    f.types.forEach((t, k) => typeBadge(t, x + 16 + k * 56, y + 42, 52, 20, 12));
    if (f.status) statusBadge(f.status, x + 132, y + 42);
    hp(x + 16, y + 70, w - 32, b.hudFoe.hp, f.maxHp);
    ctx.restore();
    if (b.kind === 'trainer') b.foes.forEach((m, i) => { const alive = m.hp > 0; itemIcon(alive ? 'core' : 'chip', 26 + i * 26, 120, 18); });
  }
  function drawHudMeP(b) {
    const m = b.me; if (!m || b.hudMe.a <= 0) return;
    const a = b.hudMe.a, w = 336, h = 112, x = W - w - 12 + (1 - a) * 300, y = H - BF.PH - h - 12;
    ctx.save(); ctx.globalAlpha = a;
    panel(x, y, w, h, { c: 12 });
    txt(m.name, x + 16, y + 32, { size: 22, weight: 900 });
    rankBadge(m.rank, x + w - 104, y + 11, 22);
    txt('Lv.' + m.level, x + w - 14, y + 32, { size: 19, weight: 800, align: 'right', color: UI_COL.accent });
    m.types.forEach((t, k) => typeBadge(t, x + 16 + k * 56, y + 42, 52, 20, 12));
    if (m.status) statusBadge(m.status, x + 132, y + 42);
    const r = b.hudMe.hp / m.maxHp;
    hp(x + 16, y + 70, w - 32, b.hudMe.hp, m.maxHp);
    txt(Math.ceil(b.hudMe.hp) + ' / ' + m.maxHp, x + w - 14, y + 104, { size: 16, weight: 800, align: 'right' });
    txt('EXP', x + 16, y + 104, { size: 11, weight: 900, color: '#7cd9ff' });
    bar(x + 48, y + 97, 150, 6, b.hudMe.exp, ['#7cd9ff', '#2a8bd8']);
    const g = b.cmdG || 0, full = g >= 3;
    txt('지휘', x + w - 126, y + 60, { size: 13, weight: 900, color: full ? '#ffb22e' : UI_COL.sub });
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(x + w - 88 + i * 22, y + 55); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i < g ? '#ffb22e' : 'rgba(255,178,46,0.15)'; ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -6, 12, 12); ctx.restore();
    }
    if (r < 0.2 && r > 0) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(Tick.time * 8); chamfer(x, y, w, h, 12); ctx.fillStyle = '#ff2a3a'; ctx.fill(); }
    ctx.restore();
  }
  function btn(x, y, w, h, on, c1, c2) {
    ctx.save(); chamfer(x, y, w, h, 12);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, on ? c1 : 'rgba(30,50,80,0.92)'); g.addColorStop(1, on ? 'rgba(20,30,50,0.95)' : 'rgba(12,22,40,0.95)');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = on ? '#fff' : c2; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke(); ctx.restore();
  }
  function drawCommandP(b) {
    const y0 = H - BF.PH;
    panel(10, y0, W - 20, BF.PH - 10);
    txt(J(b.me.name, '은') + ' 무엇을 할까?', 28, y0 + 38, { size: 22, weight: 800 });
    if (b.foe) {
      let best = null, bv = 0;
      for (const mv of b.me.moves) { const d = MOVES[mv.id]; if (d.cat !== 'atk' || mv.pp <= 0) continue; const e0 = typeEff(d.type, b.foe.types); const v = d.pow * e0 * (b.me.types.includes(d.type) ? 1.5 : 1) * (d.acc || 100) / 100; if (v > bv) { bv = v; best = d; } }
      let hx = 28; txt('상대', hx, y0 + 68, { size: 15, color: UI_COL.sub }); hx += 38;
      b.foe.types.forEach(t => { typeBadge(t, hx, y0 + 53, 46, 20, 12); hx += 50; });
      if (best) { const e = typeEff(best.type, b.foe.types); txt('추천 ' + best.name + (e > 1 ? ' ▲' : e < 1 ? ' ▼' : ''), hx + 6, y0 + 68, { size: 15, weight: 800, color: e > 1 ? UI_COL.green : e < 1 ? '#ff8a95' : UI_COL.sub }); }
    }
    const labels = [['전투', '#ff6b4a'], ['가방', '#ffb22e'], ['부대', '#5ff4a0'], ['후퇴', '#5fb8ff']];
    const bw = (W - 52) / 2, bh = 70;
    b.menuNav.beginDraw();
    labels.forEach(([l, c], i) => {
      const x = 22 + (i % 2) * (bw + 8), y = y0 + 84 + Math.floor(i / 2) * (bh + 8), on = i === b.menuNav.i;
      b.menuNav.rect(i, x, y, bw, bh);
      btn(x, y, bw, bh, on, c, c + '88');
      txt(l, x + bw / 2, y + 46, { size: 28, weight: 900, align: 'center', color: on ? '#fff' : '#cfe6f5' });
    });
  }
  function drawMovesP(b) {
    const y0 = H - BF.PH, m = b.me;
    panel(10, y0, W - 20, BF.PH - 10);
    // 뒤로 (오른쪽 위)
    const R = b._backRect = { x: W - 132, y: y0 + 10, w: 110, h: 46 };
    btn(R.x, R.y, R.w, R.h, false, '#5fb8ff', 'rgba(56,225,255,0.6)');
    txt('◀ 뒤로', R.x + R.w / 2, R.y + 31, { size: 19, weight: 900, align: 'center' });
    // 고른 기술 정보
    const cur = m.moves[b.moveNav.i];
    if (cur) {
      const d = MOVES[cur.id];
      typeBadge(d.type, 24, y0 + 20, 64, 24, 14);
      txt(d.cat === 'atk' ? '위력 ' + d.pow : '변화', 98, y0 + 39, { size: 17, weight: 800 });
      txt(d.acc ? '명중 ' + d.acc : '필중', 180, y0 + 39, { size: 15, color: UI_COL.sub });
      if (d.cat === 'atk' && b.foe) {
        const e = typeEff(d.type, b.foe.types), lab = e > 1 ? ['효과 굉장!', UI_COL.green] : e < 1 ? ['효과 별로', '#ff8a95'] : ['보통', UI_COL.sub];
        txt(lab[0] + (m.types.includes(d.type) ? ' · 자속' : ''), 262, y0 + 39, { size: 16, weight: 800, color: lab[1] });
      }
    }
    const bw = (W - 52) / 2, bh = 76;
    b.moveNav.beginDraw();
    m.moves.forEach((mv, i) => {
      const d = MOVES[mv.id], t = TYPES[d.type], x = 22 + (i % 2) * (bw + 8), y = y0 + 64 + Math.floor(i / 2) * (bh + 8), on = i === b.moveNav.i;
      b.moveNav.rect(i, x, y, bw, bh);
      ctx.save(); chamfer(x, y, bw, bh, 12);
      const g = ctx.createLinearGradient(x, y, x + bw, y);
      g.addColorStop(0, on ? t.dark : 'rgba(25,40,66,0.95)'); g.addColorStop(1, 'rgba(10,18,34,0.95)');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = on ? t.color : t.color + '66'; ctx.lineWidth = on ? 2.5 : 1.3; ctx.stroke();
      ctx.fillStyle = t.color; ctx.fillRect(x + 3, y + 12, 6, bh - 24); ctx.restore();
      txt(d.name, x + 20, y + 34, { size: d.name.length > 6 ? 18 : 21, weight: 800, color: mv.pp === 0 ? '#777' : '#fff' });
      txt('PP ' + mv.pp + '/' + d.pp, x + 20, y + 60, { size: 15, weight: 700, color: mv.pp === 0 ? UI_COL.red : mv.pp <= d.pp / 4 ? UI_COL.accent : UI_COL.sub });
      if (d.cat === 'atk' && b.foe) { const e = typeEff(d.type, b.foe.types); if (e !== 1) txt(e > 1 ? '▲' : '▼', x + bw - 16, y + 34, { size: 18, weight: 900, align: 'right', color: e > 1 ? UI_COL.green : '#ff8a95' }); }
    });
    // 사령관 지휘 (게이지가 찼을 때만): 패널 위에 넓은 버튼
    if ((b.cmdG || 0) >= 3) {
      const O = b.orderRect = { x: 22, y: y0 - 58, w: W - 44, h: 48 }, on = !!b.order;
      ctx.save(); chamfer(O.x, O.y, O.w, O.h, 10); ctx.fillStyle = on ? 'rgba(255,178,46,0.92)' : 'rgba(30,22,8,0.85)'; ctx.fill();
      ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 1.5 + Math.sin(Tick.time * 6); ctx.stroke(); ctx.restore();
      txt(on ? '◆ 사령관 지휘 ON' : '◇ 사령관 지휘 OFF (눌러서 켜기)', W / 2, O.y + 32, { size: 19, weight: 900, align: 'center', color: on ? '#1a0a14' : '#ffd27a' });
      if (b.orderWarn > 0) { b.orderWarn -= FRAME_DT; txt('지휘는 공격 기술에만 쓸 수 있다', W / 2, O.y - 10, { size: 15, weight: 800, align: 'center', color: '#ff8a95' }); }
    } else b.orderRect = null;
  }
})();
