// =====================================================================
//  사령관 그리기 (원작 밈 스타일: 하얀 몸 + 얼굴에 "사", 머리는 원형)
// =====================================================================
const CMD_COL = { body: '#f8f4f7', shade: '#ddd2e2', line: '#4a2a38', ink: '#3a1626', cheek: '#f2c6cf' };

function cmdShape(g, fn, lw = 2) {
  g.beginPath(); fn(g);
  g.fillStyle = CMD_COL.body; g.fill();
  g.lineWidth = lw; g.strokeStyle = CMD_COL.line; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
}
// 원형 머리 + 얼굴. view: 'front' | 'back' | 'left' | 'right'
function cmdHead(g, cx, cy, r, view, lw = 2, mood = 'normal') {
  // 머리
  cmdShape(g, c => c.arc(cx, cy, r, 0, Math.PI * 2), lw);
  // 음영
  g.save(); g.beginPath(); g.arc(cx, cy, r - lw / 2, 0, Math.PI * 2); g.clip();
  g.fillStyle = CMD_COL.shade; g.beginPath(); g.arc(cx + r * 0.35, cy + r * 0.35, r, 0, Math.PI * 2); g.globalAlpha = 0.45; g.fill(); g.globalAlpha = 1;
  g.restore();
  if (view === 'back') return;
  const side = view === 'left' ? -1 : view === 'right' ? 1 : 0;
  // 귀 (옆모습)
  if (side) {
    cmdShape(g, c => c.ellipse(cx - side * r * 0.62, cy + r * 0.1, r * 0.2, r * 0.27, 0, 0, Math.PI * 2), lw * 0.8);
  }
  const fx = cx + side * r * 0.32;
  // 눈썹 (ㅅ자로 찌푸린)
  g.strokeStyle = CMD_COL.ink; g.lineWidth = Math.max(1.2, r * 0.12); g.lineCap = 'round';
  const ey = cy - r * 0.6, ew = r * 0.22;
  g.beginPath();
  g.moveTo(fx - ew * 1.6, ey - r * 0.08); g.lineTo(fx - ew * 0.45, ey + r * 0.06);
  g.moveTo(fx + ew * 1.6, ey - r * 0.08); g.lineTo(fx + ew * 0.45, ey + r * 0.06);
  if (side) { g.moveTo(fx - ew * 1.6, ey - r * 0.08); }
  g.stroke();
  // "사"
  g.fillStyle = CMD_COL.ink;
  g.font = `900 ${Math.round(r * 0.95)}px 'Black Han Sans','Noto Sans KR','Malgun Gothic',sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('사', fx, cy + r * 0.28);
  // 땀방울
  if (mood === 'sweat') {
    g.fillStyle = '#9fd6ff'; g.strokeStyle = CMD_COL.line; g.lineWidth = 1;
    const sx = fx + r * 0.55, sy = cy + r * 0.45;
    g.beginPath(); g.moveTo(sx, sy - r * 0.2); g.quadraticCurveTo(sx + r * 0.12, sy, sx, sy + r * 0.08); g.quadraticCurveTo(sx - r * 0.12, sy, sx, sy - r * 0.2); g.fill(); g.stroke();
  }
}

// ---- 필드 스프라이트 (타일 48px) ----
function drawCommander(X, Y, dir, anim, running) {
  const g = window.__cmdCtx || ctx, cx = X + 24, foot = Y + 45;
  const step = Math.sin(anim * Math.PI);
  const bob = anim ? Math.abs(step) * 2.5 : 0;
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'left' ? -1 : 1;
  g.save();
  // 그림자
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, foot - 2, 13, 4.5, 0, 0, Math.PI * 2); g.fill();
  // 다리
  if (side) {
    for (const s of [1, -1]) {
      g.save(); g.translate(cx, foot - 15); g.rotate(s * step * 0.45);
      cmdShape(g, c => { c.roundRect ? c.roundRect(-3.5, 0, 7, 14, 3.5) : c.rect(-3.5, 0, 7, 14); }, 1.6);
      g.restore();
    }
  } else {
    const l = Math.max(0, step) * 3, r = Math.max(0, -step) * 3;
    cmdShape(g, c => { c.roundRect ? c.roundRect(cx - 8, foot - 15 + l, 7, 14 - l, 3.5) : c.rect(cx - 8, foot - 15 + l, 7, 14 - l); }, 1.6);
    cmdShape(g, c => { c.roundRect ? c.roundRect(cx + 1, foot - 15 + r, 7, 14 - r, 3.5) : c.rect(cx + 1, foot - 15 + r, 7, 14 - r); }, 1.6);
  }
  g.translate(0, -bob);
  // 팔 (뒤쪽)
  const aw = (side ? step * 5 : step * 2.5);
  if (!side) {
    cmdShape(g, c => { c.roundRect ? c.roundRect(cx - 15, foot - 31 + aw, 6, 15, 3) : c.rect(cx - 15, foot - 31 + aw, 6, 15); }, 1.6);
    cmdShape(g, c => { c.roundRect ? c.roundRect(cx + 9, foot - 31 - aw, 6, 15, 3) : c.rect(cx + 9, foot - 31 - aw, 6, 15); }, 1.6);
  }
  // 몸통 (둥근 사다리꼴)
  cmdShape(g, c => {
    c.moveTo(cx - 9, foot - 33); c.quadraticCurveTo(cx, foot - 36, cx + 9, foot - 33);
    c.quadraticCurveTo(cx + 12, foot - 22, cx + 11, foot - 13); c.quadraticCurveTo(cx, foot - 10, cx - 11, foot - 13);
    c.quadraticCurveTo(cx - 12, foot - 22, cx - 9, foot - 33); c.closePath();
  }, 1.8);
  // 몸 음영
  g.save(); g.globalAlpha = 0.5; g.fillStyle = CMD_COL.shade; g.beginPath(); g.moveTo(cx + 3, foot - 32); g.quadraticCurveTo(cx + 11, foot - 22, cx + 10, foot - 14); g.quadraticCurveTo(cx + 5, foot - 12, cx + 2, foot - 13); g.closePath(); g.fill(); g.restore();
  // 옆모습 팔 (앞쪽)
  if (side) {
    g.save(); g.translate(cx - flip * 1.5, foot - 31); g.rotate(-flip * step * 0.55);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 12);
    g.lineCap = 'round'; g.strokeStyle = CMD_COL.line; g.lineWidth = 6.2; g.stroke();
    g.strokeStyle = CMD_COL.body; g.lineWidth = 3.6; g.stroke();
    g.restore();
  }
  // 머리 (원형)
  const view = dir === 'up' ? 'back' : dir === 'down' ? 'front' : dir;
  cmdHead(g, cx, foot - 44, 11.5, view, 1.8);
  g.restore();
}

// ---- 큰 사령관 (전투 뒷모습 / 카드 흉상) ----
function drawCommanderBig(cx, foot, s, view = 'back', mood = 'normal') {
  const g = window.__cmdCtx || ctx;
  g.save(); g.translate(cx, foot); g.scale(s, s);
  // 그림자
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 0, 60, 12, 0, 0, Math.PI * 2); g.fill();
  // 다리
  cmdShape(g, c => { c.moveTo(-26, -70); c.quadraticCurveTo(-30, -30, -24, -4); c.lineTo(-6, -4); c.quadraticCurveTo(-4, -40, -2, -70); c.closePath(); }, 3);
  cmdShape(g, c => { c.moveTo(26, -70); c.quadraticCurveTo(30, -30, 24, -4); c.lineTo(6, -4); c.quadraticCurveTo(4, -40, 2, -70); c.closePath(); }, 3);
  // 팔
  cmdShape(g, c => { c.moveTo(-40, -150); c.quadraticCurveTo(-62, -110, -58, -70); c.quadraticCurveTo(-50, -64, -44, -72); c.quadraticCurveTo(-46, -110, -30, -140); c.closePath(); }, 3);
  cmdShape(g, c => { c.moveTo(40, -150); c.quadraticCurveTo(62, -110, 58, -70); c.quadraticCurveTo(50, -64, 44, -72); c.quadraticCurveTo(46, -110, 30, -140); c.closePath(); }, 3);
  // 몸통
  cmdShape(g, c => { c.moveTo(-34, -160); c.quadraticCurveTo(0, -172, 34, -160); c.quadraticCurveTo(46, -110, 36, -64); c.quadraticCurveTo(0, -54, -36, -64); c.quadraticCurveTo(-46, -110, -34, -160); c.closePath(); }, 3.2);
  g.save(); g.globalAlpha = 0.45; g.fillStyle = CMD_COL.shade; g.beginPath(); g.moveTo(10, -165); g.quadraticCurveTo(44, -112, 34, -66); g.quadraticCurveTo(20, -60, 12, -62); g.quadraticCurveTo(22, -110, 10, -165); g.fill(); g.restore();
  // 머리
  cmdHead(g, 0, -204, 40, view, 3.2, mood);
  g.restore();
}
function drawCommanderBust(x, y, s = 1) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 100 * s, y - 120 * s, 200 * s, 175 * s); ctx.clip();
  drawCommanderBig(x, y + 150 * s, 0.9 * s, 'front', 'sweat');
  ctx.restore();
}

// ---- 오토바이 (사이드 퀘스트 보상). layer: 'back' 은 사령관보다 먼저, 'front' 는 나중에 그린다 ----
function drawBike(X, Y, dir, layer, t) {
  const g = window.__cmdCtx || ctx, cx = X + 24, foot = Y + 45, side = dir === 'left' || dir === 'right', f = dir === 'left' ? -1 : 1;
  const RED = '#d8352f', DARK = '#2a2d33', CHROME = '#c9d1da', spin = (t || 0) * 18;
  const wheel = (x, y, r) => {
    g.fillStyle = '#16181c'; g.beginPath(); g.ellipse(x, y, r, side ? r : r * 0.45, 0, 0, 7); g.fill();
    g.fillStyle = '#6b7380'; g.beginPath(); g.ellipse(x, y, r * 0.45, side ? r * 0.45 : r * 0.2, 0, 0, 7); g.fill();
    if (side) { g.strokeStyle = '#9aa3ad'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { const a = spin + k * 2.09; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); g.stroke(); } }
  };
  g.save();
  if (side) {
    if (layer === 'back') {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, foot - 1, 24, 5, 0, 0, 7); g.fill();
      wheel(cx - f * 15, foot - 8, 8.5);
      // 차체: 뒤 펜더 → 시트 → 연료탱크
      g.fillStyle = DARK; g.beginPath(); g.moveTo(cx - f * 22, foot - 15); g.lineTo(cx + f * 4, foot - 16); g.lineTo(cx + f * 6, foot - 10); g.lineTo(cx - f * 12, foot - 8); g.closePath(); g.fill();
      g.fillStyle = RED; g.beginPath(); g.moveTo(cx - f * 4, foot - 20); g.quadraticCurveTo(cx + f * 10, foot - 25, cx + f * 15, foot - 18); g.lineTo(cx + f * 4, foot - 14); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(cx + f * 2 - (f < 0 ? 6 : 0), foot - 22, 6, 2);
      g.fillStyle = '#1c1c1c'; g.beginPath(); g.ellipse(cx - f * 9, foot - 18, 9, 3, 0, 0, 7); g.fill();
      g.strokeStyle = CHROME; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - f * 18, foot - 9); g.lineTo(cx - f * 26, foot - 11); g.stroke(); // 배기관
    } else {
      wheel(cx + f * 16, foot - 8, 8.5);
      g.strokeStyle = CHROME; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + f * 16, foot - 8); g.lineTo(cx + f * 12, foot - 26); g.stroke(); // 앞 포크
      g.strokeStyle = DARK; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + f * 6, foot - 27); g.lineTo(cx + f * 14, foot - 28); g.stroke(); // 핸들
      g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(cx + f * 15, foot - 23, 2.6, 0, 7); g.fill(); // 전조등
    }
  } else if (dir === 'down') {
    // 정면: 뒷바퀴는 사령관 뒤, 앞바퀴·핸들·전조등은 앞
    if (layer === 'back') {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, foot - 1, 13, 6, 0, 0, 7); g.fill();
      g.fillStyle = DARK; g.fillRect(cx - 5, foot - 26, 10, 10);
    } else {
      wheel(cx, foot - 6, 7);
      g.fillStyle = RED; g.beginPath(); g.moveTo(cx - 8, foot - 16); g.lineTo(cx + 8, foot - 16); g.lineTo(cx + 5, foot - 8); g.lineTo(cx - 5, foot - 8); g.closePath(); g.fill();
      g.strokeStyle = DARK; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 15, foot - 25); g.lineTo(cx + 15, foot - 25); g.stroke();
      g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(cx, foot - 19, 3.2, 0, 7); g.fill();
      g.strokeStyle = CHROME; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 15, foot - 25); g.lineTo(cx - 17, foot - 28); g.moveTo(cx + 15, foot - 25); g.lineTo(cx + 17, foot - 28); g.stroke();
    }
  } else {
    // 뒷모습: 핸들은 사령관 뒤, 뒷바퀴·후미등·번호판은 앞
    if (layer === 'back') {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, foot - 1, 13, 6, 0, 0, 7); g.fill();
      g.strokeStyle = DARK; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 15, foot - 30); g.lineTo(cx + 15, foot - 30); g.stroke();
    } else {
      wheel(cx, foot - 6, 7);
      g.fillStyle = DARK; g.beginPath(); g.moveTo(cx - 9, foot - 18); g.lineTo(cx + 9, foot - 18); g.lineTo(cx + 6, foot - 10); g.lineTo(cx - 6, foot - 10); g.closePath(); g.fill();
      g.fillStyle = '#ff3a3a'; g.fillRect(cx - 5, foot - 18, 10, 3);
      g.fillStyle = '#e8e2d0'; g.fillRect(cx - 4, foot - 14, 8, 4);
      g.strokeStyle = CHROME; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + 7, foot - 9); g.lineTo(cx + 11, foot - 4); g.stroke();
    }
  }
  g.restore();
}
