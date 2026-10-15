// =====================================================================
//  전투 UI (슬림형): 캐릭터를 가리지 않도록 반투명 유리 카드 + 하단 얇은 바
// =====================================================================
const BBAR = { x: 16, y: 566, w: 928, h: 62 };      // 하단 명령/기술 바
const BDLG = { x: 110, y: 548, w: 740, h: 82 };     // 전투 중 대화창

// 유리 카드
function glass(x, y, w, h, o = {}) {
  ctx.save();
  chamfer(x, y, w, h, o.c || 10);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, o.top || 'rgba(14,28,52,0.72)'); g.addColorStop(1, o.bottom || 'rgba(6,12,26,0.78)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = o.line || 'rgba(120,220,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  if (o.accent) { ctx.fillStyle = o.accent; ctx.fillRect(x, y + 6, 3, h - 12); }
  ctx.restore();
}
// 얇은 HP 바 (지연 감소 + 눈금)
function slimBar(x, y, w, h, r, cols) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1] || cols[0]);
  ctx.fillStyle = g; ctx.fillRect(x, y, Math.max(0, w * clamp(r, 0, 1)), h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, Math.max(0, w * clamp(r, 0, 1)), 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = 1; k < 10; k++) ctx.fillRect(x + w * k / 10, y, 1, h);
  ctx.restore();
}
function typeChip(t, x, y) {
  const T = TYPES[t]; const w = measure(T.name, 11, 800) + 12;
  ctx.save(); ctx.fillStyle = T.dark; ctx.globalAlpha = 0.9; chamfer(x, y, w, 15, 4); ctx.fill();
  ctx.fillStyle = T.color; ctx.fillRect(x, y + 13, w, 2); ctx.restore();
  txt(T.name, x + w / 2, y + 12, { size: 11, weight: 800, align: 'center', color: '#fff', shadow: false });
  return w + 4;
}

