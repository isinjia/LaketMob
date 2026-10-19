// =====================================================================
//  기술 이펙트 (three.js 파티클): 모든 기술을 '예비 동작 → 발사·이동 → 명중 → 여운' 4단으로 연출한다.
//  - window.FX(js/fx.js)의 인스턴스 파티클·리본 위에 합성 이펙트 부품(VFX)을 얹는다.
//  - 좌표는 화면 픽셀(세로 전투는 가상 960 좌표)로 받고 BFX.wx/wy 로 월드 좌표로 바꾼다.
//  - 폰(LOW_MEM)은 파티클 수를 줄인다.  battlefx.js, battleportrait.js 다음에 로드한다.
// =====================================================================
(function () {
  if (typeof BFX === 'undefined' || typeof Battle === 'undefined') return;
  const Q = LOW_MEM ? 0.6 : 1;                     // 파티클 수 배율
  const n = (k) => Math.max(1, Math.round(k * Q));
  const R = (a, b) => a + Math.random() * (b - a);
  const P = () => window.FX;
  const wx = (x) => BFX.wx(x), wy = (y) => BFX.wy(y);
  const hex = (c) => BFX.col(c);
  let budgetSet = false;
  const on = () => { const ok = BFX.ok && window.FX && window.FX.sheets; if (ok && LOW_MEM && !budgetSet) { budgetSet = true; window.FX.setBudget(520); } return ok; };
  const busy = () => { BFX.busy = Math.max(BFX.busy, 4); };
  const later = (sec, fn) => P().later(sec, fn);
  const HOT = 0xffffff;
  // 타입별 색: [주색, 보조색(뜨거운 쪽)]
  const PAL = {
    phys: [0xffd27a, 0xfff2c0], light: [0x5fe6ff, 0xd8fbff], heavy: [0xff9a3d, 0xffe0a0], air: [0x7dffb8, 0xe0fff0],
    fire: [0xff5a1e, 0xffd060], ice: [0x7fe8ff, 0xf0fdff], elec: [0xffe14d, 0xfffbe0],
  };
  const pal = (type) => PAL[type] || [hex(TYPES[type] ? TYPES[type].color : '#ffffff'), HOT];

  // ---------------------------------------------------------------- 부품
  const V = {
    // 명중 핵: 흰 섬광 + 색 번짐 + 십자 별빛
    core(x, y, col, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      f.particle({ x: X, y: Y, life: 0.12, size: 0.6 * s, size1: 1.5 * s, color: HOT, tex: f.tex.glow, alpha: 0.9 });
      f.particle({ x: X, y: Y, life: 0.34, size: 1.2 * s, size1: 3.0 * s, color: col, tex: f.tex.glow, alpha: 0.7 });
      f.particle({ x: X, y: Y, life: 0.22, size: 2.6 * s, size1: 0.4 * s, color: HOT, tex: f.tex.cross, rot: R(0, 3), spin: 2, alpha: 1 });
    },
    // 충격파: 굵은 고리 + 늦게 퍼지는 얇은 고리 (ground=true 면 바닥에 납작한 타원)
    shock(x, y, col, s = 1, ground = false) {
      const f = P(), X = wx(x), Y = wy(y), asp = ground ? 0.32 : 1;
      f.particle({ x: X, y: Y, life: 0.36, size: 0.5 * s, size1: 5.2 * s, aspect: asp, color: col, tex: f.tex.ring, alpha: 0.95 });
      later(0.07, () => f.particle({ x: X, y: Y, life: 0.42, size: 0.3 * s, size1: 3.6 * s, aspect: asp, color: HOT, tex: f.tex.ring, alpha: 0.55 }));
    },
    // 길쭉한 불꽃 (속도 방향으로 늘어진 빛줄기)
    streaks(x, y, col, cnt = 14, spd = 7, s = 1, dir = null, spread = Math.PI) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(cnt); i++) {
        const a = dir == null ? R(0, Math.PI * 2) : dir + R(-spread, spread), v = spd * R(0.45, 1.15);
        f.particle({ x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 4.5, life: R(0.22, 0.42), size: 0.09 * s, size1: 0.02,
          aspect: R(4, 7), rot: a - Math.PI / 2, color: i % 3 ? col : HOT, tex: f.tex.beam, alpha: 1 });
      }
    },
    // 불티: 위로 떠오르며 깜빡이는 작은 빛
    embers(x, y, col, cnt = 10, s = 1, rise = 1.4) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(cnt); i++) f.particle({ x: X + R(-0.8, 0.8) * s, y: Y + R(-0.5, 0.6) * s, vx: R(-0.8, 0.8), vy: R(0.4, 1.6) * rise,
        grav: -0.6 * rise, drag: 0.8, life: R(0.6, 1.2), size: R(0.08, 0.16) * s, size1: 0, color: i % 2 ? col : HOT, tex: f.tex.dot, fadeIn: 0.05 });
    },
    // 연기 (일반 블렌딩, 어두운 색)
    smoke(x, y, cnt = 4, s = 1, col = 0x4a505c, alpha = 0.5) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(cnt); i++) f.particle({ x: X + R(-0.6, 0.6) * s, y: Y + R(-0.3, 0.5) * s, vx: R(-0.7, 0.7), vy: R(0.3, 1.1), drag: 0.6,
        life: R(0.8, 1.4), size: 1.0 * s, size1: R(2.2, 3.2) * s, color: col, frames: f.sheets.smoke, alpha, normal: true, order: f.L.FX - 2, spin: R(-1, 1), fadeIn: 0.08 });
    },
    // 파편: 회전하며 떨어지는 조각 (일반 블렌딩)
    debris(x, y, cnt = 8, s = 1, col = 0x6a6258) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(cnt); i++) { const a = R(0.3, Math.PI - 0.3), v = R(3, 7) * s;
        f.particle({ x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 14, life: R(0.5, 0.8), size: R(0.08, 0.18) * s, aspect: R(0.6, 1.4),
          color: col, tex: f.tex.white, normal: true, spin: R(-12, 12), rot: R(0, 6) }); }
    },
    // 바닥 흙먼지: 옆으로 퍼지는 연기
    dust(x, y, s = 1, col = 0x9a8c74) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(6); i++) { const d = i % 2 ? 1 : -1;
        f.particle({ x: X + d * R(0.2, 0.8) * s, y: Y, vx: d * R(1.5, 3.2) * s, vy: R(0.1, 0.5), drag: 2.2, life: R(0.6, 1.0), size: 0.6 * s, size1: 1.8 * s,
          color: col, frames: f.sheets.smoke, alpha: 0.45, normal: true, order: f.L.FX - 2, spin: R(-1, 1) }); }
    },
    // 모으기: 둘레의 빛이 중심으로 빨려 들고 중심이 부푼다
    charge(x, y, col, dur = 0.35, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(16); i++) { const a = R(0, Math.PI * 2), r = R(1.4, 2.4) * s, life = dur * R(0.7, 1);
        f.particle({ x: X + Math.cos(a) * r, y: Y + Math.sin(a) * r, vx: -Math.cos(a) * r / life, vy: -Math.sin(a) * r / life, life, size: 0.05, size1: 0.16 * s,
          aspect: 3, rot: a - Math.PI / 2, color: i % 2 ? col : HOT, tex: f.tex.beam, fadeIn: 0.08 }); }
      f.particle({ x: X, y: Y, life: dur + 0.08, size: 0.2 * s, size1: 1.6 * s, color: col, tex: f.tex.glow, fadeIn: dur * 0.8, alpha: 0.9 });
      f.particle({ x: X, y: Y, life: dur, size: 2.6 * s, size1: 0.2, color: col, tex: f.tex.ring, alpha: 0.7 });
    },
    // 빛기둥 (위로 솟는 오라)
    pillar(x, y, col, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      f.particle({ x: X, y: Y + 1.6 * s, life: 0.7, size: 0.9 * s, size1: 1.2 * s, aspect: 5, color: col, tex: f.tex.beam, alpha: 0.75, fadeIn: 0.1 });
      for (let i = 0; i < n(14); i++) f.particle({ x: X + R(-0.9, 0.9) * s, y: Y + R(-0.2, 0.4), vy: R(2.5, 5) * s, drag: 0.5, life: R(0.5, 0.9),
        size: 0.06 * s, size1: 0.02, aspect: 6, color: i % 2 ? col : HOT, tex: f.tex.beam });
    },
    // 날아가는 투사체 (지속 스프라이트 + 꼬리). 도착하면 resolve
    projectile(from, to, col, ms, o = {}) {
      return new Promise((res) => {
        if (!on()) return res();
        busy();
        const f = P(), s = o.size || 1;
        const head = f.sprite({ x: wx(from.x), y: wy(from.y), size: 0.55 * s, color: o.headColor || HOT, tex: f.tex.glow, alpha: 1 });
        const halo = f.sprite({ x: wx(from.x), y: wy(from.y), size: 1.3 * s, color: col, tex: o.haloTex ? f.tex[o.haloTex] : f.tex.glow, alpha: 0.85 });
        let t = 0, px = from.x, py = from.y;
        Tick.add((dt) => {
          t += dt * 1000; const k = Math.min(1, t / ms), e = o.ease ? o.ease(k) : k;
          const x = lerp(from.x, to.x, e) + (o.wob ? Math.sin(k * 18) * o.wob : 0), y = lerp(from.y, to.y, e) - Math.sin(k * Math.PI) * (o.arc || 0);
          head.x = halo.x = wx(x); head.y = halo.y = wy(y); halo.rot += dt * (o.spin || 0);
          const steps = 2, X0 = wx(px), Y0 = wy(py);
          for (let j = 0; j < steps; j++) { const fr = j / steps;
            f.particle({ x: X0 + (head.x - X0) * fr, y: Y0 + (head.y - Y0) * fr, life: o.trailLife || 0.28, size: 0.7 * s, size1: 0.1, color: col, tex: f.tex.glow, alpha: 0.6 });
            if (o.smoke && Math.random() < 0.35 * Q) f.particle({ x: head.x, y: head.y, vx: R(-0.3, 0.3), vy: R(0, 0.4), life: 0.6, size: 0.4 * s, size1: 1.1 * s, color: 0x50545c, frames: f.sheets.smoke, alpha: 0.35, normal: true, order: f.L.FX - 2 });
            if (o.embers && Math.random() < 0.5 * Q) f.particle({ x: head.x, y: head.y, vx: R(-1, 1), vy: R(-1, 1), life: R(0.25, 0.45), size: 0.1 * s, size1: 0, color: HOT, tex: f.tex.dot });
          }
          px = x; py = y;
          if (k >= 1) { f.kill(head); f.kill(halo); res(); return false; }
        });
      });
    },
    // 총알 예광탄: 빠르게 늘어진 빛줄기
    tracer(from, to, col, ms = 90, s = 1) {
      const f = P(), a = Math.atan2(wy(to.y) - wy(from.y), wx(to.x) - wx(from.x)), d = Math.hypot(wx(to.x) - wx(from.x), wy(to.y) - wy(from.y));
      f.particle({ x: wx(from.x), y: wy(from.y), vx: Math.cos(a) * d / (ms / 1000), vy: Math.sin(a) * d / (ms / 1000), life: ms / 1000, size: 0.09 * s, size1: 0.08 * s, aspect: 12, rot: a - Math.PI / 2, color: col, tex: f.tex.beam, alpha: 1 });
      f.particle({ x: wx(from.x), y: wy(from.y), vx: Math.cos(a) * d / (ms / 1000), vy: Math.sin(a) * d / (ms / 1000), life: ms / 1000, size: 0.04 * s, size1: 0.04 * s, aspect: 18, rot: a - Math.PI / 2, color: HOT, tex: f.tex.beam, alpha: 1 });
    },
    // 베기 궤적: 큰 초승달 + 흰 안쪽 + 궤적을 따라 흩어지는 빛
    slashArc(x, y, col, s = 1, rot = R(0, Math.PI * 2)) {
      const f = P(), X = wx(x), Y = wy(y);
      f.particle({ x: X, y: Y, life: 0.36, size: 3.0 * s, size1: 4.0 * s, color: col, tex: f.tex.slash, rot, alpha: 1 });
      f.particle({ x: X, y: Y, life: 0.26, size: 2.6 * s, size1: 3.5 * s, color: HOT, tex: f.tex.slash, rot: rot + 0.12, alpha: 0.95 });
      later(0.05, () => f.particle({ x: X, y: Y, life: 0.3, size: 3.4 * s, size1: 4.4 * s, color: col, tex: f.tex.slash, rot: rot - 0.15, alpha: 0.45 }));
      for (let i = 0; i < n(10); i++) { const a = rot + Math.PI * R(1.2, 1.8) + Math.PI / 2, r = 1.3 * s;
        f.particle({ x: X + Math.cos(a) * r, y: Y + Math.sin(a) * r, vx: Math.cos(a) * R(1, 3), vy: Math.sin(a) * R(1, 3), drag: 3, life: R(0.2, 0.4), size: 0.1 * s, size1: 0, color: i % 2 ? col : HOT, tex: f.tex.dot }); }
    },
    // 화염 분사: 퍼지며 커지는 불꽃 + 불티
    flameJet(from, to, col, s = 1) {
      // fx_firehit 시트는 작은 폭발 그림이라 화염 줄기는 부드러운 빛 입자를 색만 바꿔 겹쳐 만든다 (흰노랑 → 주황 → 빨강)
      const f = P(), X0 = wx(from.x), Y0 = wy(from.y), X1 = wx(to.x), Y1 = wy(to.y);
      const cols = [0xfff0b0, 0xffb040, col, 0xff3a10];
      for (let i = 0; i < n(7); i++) { const k = R(0.75, 1.1), life = R(0.3, 0.42), c = cols[i % cols.length];
        f.particle({ x: X0, y: Y0, vx: (X1 - X0) / life * k + R(-1.2, 1.2), vy: (Y1 - Y0) / life * k + R(-1, 1.6), drag: 0.6, life,
          size: 0.35 * s, size1: R(1.5, 2.3) * s, color: c, tex: f.tex.glow, alpha: i % 4 === 0 ? 0.9 : 0.6 });
      }
      f.particle({ x: X0, y: Y0, life: 0.12, size: 0.5 * s, size1: 0.9 * s, color: 0xfff0b0, tex: f.tex.glow, alpha: 0.9 });
      for (let i = 0; i < n(2); i++) f.particle({ x: X0, y: Y0, vx: (X1 - X0) / 0.5 + R(-2, 2), vy: (Y1 - Y0) / 0.5 + R(-1, 3), grav: -2, life: 0.5, size: 0.1, size1: 0, color: HOT, tex: f.tex.dot });
    },
    // 기본 명중 세트 (힘 s, 타입 색)
    impact(x, y, type, s = 1, o = {}) {
      if (!on()) return; busy();
      const [c1, c2] = pal(type);
      V.core(x, y, c1, s);
      V.shock(x, y, c1, s * 0.9);
      V.streaks(x, y, c2, 12 + 8 * s, 6 * s, s);
      if (o.smoke !== false) V.smoke(x, y, 2 + Math.round(s * 2), s * 0.8);
      if (o.debris) V.debris(x, y + 20, 6 + 4 * s, s);
      if (o.embers) V.embers(x, y, c1, 8, s);
    },
  };
  // 어느 부품을 불러도 이펙트 레이어가 깨어 있게 (BFX.busy 가 0이면 파티클을 지운다)
  for (const k of Object.keys(V)) { const f = V[k]; V[k] = function () { if (!on()) return k === 'projectile' ? Promise.resolve() : undefined; busy(); return f.apply(V, arguments); }; }
  window.VFX = V;

  // ---------------------------------------------------------------- 기술별 연출
  Battle.prototype.playFx3 = async function (fx, side, tSide, type, isAtk) {
    if (['slash', 'slash3', 'bite', 'dash', 'smash'].includes(fx)) return this.meleeFx(fx, side, tSide, type);
    const A = this.fxOrigin(side, fx), B = this.fxTarget(tSide), uv = this.view(side), flip = side === 'foe';
    const [c1, c2] = pal(type);
    const ground = (p) => ({ x: p.x, y: p.y + 70 });   // 대상 발밑 근처
    const dirTo = Math.atan2(wy(B.y) - wy(A.y), wx(B.x) - wx(A.x));
    const near = (p, r = 40) => ({ x: p.x + R(-r, r), y: p.y + R(-r * 0.7, r * 0.7) });
    busy();
    switch (fx) {
      case 'bullet': {
        for (let i = 0; i < 3; i++) await this.fireShot(side, tSide, fx, type, 6);
        V.smoke(B.x, B.y, 2, 0.6); break;
      }
      case 'bullets': {
        const shots = [];
        for (let i = 0; i < 8; i++) { shots.push(this.fireShot(side, tSide, fx, type, 16)); await wait(50); }
        await Promise.all(shots); V.smoke(B.x, B.y, 3, 0.8); V.debris(B.x, B.y + 30, 6, 0.8); break;
      }
      case 'snipe': {
        Audio2.sfx('charge', 0.45);
        V.charge(A.x, A.y, 0xffffff, 0.38, 0.8);
        // 조준선
        P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], 0.04, 0xff3b3b, 0.38, { alpha: 0.7 });
        await wait(380);
        Audio2.sfx('atk_rifle', 0.95); BattleArt.flash(this, side, B, fx, type);
        BFX.beam(A.x, A.y, B.x, B.y, 7, 0xfff3c0, 0.32);
        V.streaks(A.x, A.y, 0xfff2c0, 8, 6, 0.8, dirTo, 0.35);
        await wait(60);
        V.impact(B.x, B.y, type, 1.35, { debris: true });
        V.streaks(B.x, B.y, HOT, 10, 9, 1, dirTo, 0.5);
        BFX.baked('skill_hit_simple', B.x, B.y, 1.3, flip); FX.doFlash('#fff', 0.3); await wait(120); break;
      }
      case 'shell': {
        Audio2.sfx('atk_rifle', 0.7); BattleArt.flash(this, side, B, fx, type);
        V.smoke(A.x, A.y, 3, 0.7);
        await V.projectile(A, B, 0xffb050, 430, { arc: 150, size: 0.8, smoke: true, embers: true });
        Audio2.sfx('explosion', 0.65);
        V.impact(B.x, B.y, 'heavy', 1.6, { debris: true, embers: true });
        V.dust(ground(B).x, ground(B).y, 1.3); V.shock(ground(B).x, ground(B).y, 0xffb066, 1.3, true);
        BFX.baked('simple_explosion', B.x, B.y, 1.2, flip); FX.doShake(9, 0.25); break;
      }
      case 'barrage': {
        for (let i = 0; i < 5; i++) {
          Audio2.sfx('atk_rifle', 0.5); BattleArt.flash(this, side, B, fx, type);
          const q = near(B, 70);
          V.projectile(A, q, 0xffb050, 360, { arc: 110 + i * 25, size: 0.6, smoke: true }).then(() => {
            Audio2.sfx('explosion', 0.4); V.impact(q.x, q.y, 'heavy', 1.1, { debris: true }); BFX.baked(i % 2 ? 'RPG_skill2_hit' : 'simple_explosion', q.x, q.y, 0.9, flip); });
          await wait(95);
        }
        await wait(420); Audio2.sfx('explosion_big', 0.7);
        V.shock(ground(B).x, ground(B).y, 0xff9a3d, 1.8, true); V.dust(ground(B).x, ground(B).y, 1.6); V.smoke(B.x, B.y, 6, 1.4);
        FX.doShake(14, 0.4); await wait(150); break;
      }
      case 'beam': case 'icebeam': case 'plasma': {
        const bc = fx === 'beam' ? 0x7ff6ff : fx === 'icebeam' ? 0x9ff4ff : 0xffe14d;
        Audio2.sfx('charge', 0.55); V.charge(A.x, A.y, bc, 0.36, 1); await wait(360);
        Audio2.sfx(fx === 'icebeam' ? 'ice' : 'atk_laser', 0.85);
        const w = fx === 'beam' ? 26 : 18;
        BFX.beam(A.x, A.y, B.x, B.y, w, bc, 0.5);
        P().ribbon(P().jagged(wx(A.x), wy(A.y), wx(B.x), wy(B.y), fx === 'plasma' ? 0.22 : 0.08, 0.3), w / BFX.U * 0.6, HOT, 0.4, { shrink: true });
        // 빔을 따라 흐르는 입자
        for (let i = 0; i < n(18); i++) { const k = R(0, 1), X = lerp(wx(A.x), wx(B.x), k), Y = lerp(wy(A.y), wy(B.y), k);
          P().particle({ x: X, y: Y, vx: Math.cos(dirTo) * R(3, 6), vy: Math.sin(dirTo) * R(3, 6) + R(-0.6, 0.6), life: R(0.25, 0.5), size: 0.14, size1: 0, color: i % 2 ? bc : HOT, tex: fx === 'icebeam' && i % 3 === 0 ? P().tex.snow : P().tex.dot, spin: 4 }); }
        V.streaks(A.x, A.y, bc, 8, 5, 0.8, dirTo, 0.4);
        await wait(140);
        V.impact(B.x, B.y, fx === 'icebeam' ? 'ice' : fx === 'plasma' ? 'elec' : 'light', 1.5);
        if (fx === 'beam') BFX.baked('Mercury_N_Skill2_Hit', B.x, B.y, 1.3, flip);
        else if (fx === 'icebeam') { BFX.frost(B.x, B.y, 110, bc); BFX.baked('Undine_skill1_Hit', B.x, B.y, 1.1, flip); }
        else { BFX.lightning([B, near(B, 60)], 0xffe14d, 0.16, 0.2); BFX.baked('Sleipnir_hit', B.x, B.y, 1.2, flip); }
        await wait(160); break;
      }
      case 'dive': {
        Audio2.sfx('whoosh', 0.8);
        V.streaks(A.x, A.y + 60, c1, 10, 6, 1, Math.PI / 2, 0.4); V.dust(A.x, A.y + 120, 1);
        await tween(uv, { dy: -260, a: 0.2 }, 220, Ease.inQuad);
        BFX.beam(B.x, B.y - 420, B.x, B.y, 18, c1, 0.28);
        for (let i = 0; i < n(10); i++) P().particle({ x: wx(B.x + R(-30, 30)), y: wy(B.y - R(150, 380)), vy: -14, life: 0.22, size: 0.08, aspect: 9, color: HOT, tex: P().tex.beam });
        await wait(130);
        V.impact(B.x, B.y, 'air', 1.6, { debris: true });
        V.shock(ground(B).x, ground(B).y, c1, 1.7, true); V.dust(ground(B).x, ground(B).y, 1.5);
        BFX.baked('Harpy_skill2_missile_last_Hit', B.x, B.y, 1.1, flip); FX.doShake(10, 0.3);
        uv.dy = 0; tween(uv, { a: 1 }, 200); break;
      }
      case 'bombs': {
        Audio2.sfx('whoosh', 0.6);
        for (let i = 0; i < 6; i++) {
          const q = { x: B.x + R(-110, 110), y: B.y + R(-20, 60) };
          V.projectile({ x: q.x + R(-40, 40), y: q.y - 460 }, q, 0xffe0a0, 300, { size: 0.45, smoke: true }).then(() => {
            Audio2.sfx('explosion', 0.45); V.impact(q.x, q.y, 'heavy', 1.15, { debris: true }); V.dust(q.x, q.y + 50, 0.9);
            BFX.baked(i % 2 ? 'Thetis_skill1_Ground_Hit' : 'simple_explosion', q.x, q.y, 0.9, flip); });
          await wait(85);
        }
        await wait(420); V.smoke(B.x, B.y + 30, 6, 1.5); FX.doShake(12, 0.35); break;
      }
      case 'flame': {
        BattleArt.flash(this, side, B, fx, type); Audio2.sfx('flame', 0.75);
        for (let i = 0; i < 14; i++) { V.flameJet(A, near(B, 30), 0xff6a2a, 1); await wait(28); }
        V.impact(B.x, B.y, 'fire', 1.2, { embers: true }); V.embers(B.x, B.y + 40, 0xff8a3d, 14, 1.4);
        BFX.baked('Phoenix_skill1_hit', B.x, B.y, 1.0, flip); await wait(220); break;
      }
      case 'fireball': {
        Audio2.sfx('fireball', 0.75); V.charge(A.x, A.y, 0xff7a30, 0.28, 0.9); await wait(260);
        BattleArt.flash(this, side, B, fx, type);
        await V.projectile(A, B, 0xff6a2a, 400, { arc: 50, size: 1.2, embers: true, smoke: true, haloTex: 'glow' });
        V.impact(B.x, B.y, 'fire', 1.7, { embers: true });
        BFX.baked('Phoenix_skill1_hit', B.x, B.y, 1.2, flip); V.embers(B.x, B.y + 30, 0xff8a3d, 16, 1.4); break;
      }
      case 'napalm': {
        Audio2.sfx('fireball', 0.8);
        await V.projectile(A, B, 0xff6a2a, 380, { arc: 170, size: 1, embers: true, smoke: true });
        Audio2.sfx('explosion_big', 0.7); Audio2.sfx('flame', 0.5); FX.doFlash('#ff7a45', 0.3); FX.doShake(14, 0.4);
        V.impact(B.x, B.y, 'fire', 1.9, { embers: true, debris: true });
        V.shock(ground(B).x, ground(B).y, 0xff5a1e, 2, true);
        for (let i = 0; i < 8; i++) { const x = B.x + R(-90, 90); V.flameJet({ x, y: B.y + 80 }, { x: x + R(-20, 20), y: B.y - 70 }, 0xff5a20, 0.9); await wait(40); }
        V.smoke(B.x, B.y - 30, 6, 1.5, 0x3a3030, 0.55); await wait(200); break;
      }
      case 'ice': {
        Audio2.sfx('ice', 0.65);
        for (let i = 0; i < 4; i++) {
          const q = near(B, 35);
          V.projectile(A, q, 0xbff6ff, 300, { size: 0.55, haloTex: 'snow', spin: 10 }).then(() => { V.core(q.x, q.y, 0x9ff4ff, 0.7); V.streaks(q.x, q.y, HOT, 8, 5, 0.8); });
          await wait(75);
        }
        await wait(260); BFX.frost(B.x, B.y, 90, 0x9ff4ff); V.shock(B.x, B.y, 0x9ff4ff, 1.2); BFX.baked('Undine_skill1_Hit', B.x, B.y, 1, flip); break;
      }
      case 'blizzard': {
        Audio2.sfx('ice', 0.9); FX.doFlash('#bff6ff', 0.4);
        // 대상 주변으로 휘몰아치는 눈보라
        for (let i = 0; i < n(36); i++) { const a = R(0, Math.PI * 2), r = R(1.5, 3.2);
          P().particle({ x: wx(B.x) + Math.cos(a) * r, y: wy(B.y) + Math.sin(a) * r * 0.6, vx: -Math.sin(a) * 5 - 2, vy: Math.cos(a) * 3 - 1.5, drag: 0.4, life: R(0.6, 1.1), size: R(0.12, 0.26), size1: 0.04,
            color: i % 3 ? 0xdff9ff : 0x7fe8ff, tex: P().tex.snow, spin: R(-6, 6), fadeIn: 0.1 }); }
        BFX.baked('Titania_skill1_Ground_ice', B.x, B.y + 40, 1.2, flip);
        for (let i = 0; i < 3; i++) { BFX.frost(B.x + R(-60, 60), B.y + R(-40, 40), 120, 0xdff9ff); V.shock(B.x, B.y + 40, 0x9ff4ff, 1.2 + i * 0.4, true); await wait(110); }
        V.impact(B.x, B.y, 'ice', 1.4, { smoke: false }); await wait(200); break;
      }
      case 'spark': {
        Audio2.sfx('atk_elec', 0.75); V.charge(A.x, A.y, 0xffe14d, 0.2, 0.7); await wait(180);
        for (let i = 0; i < 4; i++) { const q = near(B, 30); BFX.lightning([{ x: A.x, y: A.y }, q], 0xffe14d, 0.2, 0.22); V.core(q.x, q.y, 0xffe14d, 0.6); V.streaks(q.x, q.y, HOT, 6, 6, 0.8); await wait(65); }
        V.impact(B.x, B.y, 'elec', 1.2); BFX.baked('Kunoichi_skill2_after_Lighting', B.x, B.y, 0.8, flip); break;
      }
      case 'thunder': {
        Audio2.sfx('lightning', 0.9); Audio2.sfx('atk_elec', 0.5);
        // 하늘이 어두워졌다가 벼락
        V.charge(B.x, B.y - 260, 0xfff27a, 0.3, 1.4); await wait(280);
        FX.doFlash('#fff7b0', 0.45);
        BFX.bolt(B.x, B.y + 60, 0xfff27a);
        BFX.beam(B.x, B.y - 480, B.x, B.y + 40, 30, 0xfff27a, 0.42);
        for (let i = 0; i < 3; i++) BFX.lightning([{ x: B.x + R(-40, 40), y: B.y - 420 }, { x: B.x + R(-20, 20), y: B.y }], 0xfff27a, 0.26, 0.3);
        V.impact(B.x, B.y, 'elec', 1.9, { debris: true });
        V.shock(ground(B).x, ground(B).y, 0xffe14d, 2, true); V.dust(ground(B).x, ground(B).y, 1.3);
        BFX.baked('Kunoichi_skill2_after_Lighting', B.x, B.y, 1.3, flip);
        await wait(300); FX.doShake(13, 0.35); break;
      }
      case 'buff': {
        Audio2.sfx('charge', 0.5); Audio2.sfx('rise', 0.5);
        V.shock(A.x, A.y + 110, 0xffb22e, 1.4, true);
        for (let i = 0; i < 4; i++) { V.pillar(A.x + R(-20, 20), A.y + 110, 0xffb22e, 1); V.embers(A.x, A.y + 60 - i * 25, 0xffe08a, 6, 1, 2); await wait(80); }
        V.core(A.x, A.y - 40, 0xffb22e, 0.9); Audio2.sfx('shine', 0.45); await wait(160); break;
      }
      case 'debuff': {
        Audio2.sfx('warning', 0.45); Audio2.sfx('atk_energy', 0.4);
        BFX.wave(A.x, A.y, B.x, B.y, 0x5aa9ff); await wait(300);
        // 어두운 고리가 조여 들고 기운이 아래로 빠져나간다
        for (let i = 0; i < 3; i++) { BFX.ring(B.x, B.y, 160 - i * 35, 10, 0x5a7aff, 0.42); await wait(80); }
        for (let i = 0; i < n(16); i++) P().particle({ x: wx(B.x + R(-60, 60)), y: wy(B.y - R(-40, 80)), vy: -R(1.5, 3.5), life: R(0.5, 0.9), size: 0.1, size1: 0.02, aspect: 5, color: i % 2 ? 0x5a7aff : 0xb08aff, tex: P().tex.beam });
        V.smoke(B.x, B.y, 4, 1.1, 0x2a2850, 0.55); V.core(B.x, B.y, 0x7a5aff, 1); V.shock(B.x, B.y + 70, 0x7a5aff, 1.5, true);
        for (let i = 0; i < 3; i++) P().particle({ x: wx(B.x), y: wy(B.y - 120) + i * 0.15, life: 0.8, size: 0.5, size1: 0.3, aspect: 1, color: 0xb08aff, tex: P().tex.cross, alpha: 0.9, spin: 2, fadeIn: 0.1 });
        await wait(180); break;
      }
      case 'shield': {
        Audio2.sfx('shield', 0.75); Audio2.sfx('shine', 0.4);
        V.charge(A.x, A.y, 0x5ff4ff, 0.2, 1.3); await wait(180);
        BFX.ring(A.x, A.y, 20, 170, 0x5ff4ff, 0.6);
        // 육각 보호막 조각이 둘러싼다
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2;
          P().particle({ x: wx(A.x) + Math.cos(a) * 2.2, y: wy(A.y) + Math.sin(a) * 2.2, life: 0.7, size: 1.2, size1: 1.0, color: 0x5ff4ff, tex: P().tex.ring, alpha: 0.7, fadeIn: 0.1 }); }
        BFX.holy(A.x, A.y, 70, 0x5ff4ff); V.streaks(A.x, A.y, 0xbffcff, 14, 4, 1); await wait(320); break;
      }
      case 'heal': {
        Audio2.sfx('heal', 0.7); Audio2.sfx('shine', 0.35);
        V.shock(A.x, A.y + 110, 0x5dff9c, 1.3, true);
        for (let i = 0; i < 5; i++) { V.pillar(A.x + R(-50, 50), A.y + 110, 0x5dff9c, 0.8); V.embers(A.x + R(-40, 40), A.y + 50 - i * 20, 0xc8ffde, 5, 1, 2.2); await wait(70); }
        // 십자 빛
        P().particle({ x: wx(A.x), y: wy(A.y - 30), life: 0.6, size: 3, size1: 1.2, color: 0x5dff9c, tex: P().tex.cross, alpha: 1, spin: 1 }); await wait(140); break;
      }
      case 'smoke': {
        Audio2.sfx('whoosh', 0.6);
        await V.projectile(A, B, 0x8899aa, 320, { arc: 90, size: 0.5, smoke: true });
        V.core(B.x, B.y, 0xc0c8d0, 0.7);
        V.smoke(B.x, B.y, 10, 1.6, 0x7a8494, 0.6); V.smoke(B.x, B.y + 50, 6, 1.8, 0x5a6270, 0.55); await wait(450); break;
      }
      default: await wait(200);
    }
  };

  // ---------------------------------------------------------------- 총탄 한 발
  Battle.prototype.fireShot = async function (side, tSide, fx, type, spread = 5) {
    const target = BattleArt.point(this, tSide, 'hit'), f = BattleArt.frame(this, tSide);
    const r = Math.min(spread, f.w * 0.045, 14);
    const q = { x: target.x + R(-r, r), y: target.y + R(-r, r) };
    const from = BattleArt.flash(this, side, q, fx, type);
    const gun = BattleArt.frame(this, side).profile.kind === 'gun';
    Audio2.sfx(gun ? 'atk_rifle' : 'atk_energy', 0.55);
    const col = gun ? 0xffe9a8 : pal(type)[0];
    if (on()) {
      busy(); V.tracer(from, q, col, 100, 1);
      const a = Math.atan2(wy(q.y) - wy(from.y), wx(q.x) - wx(from.x));
      P().muzzleFlash(wx(from.x), wy(from.y), a, 0xffd27a, 1.3);
      V.smoke(from.x, from.y, 1, 0.35, 0x8a8a8a, 0.3);
    } else this.shapes.push({ type: 'tracer', x1: from.x, y1: from.y, x2: q.x, y2: q.y, t: 0, life: 0.115, color: gun ? '#ffe9a8' : TYPES[type].color });
    await wait(100);
    if (on()) {
      const a = Math.atan2(wy(q.y) - wy(from.y), wx(q.x) - wx(from.x));
      V.core(q.x, q.y, col, 0.6); V.streaks(q.x, q.y, col, 10, 7, 0.9, a + Math.PI, 0.9);
      P().particle({ x: wx(q.x), y: wy(q.y), life: 0.2, size: 0.3, size1: 1.6, color: col, tex: P().tex.ring, alpha: 0.8 });
      BFX.baked('hnadgun_hit', q.x, q.y, 0.45, tSide === 'me');
    } else Particles.burst(q.x, q.y, 8, { speed: 100, size: 3, life: 0.2, color: gun ? '#ffe9a8' : TYPES[type].color, add: true });
  };

  // ---------------------------------------------------------------- 근접: 베기·연속 베기·물기·돌진·강타
  Battle.prototype.meleeFx = async function (fx, side, tSide, type) {
    const back = await BattleArt.approach(this, side, tSide), T = this.fxTarget(tSide);
    const [c1] = pal(type);
    try {
      const cnt = fx === 'slash3' ? 3 : 1;
      for (let i = 0; i < cnt; i++) {
        Audio2.sfx(fx === 'dash' || fx === 'smash' ? 'hit_smash' : 'atk_swing', 0.65);
        if (!on()) { this.shapes.push({ type: fx === 'bite' ? 'bite' : 'slash', x: T.x + R(-6, 6), y: T.y + R(-6, 6), r: fx === 'smash' ? 40 : 58, a0: -2.5 + i * 0.9, t: 0, life: 0.22, color: fx === 'bite' ? '#ff778b' : '#e9fbff' }); await wait(cnt > 1 ? 85 : 150); continue; }
        busy();
        if (fx === 'smash' || fx === 'dash') {
          V.impact(T.x, T.y, type, fx === 'smash' ? 1.7 : 1.3, { debris: true });
          V.shock(T.x, T.y + 70, c1, 1.6, true); V.dust(T.x, T.y + 70, 1.3);
          if (fx === 'dash') V.streaks(T.x, T.y, HOT, 14, 9, 1, side === 'me' ? 0 : Math.PI, 0.35);
          FX.doShake(fx === 'smash' ? 12 : 8, 0.3);
        } else if (fx === 'bite') {
          V.slashArc(T.x, T.y - 20, 0xff778b, 1.1, Math.PI); V.slashArc(T.x, T.y + 20, 0xff778b, 1.1, 0);
          V.core(T.x, T.y, 0xff778b, 0.9); V.streaks(T.x, T.y, 0xffb0c0, 10, 6, 1);
        } else {
          const rot = [-0.6, 0.9, -2.2][i % 3] + R(-0.2, 0.2);
          V.slashArc(T.x + R(-10, 10), T.y + R(-10, 10), c1, fx === 'slash3' ? 1.15 : 1.35, rot);
          V.core(T.x, T.y, c1, 0.7); V.streaks(T.x, T.y, HOT, 10, 7, 1, rot, 0.5);
          if (i === cnt - 1) V.shock(T.x, T.y, c1, 1.1);
        }
        await wait(cnt > 1 ? 90 : 160);
      }
    } finally { await back(); }
  };

  // ---------------------------------------------------------------- 피격 반응 보강 (모든 공격 공통)
  const baseReact = Battle.prototype.hitReact;
  Battle.prototype.hitReact = function (side, type, eff, crit) {
    baseReact.call(this, side, type, eff, crit);
    if (!on()) return;
    const p = side === 'me' ? this.mePos() : this.foePos();
    const big = crit || eff > 1;
    V.streaks(p.x, p.y, pal(type)[1], big ? 16 : 8, big ? 8 : 5, big ? 1.1 : 0.8);
    if (big) V.shock(p.x, p.y, pal(type)[0], 1.3);
  };
})();