Object.assign(Battle.prototype, {
  // ---- 적 HUD: 왼쪽 위 (아군 일러스트 머리 위 빈 공간) ----
  drawHudFoe() {
    const f = this.foe; if (!f || this.hudFoe.a <= 0) return;
    const a = this.hudFoe.a, x = 18 - (1 - a) * 260, y = 14, w = 300, h = 56;
    const boss = f.kind === 'boss' || this.kind === 'trainer';
    ctx.save(); ctx.globalAlpha = a;
    glass(x, y, w, h, { accent: boss ? '#ff4d5e' : '#5ff4ff' });
    txt(f.name, x + 14, y + 22, { size: 17, weight: 900 });
    let cx = x + 18 + measure(f.name, 17, 900);
    if (Game.dex.caught[f.key]) { itemIcon('core', cx + 6, y + 15, 12); cx += 18; }
    f.types.forEach(t => { cx += typeChip(t, cx + 4, y + 9); });
    if (f.status) statusBadge(f.status, cx + 6, y + 6);
    txt('Lv.' + f.level, x + w - 12, y + 22, { size: 15, weight: 800, align: 'right', color: UI_COL.accent });
    const r = this.hudFoe.hp / f.maxHp;
    slimBar(x + 14, y + 34, w - 28, 9, r, hpColors(r));
    txt(Math.ceil(r * 100) + '%', x + w - 12, y + 53, { size: 11, weight: 800, align: 'right', color: UI_COL.sub, shadow: false });
    rankBadge(f.rank, x + 12, y + 44, 14);
    ctx.restore();
  },
  // ---- 내 HUD: 오른쪽, 적 발판 아래 빈 공간 ----
  drawHudMe() {
    const m = this.me; if (!m || this.hudMe.a <= 0) return;
    const a = this.hudMe.a, w = 330, h = 74, x = W - w - 18 + (1 - a) * 280, y = 404;
    ctx.save(); ctx.globalAlpha = a;
    const r = this.hudMe.hp / m.maxHp;
    glass(x, y, w, h, { accent: '#5ff4a0' });
    txt(m.name, x + 14, y + 22, { size: 17, weight: 900 });
    let cx = x + 18 + measure(m.name, 17, 900);
    m.types.forEach(t => { cx += typeChip(t, cx + 4, y + 9); });
    if (m.status) statusBadge(m.status, cx + 6, y + 6);
    txt('Lv.' + m.level, x + w - 12, y + 22, { size: 15, weight: 800, align: 'right', color: UI_COL.accent });
    slimBar(x + 14, y + 33, w - 28, 10, r, hpColors(r));
    txt(Math.ceil(this.hudMe.hp) + ' / ' + m.maxHp, x + w - 12, y + 60, { size: 13, weight: 800, align: 'right', shadow: false });
    // EXP
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 14, y + h - 7, w - 28, 3);
    ctx.fillStyle = '#7cd9ff'; ctx.fillRect(x + 14, y + h - 7, (w - 28) * clamp(this.hudMe.exp, 0, 1), 3);
    // 사령관 지휘 게이지
    const g = this.cmdG || 0, full = g >= 3;
    txt('지휘', x + 14, y + 61, { size: 11, weight: 900, color: full ? '#ffb22e' : UI_COL.sub, shadow: false });
    for (let i = 0; i < 3; i++) {
      const px = x + 48 + i * 16, py = y + 57, on = i < g;
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4);
      if (full) { ctx.shadowColor = '#ffb22e'; ctx.shadowBlur = 6 + 5 * Math.sin(Tick.time * 6); }
      ctx.fillStyle = on ? '#ffb22e' : 'rgba(255,178,46,0.15)'; ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 1; ctx.strokeRect(-4.5, -4.5, 9, 9); ctx.restore();
    }
    if (r < 0.2 && r > 0) { ctx.globalAlpha = 0.2 + 0.2 * Math.sin(Tick.time * 8); chamfer(x, y, w, h, 10); ctx.fillStyle = '#ff2a3a'; ctx.fill(); }
    ctx.restore();
  },
  drawTeamDots() {
    const n = this.foes.length;
    for (let i = 0; i < n; i++) { const alive = this.foes[i].hp > 0; ctx.save(); ctx.globalAlpha = 0.9; itemIcon(alive ? 'core' : 'chip', 30 + i * 20, 84, 14); if (!alive) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(30 + i * 20, 84, 8, 0, 7); ctx.fill(); } ctx.restore(); }
  },
  // ---- 명령: 하단 얇은 바 (왼쪽 안내, 오른쪽 버튼 4개) ----
  drawCommand() {
    const B = BBAR;
    glass(B.x, B.y, B.w, B.h, { c: 12 });
    txt(J(this.me.name, '은') + ' 무엇을 할까?', B.x + 18, B.y + 26, { size: 18, weight: 800 });
    // 전술 힌트
    if (this.foe) {
      let best = null, bv = 0;
      for (const mv of this.me.moves) { const d = MOVES[mv.id]; if (d.cat !== 'atk' || mv.pp <= 0) continue; const e0 = typeEff(d.type, this.foe.types); const v = d.pow * e0 * (this.me.types.includes(d.type) ? 1.5 : 1) * (d.acc || 100) / 100 * (e0 > 1 && traitOf(this.foe) === 'heavy' ? 0.75 : 1); if (v > bv) { bv = v; best = d; } }
      let hx = B.x + 18; txt(Game.party.map(p => p.hp > 0 ? '●' : '○').join(''), hx, B.y + 50, { size: 12, color: UI_COL.line, shadow: false }); hx += 14 * Game.party.length + 8;
      txt('상대', hx, B.y + 50, { size: 12, color: UI_COL.sub, shadow: false }); hx += 30;
      this.foe.types.forEach(t => { hx += typeChip(t, hx, B.y + 38); });
      if (best) { const e = typeEff(best.type, this.foe.types); txt('추천 ' + best.name + (e > 1 ? ' ▲' : e < 1 ? ' ▼' : ''), hx + 6, B.y + 50, { size: 13, weight: 800, color: e > 1 ? UI_COL.green : e < 1 ? '#ff8a95' : UI_COL.sub, shadow: false }); }
    }
    const labels = [['전투', '#ff6b4a'], ['가방', '#ffb22e'], ['부대', '#5ff4a0'], ['후퇴', '#5fb8ff']];
    this.menuNav.beginDraw();
    labels.forEach(([l, c], i) => {
      const w = 104, h = 44, x = B.x + B.w - 12 - (4 - i) * (w + 8) + 8, y = B.y + 9;
      this.menuNav.rect(i, x, y, w, h);
      const on = i === this.menuNav.i;
      ctx.save(); chamfer(x, y, w, h, 8);
      if (on) { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, c); g.addColorStop(1, shadeHex(c, -60)); ctx.fillStyle = g; }
      else ctx.fillStyle = 'rgba(20,34,58,0.75)';
      ctx.fill(); ctx.strokeStyle = on ? '#fff' : c + '99'; ctx.lineWidth = on ? 2 : 1; ctx.stroke(); ctx.restore();
      txt(l, x + w / 2, y + 29, { size: 19, weight: 900, align: 'center', color: on ? '#fff' : '#cfe6f5' });
    });
  },
  // ---- 기술: 하단 바에 4개 한 줄 + 선택 기술 정보 말풍선 ----
  drawMoves() {
    const B = BBAR, m = this.me;
    glass(B.x, B.y, B.w, B.h, { c: 12 });
    this.moveNav.beginDraw();
    const n = 4, gap = 8, bw = (B.w - 24 - gap * (n - 1)) / n;
    m.moves.forEach((mv, i) => {
      const d = MOVES[mv.id], t = TYPES[d.type];
      const x = B.x + 12 + i * (bw + gap), y = B.y + 9, w = bw, h = 44;
      this.moveNav.rect(i, x, y, w, h);
      const on = i === this.moveNav.i;
      ctx.save(); chamfer(x, y, w, h, 8);
      const g = ctx.createLinearGradient(x, y, x + w, y); g.addColorStop(0, on ? t.dark : 'rgba(22,36,60,0.8)'); g.addColorStop(1, 'rgba(10,18,34,0.8)');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = on ? t.color : t.color + '66'; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
      ctx.fillStyle = t.color; ctx.fillRect(x + 2, y + 8, 4, h - 16); ctx.restore();
      txt(d.name, x + 14, y + 28, { size: 17, weight: 800, color: mv.pp === 0 ? '#777' : '#fff' });
      if (d.cat === 'atk' && this.foe) { const e = typeEff(d.type, this.foe.types); if (e !== 1) txt(e > 1 ? '▲' : '▼', x + w - 54, y + 28, { size: 14, weight: 900, color: e > 1 ? UI_COL.green : '#ff8a95' }); }
      txt(mv.pp + '/' + d.pp, x + w - 10, y + 28, { size: 13, weight: 700, align: 'right', color: mv.pp === 0 ? UI_COL.red : mv.pp <= d.pp / 4 ? UI_COL.accent : UI_COL.sub });
    });
    // 선택 기술 정보 (버튼 위 말풍선)
    const sel = this.moveNav.i, mv = m.moves[sel]; if (!mv) return;
    const d = MOVES[mv.id];
    const tw = 300, th = 74, tx = clamp(B.x + 12 + sel * (bw + gap) + bw / 2 - tw / 2, 16, W - 16 - tw), ty = B.y - th - 8;
    glass(tx, ty, tw, th, { accent: TYPES[d.type].color });
    typeChip(d.type, tx + 12, ty + 9);
    txt(d.cat === 'atk' ? '위력 ' + d.pow : '변화', tx + 66, ty + 21, { size: 14, weight: 800 });
    txt(d.acc ? '명중 ' + d.acc : '필중', tx + tw - 12, ty + 21, { size: 13, align: 'right', color: UI_COL.sub });
    if (d.cat === 'atk') {
      const e = typeEff(d.type, this.foe.types), stab = m.types.includes(d.type);
      const lab = e > 1 ? ['효과 굉장!', UI_COL.green] : e < 1 ? ['효과 별로...', '#ff8a95'] : ['보통', UI_COL.sub];
      txt(lab[0] + (stab ? ' · 자속' : ''), tx + 150, ty + 21, { size: 13, weight: 800, color: lab[1], shadow: false });
    }
    wrapText(d.desc, tw - 24, 12, 500).slice(0, 2).forEach((l, k) => txt(l, tx + 12, ty + 42 + k * 17, { size: 12, weight: 500, color: '#b8d4e6', shadow: false }));
    // 사령관 지휘 토글 (왼쪽 위)
    if ((this.cmdG || 0) >= 3) {
      const R = this.orderRect = { x: B.x, y: B.y - 44, w: 250, h: 34 }, on = !!this.order;
      if (R.x + R.w > tx - 6 && tx < R.x + R.w) R.y = ty - 42;
      ctx.save(); chamfer(R.x, R.y, R.w, R.h, 8);
      ctx.fillStyle = on ? 'rgba(255,178,46,0.92)' : 'rgba(40,28,8,0.7)'; ctx.fill();
      ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 1.5 + Math.sin(Tick.time * 6); ctx.stroke(); ctx.restore();
      txt((on ? '◆ 사령관 지휘 ON' : '◇ 사령관 지휘 OFF') + '  [M/Tab]', R.x + R.w / 2, R.y + 23, { size: 14, weight: 900, align: 'center', color: on ? '#1a0a14' : '#ffd27a' });
      if (this.orderWarn > 0) { this.orderWarn -= FRAME_DT; txt('지휘는 공격 기술에만 쓸 수 있다', R.x + R.w / 2, R.y - 6, { size: 12, weight: 800, align: 'center', color: '#ff8a95' }); }
    } else this.orderRect = null;
  },
});
function shadeHex(hex, amt) { const n = parseInt(hex.slice(1), 16); const c = v => clamp(v + amt, 0, 255); return 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')'; }
