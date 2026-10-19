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
    smoke(x, y, cnt = 4, s = 1, col = 0x30343c, alpha = 0.62) {
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
      f.particle({ x: wx(from.x), y: wy(from.y), vx: Math.cos(a) * d / (ms / 1000), vy: Math.sin(a) * d / (ms / 1000), life: ms / 1000, size: 0.09 * s, size1: 0.08 * s, aspect: 18, rot: a - Math.PI / 2, color: col, tex: f.tex.beam, alpha: 1 });
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
    tongues(x, y, s = 1, cnt = 4) {
      // 바닥에서 위로 날름거리는 가늘고 긴 불꽃 혀 (둥근 빛 덩어리 대신)
      const f = P(), X = wx(x), Y = wy(y);
      f.particle({ x: X, y: Y + 0.15 * s, life: 0.5, size: 0.6 * s, size1: 0.9 * s, aspect: 0.5, color: 0xff6a2a, tex: f.tex.glow, alpha: 0.5 });
      for (let i = 0; i < n(cnt); i++) { const h = R(0.8, 1.3);
        f.particle({ x: X + R(-0.3, 0.3) * s, y: Y + 0.2 * s, vx: R(-0.4, 0.4), vy: R(1.6, 2.6) * s, life: R(0.35, 0.55), size: 0.22 * s * h, size1: 0.08 * s, aspect: 3.5, rot: R(-0.25, 0.25), spin: R(-1, 1),
          color: i % 3 === 0 ? 0xfff0b0 : i % 3 === 1 ? 0xffa030 : 0xff4a14, tex: f.tex.beam, alpha: 0.95, fadeIn: 0.05 }); }
    },
    flameJet(from, to, col, s = 1) {
      // fx_firehit 시트는 작은 폭발 그림이라 화염 줄기는 부드러운 빛 입자를 색만 바꿔 겹쳐 만든다 (흰노랑 → 주황 → 빨강)
      const f = P(), X0 = wx(from.x), Y0 = wy(from.y), X1 = wx(to.x), Y1 = wy(to.y);
      const cols = [0xfff0b0, 0xffb040, col, 0xff3a10];
      for (let i = 0; i < n(7); i++) { const k = R(1.0, 1.25), life = R(0.3, 0.42), c = cols[i % cols.length];
        f.particle({ x: X0, y: Y0, vx: (X1 - X0) / life * k + R(-1.2, 1.2), vy: (Y1 - Y0) / life * k + R(-1, 1.6), life,
          size: 0.35 * s, size1: R(1.5, 2.3) * s, color: c, tex: f.tex.glow, alpha: i % 4 === 0 ? 0.9 : 0.6 });
      }
      f.particle({ x: X0, y: Y0, life: 0.12, size: 0.5 * s, size1: 0.9 * s, color: 0xfff0b0, tex: f.tex.glow, alpha: 0.9 });
      for (let i = 0; i < n(2); i++) f.particle({ x: X0, y: Y0, vx: (X1 - X0) / 0.5 + R(-2, 2), vy: (Y1 - Y0) / 0.5 + R(-1, 3), grav: -2, life: 0.5, size: 0.1, size1: 0, color: HOT, tex: f.tex.dot });
    },
    // 얼음 결정: 중심에서 뻗은 채 박혀 있는 가시 + 눈송이
    shards(x, y, col, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(9); i++) { const a = R(0, Math.PI * 2), L = R(0.6, 1.3) * s;
        f.particle({ x: X + Math.cos(a) * L * 0.5, y: Y + Math.sin(a) * L * 0.5, life: R(0.55, 0.8), size: 0.22 * s, size1: 0.12 * s, aspect: L / 0.22 * 0.9, rot: a - Math.PI / 2, color: i % 2 ? col : 0xf0fdff, tex: f.tex.beam, alpha: 1, fadeIn: 0.04 }); }
      for (let i = 0; i < n(8); i++) { const a = R(0, Math.PI * 2), v = R(1, 3);
        f.particle({ x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2, life: R(0.5, 0.9), size: R(0.18, 0.3) * s, size1: 0.05, color: 0xf0fdff, tex: f.tex.snow, spin: R(-5, 5) }); }
    },
    // 전기 가지: 명중점에서 사방으로 튀는 짧은 번개
    arcs(x, y, col, s = 1, cnt = 4) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < n(cnt); i++) { const a = R(0, Math.PI * 2), L = R(1.0, 1.9) * s;
        const pts = f.jagged(X, Y, X + Math.cos(a) * L, Y + Math.sin(a) * L, 0.18, 0.2);
        f.ribbon(pts, 0.14 * s, col, 0.2, { alpha: 0.9 }); f.ribbon(pts, 0.05 * s, HOT, 0.16); }
      f.particle({ x: X, y: Y, life: 0.3, size: 1.4 * s, size1: 1.8 * s, color: col, tex: f.tex.elec, rot: R(0, 6), alpha: 0.9 });
    },
    // 불꽃 폭발: 흰노랑 → 주황 → 빨강으로 부풀며 위로 솟는 불덩이 + 불티
    flameBurst(x, y, s = 1) {
      const f = P(), X = wx(x), Y = wy(y), cols = [0xfff0b0, 0xffb040, 0xff6a2a, 0xff3a10];
      for (let i = 0; i < n(10); i++) { const a = R(0, Math.PI * 2), v = R(0.8, 2.4) * s;
        f.particle({ x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 1.2, drag: 1.5, grav: -1.5, life: R(0.45, 0.75), size: 0.5 * s, size1: R(1.6, 2.4) * s, color: cols[i % 4], tex: f.tex.glow, alpha: 0.75 }); }
      V.embers(x, y, 0xff8a3d, 14, s, 1.8);
      V.smoke(x, y - 20, 3, s, 0x2a2420, 0.6);
    },
    // 바람 소용돌이: 회전하는 초승달 + 바람 줄기
    wind(x, y, col, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < 3; i++) f.particle({ x: X, y: Y, life: 0.45, size: (1.4 + i * 0.6) * s, size1: (2.2 + i * 0.6) * s, color: i ? col : HOT, tex: f.tex.slash, rot: i * 2.1, spin: 9, alpha: 0.75 });
      for (let i = 0; i < n(10); i++) { const a = R(0, Math.PI * 2), r = R(0.8, 1.8) * s;
        f.particle({ x: X + Math.cos(a) * r, y: Y + Math.sin(a) * r, vx: -Math.sin(a) * 5, vy: Math.cos(a) * 5, drag: 2, life: R(0.3, 0.5), size: 0.08, size1: 0.02, aspect: 7, rot: a, color: i % 2 ? col : HOT, tex: f.tex.beam }); }
    },
    // 관통: 진행 방향으로 납작하게 눌린 고리 + 뒤로 빠져나가는 빛줄기
    pierce(x, y, col, dir, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      f.particle({ x: X, y: Y, life: 0.32, size: 0.4 * s, size1: 3.2 * s, aspect: 0.28, rot: dir + Math.PI / 2, color: col, tex: f.tex.ring, alpha: 1 });
      f.particle({ x: X, y: Y, life: 0.12, size: 0.5 * s, size1: 1.1 * s, color: HOT, tex: f.tex.glow, alpha: 0.9 });
      V.streaks(x, y, HOT, 12, 11 * s, s, dir, 0.25);
    },
    // 그을음 자국: 발밑에 오래 남는 어두운 타원 (일반 블렌딩)
    scorch(x, y, s = 1, col = 0x1a1612) {
      const f = P();
      f.particle({ x: wx(x), y: wy(y), life: 1.6, size: 2.2 * s, size1: 2.6 * s, aspect: 0.3, color: col, tex: f.tex.dot, alpha: 0.7, normal: true, order: f.L.FX - 3, fadeIn: 0.05 });
    },
    // 연기 기둥: 크고 짙게 피어올라 오래 남는다
    plume(x, y, s = 1, col = 0x26282e) {
      // 번쩍임이 먼저 보이도록 0.15초 늦게, 대상 뒤 위쪽으로 피어오른다. 아래쪽은 처음 잠깐 불빛이 비친 따뜻한 색
      const f = P(), X = wx(x), Y = wy(y) + 0.9 * s;
      f.particle({ x: X, y: Y - 0.6 * s, life: 0.35, size: 1.2 * s, size1: 2.0 * s, color: 0x5a3a20, frames: f.sheets.smoke, alpha: 0.45, normal: true, order: f.L.FX - 2 });
      later(0.15, () => { for (let i = 0; i < (LOW_MEM ? 3 : 6); i++) f.particle({ x: X + R(-0.5, 0.5) * s, y: Y + R(-0.2, 0.4) * s, vx: R(-0.5, 0.5), vy: R(0.8, 1.8) * s, drag: 0.5,
        life: R(1.1, 1.5), size: 1.3 * s, size1: R(2.8, 3.4) * s * (LOW_MEM ? 0.8 : 1), color: i % 3 ? col : 0x4a4e58, frames: f.sheets.smoke, alpha: 0.55, normal: true, order: f.L.FX - 2, spin: R(-0.8, 0.8), fadeIn: 0.08 }); });
    },
    // 바닥 균열: 발밑에서 뻗는 들쭉날쭉한 금
    crack(x, y, col, s = 1) {
      // 어두운 금은 일반 블렌딩 조각으로 (리본은 가산이라 어두운 색이 보이지 않는다), 안쪽 빛줄기만 가산 리본
      const f = P(), X = wx(x), Y = wy(y);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + R(-0.4, 0.4), L = R(1.2, 2.0) * s;
        const pts = f.jagged(X, Y, X + Math.cos(a) * L, Y + Math.sin(a) * L * 0.35, 0.1, LOW_MEM ? 0.5 : 0.35);
        for (let j = 0; j < pts.length - 1; j++) { const p0 = pts[j], p1 = pts[j + 1], d = Math.hypot(p1.x - p0.x, p1.y - p0.y), ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
          f.particle({ x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2, life: 1.2, size: 0.12 * s, size1: 0.09 * s, aspect: d / (0.12 * s), rot: ang - Math.PI / 2, color: 0x1e1810, tex: f.tex.white, alpha: 0.85, normal: true, order: f.L.FX - 3 }); }
        f.ribbon(pts, 0.05 * s, col, 0.45, { alpha: 0.8 }); }
    },
    // 여운: 대상에 은은한 빛이 남고 느린 불티가 1초 넘게 떠다닌다 (모든 명중 공통)
    linger(x, y, col, s = 1) {
      const f = P(), X = wx(x), Y = wy(y);
      f.particle({ x: X, y: Y, life: 1.1, size: 1.6 * s, size1: 2.2 * s, color: col, tex: f.tex.glow, alpha: 0.32, fadeIn: 0.15 });
      for (let i = 0; i < n(7); i++) f.particle({ x: X + R(-0.7, 0.7) * s, y: Y + R(-0.6, 0.6) * s, vx: R(-0.3, 0.3), vy: R(0.3, 0.8), drag: 0.6, life: R(1.0, 1.4), size: R(0.08, 0.14) * s, size1: 0.02, color: i % 2 ? col : HOT, tex: f.tex.dot, fadeIn: 0.2 });
    },
    // 바닥에 남는 벤 자국 (일반 블렌딩 어두운 줄)
    groundMark(x, y, rot, s = 1, col = 0x241c14) {
      const f = P();
      f.particle({ x: wx(x), y: wy(y), life: 1.1, size: 0.12 * s, size1: 0.1 * s, aspect: 14, rot, color: col, tex: f.tex.white, alpha: 0.7, normal: true, order: f.L.FX - 3 });
    },
    // 발밑 높이: 캐릭터 그림의 아래쪽 (가슴 기준 +70 처럼 고정값을 쓰면 허벅지에 떠 보인다)
    footOf(side) {
      const b = Scene; if (!(b instanceof Battle)) return null;
      try { const f = BattleArt.frame(b, side); return f.y + f.h - 6; } catch (e) { return null; }
    },
    footY(x, y) {
      const b = Scene; if (!(b instanceof Battle)) return y + 70;
      let best = null, bd = 1e9;
      for (const side of ['me', 'foe']) { try { const f = BattleArt.frame(b, side), cx = f.x + f.w / 2, d = Math.abs(cx - x); if (d < bd) { bd = d; best = f.y + f.h - 6; } } catch (e) { } }
      return best == null ? y + 70 : best;
    },
    // 명중 세트: 타입마다 다른 모양 (힘 s)
    impact(x, y, type, s = 1, o = {}) {
      if (!on()) return; busy();
      const [c1, c2] = pal(type);
      const g = { x, y: o.gy != null ? o.gy : V.footY(x, y) };
      switch (type) {
        case 'fire':
          V.core(x, y, c1, s * 0.8); V.flameBurst(x, y, s); V.shock(g.x, g.y, c1, s * 1.2, true); V.scorch(g.x, g.y, s * 0.9, 0x2a1408); break;
        case 'ice':
          V.core(x, y, c1, s * 0.7); V.shards(x, y, c1, s); P().particle({ x: wx(x), y: wy(y), life: 0.5, size: 0.4 * s, size1: 3.4 * s, color: c1, tex: P().tex.ring, alpha: 0.7 });
          V.shock(g.x, g.y, 0xbff6ff, s * 1.1, true); break;
        case 'elec':
          V.core(x, y, c1, s * 0.75); V.arcs(x, y, c1, s, LOW_MEM ? 3 : 5); V.streaks(x, y, c2, 10 + 6 * s, 7 * s, s); break;
        case 'heavy': case 'phys':
          V.core(x, y, c1, s * 0.6); V.streaks(x, y, c2, 10 + 6 * s, 6 * s, s);
          if (!o.noPlume) V.plume(x, y, s * 0.9); V.debris(x, y + 20, (o.light ? 3 : 7) + 4 * s, s * 1.8, 0x4a443c);
          if (!o.noGround) { V.shock(g.x, g.y, c1, s * 1.3, true); V.dust(g.x, g.y, s); V.scorch(g.x, g.y, s); } break;
        case 'air':
          V.core(x, y, c1, s * 0.75); V.wind(x, y, c1, s); V.streaks(x, y, c2, 10, 6 * s, s);
          for (let i = 0; i < n(6); i++) P().particle({ x: wx(x) + R(-0.6, 0.6), y: wy(y) + R(-0.3, 0.6), vx: R(-1.2, 1.2), vy: R(-0.2, 0.6), grav: 0.5, drag: 1.2, life: R(1.2, 1.6), size: 0.42 * s, size1: 0.34 * s, aspect: 2.4, rot: R(0, 6), spin: R(-3, 3), color: 0xf4fffa, tex: P().tex.beam, alpha: 1, order: P().L.FX + 2 }); // 흩날리는 깃털
          break;
        default: // light: 날카롭고 가볍게
          V.core(x, y, c1, s * 0.7);
          P().particle({ x: wx(x), y: wy(y), life: 0.26, size: 0.3 * s, size1: 2.8 * s, color: c1, tex: P().tex.ring, alpha: 0.9 });
          V.streaks(x, y, c2, 14 + 6 * s, 8 * s, s);
          P().particle({ x: wx(x), y: wy(y), life: 0.6, size: 2.6 * s, size1: 1.6 * s, color: HOT, tex: P().tex.cross, rot: Math.PI / 4, spin: 2.5, alpha: 1 }); // 오래 남는 별빛
      }
      if (o.debris && type !== 'heavy' && type !== 'phys') V.debris(x, y + 20, 5 + 3 * s, s);
      if (o.embers && type !== 'fire') V.embers(x, y, c1, 8, s);
      const now = performance.now(); if (!V._lingerT || now - V._lingerT > 500) { V._lingerT = now; later(0.2, () => V.linger(x, y, c1, Math.min(1.4, s))); }
    },
  };
  // 어느 부품을 불러도 이펙트 레이어가 깨어 있게 (BFX.busy 가 0이면 파티클을 지운다)
  for (const k of Object.keys(V)) { if (k === 'footOf' || k === 'footY') continue; const f = V[k]; V[k] = function () { if (!on()) return k === 'projectile' ? Promise.resolve() : undefined; busy(); return f.apply(V, arguments); }; }
  window.VFX = V;

  // ---------------------------------------------------------------- 기술별 연출
  Battle.prototype.playFx3 = async function (fx, side, tSide, type, isAtk) {
    if (['slash', 'slash3', 'bite', 'dash', 'smash'].includes(fx)) return this.meleeFx(fx, side, tSide, type);
    if (fx === 'shininghand') return this.shiningHandFx(side, tSide);
    const A = this.fxOrigin(side, fx), B = this.fxTarget(tSide), uv = this.view(side), flip = side === 'foe';
    const [c1, c2] = pal(type);
    const FA = V.footOf(side) ?? A.y + 150, FB = V.footOf(tSide) ?? B.y + 150; // 시전자·대상 발밑
    const ground = (p) => ({ x: p.x, y: V.footY(p.x, p.y) });
    const dirTo = Math.atan2(wy(B.y) - wy(A.y), wx(B.x) - wx(A.x));
    const near = (p, r = 40) => ({ x: p.x + R(-r, r), y: p.y + R(-r * 0.7, r * 0.7) });
    busy();
    switch (fx) {
      case 'bullet': {
        for (let i = 0; i < 3; i++) {
          P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], 0.09, 0xfff0c0, 0.14, { alpha: 0.9, shrink: true }); // 굵은 예광탄
          await this.fireShot(side, tSide, fx, type, 6);
          V.streaks(B.x, B.y, 0xffe0a0, n(12), 8, 1, dirTo + Math.PI, 0.7); // 맞은 자리에서 쏜 쪽으로 튀는 불똥
        }
        FX.doShake(5, 0.15); V.core(B.x, B.y, 0xffffff, 0.9); V.plume(B.x + (flip ? -30 : 30), B.y + 20, 0.4, 0x5a5e68); V.embers(B.x, B.y, 0xffd27a, 8, 0.7, 0.8); break;
      }
      case 'bullets': {
        const shots = [];
        for (let i = 0; i < 8; i++) {
          const fan = dirTo + (i / 7 - 0.5) * 0.5, L = Math.hypot(wx(B.x) - wx(A.x), wy(B.y) - wy(A.y)) * 1.15; // 부채꼴로 퍼지는 탄막
          P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(A.x) + Math.cos(fan) * L, y: wy(A.y) + Math.sin(fan) * L }], 0.035, 0xffc070, 0.12, { alpha: 0.75, shrink: true });
          shots.push(this.fireShot(side, tSide, fx, type, 16).then(() => V.embers(B.x + R(-30, 30), B.y + R(-40, 40), 0xff6a2a, 3, 0.5, 0.4))); await wait(50);
        }
        await Promise.all(shots); FX.doShake(6, 0.2); V.smoke(B.x, FB - 20, 3, 0.8, 0x4a4e58, 0.45); V.debris(B.x, B.y + 30, 6, 0.8);
        V.shock(B.x, FB, 0xff9a3d, 1.5, true); V.dust(B.x, FB, 1.1); break; // 마지막 탄이 발밑을 쓸어낸다
      }
      case 'snipe': {
        Audio2.sfx('charge', 0.45);
        V.charge(A.x, A.y, 0xffffff, 0.38, 0.8);
        // 조준선이 두 번 맥동하고, 대상 위에 조준경이 좁혀 든다
        for (let i = 0; i < 2; i++) later(i * 0.17, () => P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], 0.05 + i * 0.03, 0xff3b3b, 0.24, { alpha: 0.85 }));
        P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], 0.02, 0xff3b3b, 0.62, { alpha: 0.5 }); // 조준 레이저가 발사 직후까지 남는다
        P().particle({ x: wx(B.x), y: wy(B.y), life: 0.4, size: 2.6, size1: 0.6, color: 0xff3b3b, tex: P().tex.ring, alpha: 0.9 });
        P().particle({ x: wx(B.x), y: wy(B.y), life: 0.4, size: 1.6, size1: 0.8, color: 0xff6a6a, tex: P().tex.cross, alpha: 0.9 });
        await wait(380);
        Audio2.sfx('atk_rifle', 0.95); BattleArt.flash(this, side, B, fx, type); FX.doFlash('#fff', 0.25);
        BFX.beam(A.x, A.y, B.x, B.y, 5, 0xfff3c0, 0.5);
        P().muzzleFlash(wx(A.x), wy(A.y), dirTo, 0xffd27a, 2);
        V.streaks(A.x, A.y, 0xfff2c0, 8, 6, 0.8, dirTo, 0.35);
        await wait(50);
        V.pierce(B.x, B.y, 0xfff2c0, dirTo, 1.3);
        V.debris(B.x + (flip ? -40 : 40), B.y, 8, 0.9); V.smoke(B.x + (flip ? -50 : 50), B.y, 3, 0.8);
        BFX.baked('skill_hit_simple', B.x, B.y, 1.1, flip);
        P().particle({ x: wx(B.x), y: wy(B.y), life: 0.35, size: 1.4, size1: 0.1, color: 0xff3b3b, tex: P().tex.ring, alpha: 0.9 }); // 조준경이 접히며 사라진다
        V.plume(B.x + (flip ? -40 : 40), B.y - 10, 0.4, 0x6a6a6a); later(0.35, () => V.plume(B.x + (flip ? -55 : 55), B.y - 10, 0.35, 0x7a7a7a)); // 관통한 쪽에서 피어오르는 연기
        P().particle({ x: wx(B.x), y: wy(B.y), life: 1.1, size: 0.3, size1: 0.18, color: 0xffb050, tex: P().tex.glow, alpha: 0.95 });
        P().particle({ x: wx(B.x), y: wy(B.y), life: 1.5, size: 0.3, size1: 0.26, color: 0x120c08, tex: P().tex.dot, alpha: 0.95, normal: true }); P().particle({ x: wx(B.x), y: wy(B.y), life: 1.4, size: 0.9, size1: 1.1, color: 0xff8a30, tex: P().tex.ring, alpha: 1 }); P().particle({ x: wx(B.x), y: wy(B.y), life: 1.2, size: 0.6, size1: 0.3, color: 0xffb050, tex: P().tex.glow, alpha: 0.8 }); // 탄흔과 달아오른 테두리 V.embers(B.x, B.y, 0xffb050, 8, 0.6, 0.5);
        P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], 0.03, 0xfff3c0, 0.45, { alpha: 0.6, shrink: true }); // 사라져 가는 탄도
        V.dust(B.x + (flip ? -160 : 160), B.y + 20, 0.9); V.debris(B.x + (flip ? -120 : 120), B.y, 6, 0.9); V.streaks(B.x, B.y, 0xfff2c0, 8, 12, 1, dirTo, 0.15);
        await wait(140); break;
      }
      case 'shell': {
        Audio2.sfx('atk_rifle', 0.7); BattleArt.flash(this, side, B, fx, type);
        V.smoke(A.x, A.y, 3, 0.7);
        await V.projectile(A, B, 0xffb050, 430, { arc: 150, size: 0.8, smoke: true, embers: true });
        Audio2.sfx('explosion', 0.65);
        V.impact(B.x, B.y, 'heavy', 1.6, { debris: true, embers: true });
        V.dust(ground(B).x, ground(B).y, 1.3); V.shock(ground(B).x, ground(B).y, 0xffb066, 1.3, true);
        V.plume(B.x, B.y - 60, 1.3); V.plume(B.x, B.y - 140, 1.0, 0x3a3c44); // 버섯구름 기둥
        V.shock(B.x, FB, 0xffb066, 2.6, true); V.scorch(B.x, FB, 1.6); V.crack(B.x, FB, 0xffb066, 1.4); // 큰 분화구
        BFX.baked('simple_explosion', B.x, B.y, 1.2, flip); FX.doShake(9, 0.25); break;
      }
      case 'barrage': {
        for (let i = 0; i < 5; i++) {
          Audio2.sfx('atk_rifle', 0.5); BattleArt.flash(this, side, B, fx, type);
          const q = { x: B.x + R(-80, 80), y: B.y - R(-20, 70) }; // 가슴·어깨 높이에서 터지는 공중 폭발
          V.projectile(A, q, 0xffb050, 360, { arc: 110 + i * 25, size: 0.6, smoke: true }).then(() => {
            Audio2.sfx('explosion', 0.4); V.core(q.x, q.y, 0xffb050, 1.3); V.streaks(q.x, q.y, 0xffe0a0, 14, 7, 1); P().particle({ x: wx(q.x), y: wy(q.y), life: 0.45, size: 0.5, size1: 3.5, color: 0xffb050, tex: P().tex.ring, alpha: 0.95 }); V.smoke(q.x, q.y, 2, 0.7, 0x3a3c44, 0.5); V.core(q.x, q.y, 0xffffff, 0.6); V.embers(q.x, q.y, 0xffb050, 4, 0.6, 0.5);
            if (i % 2 === 0) V.flameBurst(q.x, q.y, 0.7); });
          await wait(70);
        }
        await wait(200); Audio2.sfx('explosion_big', 0.7);
        for (let i = 0; i < n(10); i++) { const a = (i / 10) * Math.PI * 2, r = 2.2; P().particle({ x: wx(B.x) + Math.cos(a) * r, y: wy(B.y) + Math.sin(a) * r, vx: -Math.cos(a) * r / 0.18, vy: -Math.sin(a) * r / 0.18, life: 0.18, size: 0.12, size1: 0.05, aspect: 6, rot: a - Math.PI / 2, color: 0xffe0a0, tex: P().tex.beam, alpha: 0.95 }); } // 마지막 일제 사격이 한 점으로 모인다
        V.core(B.x, B.y, 0xffffff, 1.2); V.impact(B.x, B.y, 'heavy', 1.4, { noPlume: true, noGround: true, light: true });
        V.shock(ground(B).x, ground(B).y, 0xff9a3d, 1.8, true); V.dust(ground(B).x, ground(B).y, 1.6); V.smoke(B.x, B.y, 6, 1.4);
        FX.doShake(14, 0.4); await wait(150); break;
      }
      case 'beam': case 'icebeam': case 'plasma': {
        const bc = fx === 'beam' ? 0x7ff6ff : fx === 'icebeam' ? 0x9ff4ff : 0xffe14d;
        Audio2.sfx('charge', 0.55); V.charge(A.x, A.y, bc, 0.36, 1); await wait(360);
        Audio2.sfx(fx === 'icebeam' ? 'ice' : 'atk_laser', 0.85);
        const w = fx === 'beam' ? 26 : 18;
        if (fx === 'plasma') {
          // 플라즈마: 이어진 빔 대신 짧은 전격탄 세 발이 끊어 치고 들어간다
          for (let i = 0; i < 3; i++) later(i * 0.16, () => { BFX.beam(A.x, A.y, B.x, B.y, w, bc, 0.1); P().ribbon(P().jagged(wx(A.x), wy(A.y), wx(B.x), wy(B.y), 0.3, 0.3), 0.12, HOT, 0.14, { alpha: 1 });
            V.core(B.x, B.y, bc, 0.7); V.arcs(B.x, B.y, bc, 0.6, 2); });
        } else {
          BFX.beam(A.x, A.y, B.x, B.y, w, bc, 0.5);
          P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], w / BFX.U * 2.5, bc, 0.55, { alpha: 0.3, shrink: true }); // 넓고 흐린 바깥 빛
          if (fx === 'beam') for (let i = 0; i < 5; i++) later(0.1 + i * 0.1, () => BFX.beam(A.x, A.y, B.x, B.y, w * (1.1 - i * 0.18), bc, 0.16)); // 0.6초 버티며 점점 가늘고 흐려진다
          else for (let i = 0; i < 3; i++) later(0.1 + i * 0.1, () => BFX.beam(A.x, A.y, B.x, B.y, w * 0.7, bc, 0.2));
        }
        P().ribbon(P().jagged(wx(A.x), wy(A.y), wx(B.x), wy(B.y), fx === 'plasma' ? 0.22 : 0.08, 0.3), w / BFX.U * 0.6, HOT, 0.4, { shrink: true });
        if (fx === 'plasma') { const sp = [], X0 = wx(A.x), Y0 = wy(A.y), X1 = wx(B.x), Y1 = wy(B.y), nx = -(Y1 - Y0), ny = X1 - X0, L = Math.hypot(nx, ny) || 1;
          for (let i = 0; i <= 40; i++) { const k = i / 40, o = Math.sin(k * Math.PI * 10) * 0.28; sp.push({ x: X0 + (X1 - X0) * k + nx / L * o, y: Y0 + (Y1 - Y0) * k + ny / L * o }); }
          P().ribbon(sp, 0.1, 0xfff27a, 0.45, { alpha: 0.9 }); } // 플라즈마: 빔을 휘감는 나선
        if (fx === 'beam') P().particle({ x: wx(B.x), y: wy(B.y), life: 0.5, size: 0.8, size1: 1.6, aspect: 0.5, rot: dirTo - Math.PI / 2, color: HOT, tex: P().tex.glow, alpha: 0.9 }); // 창끝
        // 빔을 따라 흐르는 입자
        for (let i = 0; i < n(18); i++) { const k = R(0, 1), X = lerp(wx(A.x), wx(B.x), k), Y = lerp(wy(A.y), wy(B.y), k);
          P().particle({ x: X, y: Y, vx: Math.cos(dirTo) * R(3, 6), vy: Math.sin(dirTo) * R(3, 6) + R(-0.6, 0.6), life: R(0.25, 0.5), size: 0.14, size1: 0, color: i % 2 ? bc : HOT, tex: fx === 'icebeam' && i % 3 === 0 ? P().tex.snow : P().tex.dot, spin: 4 }); }
        V.streaks(A.x, A.y, bc, 8, 5, 0.8, dirTo, 0.4);
        await wait(140);
        V.impact(B.x, B.y, fx === 'icebeam' ? 'ice' : fx === 'plasma' ? 'elec' : 'light', 1.5);
        if (fx === 'beam') BFX.baked('Mercury_N_Skill2_Hit', B.x, B.y, 1.3, flip);
        else if (fx === 'icebeam') {
          BFX.frost(B.x, B.y, 110, bc); V.shock(B.x, FB, 0x9ff4ff, 1.4, true);
          // 빔이 지나간 자리에 얼음 조각이 남는다
          // 빔이 지나간 자리가 얼음 가시 줄로 굳었다가 명중과 함께 부서진다
          for (let i = 0; i < 8; i++) { const k = (i + 1) / 9, sx = lerp(A.x, B.x, k), X = wx(sx), Y = wy(lerp(FA, FB, k)) + 0.45, rot = R(-0.2, 0.2);
            later(i * 0.03, () => { P().particle({ x: X, y: Y, life: 0.75, size: 0.3, size1: 0.28, aspect: 4.5, rot, color: 0x9fe8ff, tex: P().tex.beam, alpha: 1 });
              P().particle({ x: X, y: Y, life: 0.75, size: 0.12, size1: 0.1, aspect: 9, rot, color: 0xffffff, tex: P().tex.beam, alpha: 1 }); P().particle({ x: X, y: Y - 0.4, life: 0.4, size: 0.8, size1: 0.4, color: 0xdff9ff, tex: P().tex.glow, alpha: 0.6 }); }); // 바닥에서 솟은 얼음 가시
            later(0.75, () => { for (let j = 0; j < n(3); j++) P().particle({ x: X, y: Y + 0.2, vx: R(-2, 2), vy: R(1, 3), grav: 8, life: 0.45, size: 0.12, size1: 0.05, aspect: 2, rot: R(0, 6), spin: R(-8, 8), color: 0xdffaff, tex: P().tex.beam, alpha: 0.9 }); }); }
        }
        else { BFX.lightning([B, near(B, 60)], 0xffe14d, 0.16, 0.2); BFX.baked('Sleipnir_hit', B.x, B.y, 1.2, flip);
          for (let i = 0; i < 3; i++) later(0.15 * (i + 1), () => V.arcs(B.x + R(-25, 25), B.y + R(-40, 40), 0xffe14d, 0.6, 2)); }
        if (fx === 'beam') { V.groundMark(B.x - (flip ? -40 : 40), FB, Math.PI / 2, 1.4, 0x2a2a30); V.linger(B.x, B.y, bc, 1.2); }
        await wait(160); break;
      }
      case 'dive': {
        Audio2.sfx('whoosh', 0.8);
        V.streaks(A.x, A.y + 60, c1, 10, 6, 1, Math.PI / 2, 0.4); V.dust(A.x, FA, 1);
        await tween(uv, { dy: -260, a: 0.2 }, 220, Ease.inQuad);
        // 하늘에서 내리꽂는 잔상과 바람 줄기
        for (let i = 0; i < 4; i++) { const yy = B.y - 420 + i * 90;
          P().particle({ x: wx(B.x + R(-10, 10)), y: wy(yy), vy: -16, life: 0.3, size: 0.9, size1: 0.4, aspect: 2.5, color: c1, tex: P().tex.glow, alpha: 0.55 }); }
        BFX.beam(B.x, B.y - 440, B.x, B.y, 40, c1, 0.36);
        P().ribbon([{ x: wx(B.x), y: wy(B.y - 440) }, { x: wx(B.x), y: wy(B.y) }], 0.18, HOT, 0.3, { shrink: true });
        for (let i = 0; i < n(12); i++) P().particle({ x: wx(B.x + R(-40, 40)), y: wy(B.y - R(150, 420)), vy: -16, life: 0.25, size: 0.08, aspect: 10, color: HOT, tex: P().tex.beam });
        await wait(140);
        V.impact(B.x, B.y, 'air', 1.6, { debris: true });
        // 착지 충격: 바닥 고리 두 겹 + 둥글게 튀는 파편
        V.shock(ground(B).x, ground(B).y, c1, 1.9, true); later(0.1, () => V.shock(ground(B).x, ground(B).y, HOT, 1.4, true));
        V.dust(ground(B).x, ground(B).y, 1.6); V.debris(ground(B).x, ground(B).y, 12, 1.2);
        later(0.08, () => BFX.baked('Harpy_skill2_missile_last_Hit', B.x, B.y, 0.9, flip)); FX.doShake(11, 0.3);
        V.crack(ground(B).x, ground(B).y, c1, 1.2); V.plume(ground(B).x, ground(B).y - 20, 0.8, 0x8a8070);
        uv.dy = 0; tween(uv, { a: 1 }, 200); break;
      }
      case 'bombs': {
        Audio2.sfx('whoosh', 0.6);
        for (let i = 0; i < 6; i++) {
          const q = { x: B.x - 120 + i * 48 + R(-10, 10), y: B.y + R(0, 40) }; // 왼쪽에서 오른쪽으로 이어지는 폭격선
          V.projectile({ x: q.x + R(-40, 40), y: q.y - 460 }, q, 0xffe0a0, 300, { size: 0.45, smoke: true }).then(() => {
            Audio2.sfx('explosion', 0.45); V.impact(q.x, q.y, 'heavy', 1.15, { noPlume: true, noGround: true, light: i > 0 });
            later(0.04, () => { V.shock(q.x, FB, 0xff9a3d, 1.2, true); V.dust(q.x, FB, 0.9); V.scorch(q.x, FB, 0.8); V.crack(q.x, FB, 0xff9a3d, 0.7); }); // 바닥 흔적은 한 프레임 뒤에
            if (i % 2 === 0) BFX.baked('simple_explosion', q.x, q.y, 0.6, flip); });
          await wait(85);
        }
        await wait(420); V.smoke(B.x, FB - 30, 4, 1.2, 0x30343c, 0.45); FX.doShake(12, 0.35); break;
      }
      case 'flame': {
        BattleArt.flash(this, side, B, fx, type); Audio2.sfx('flame', 0.75);
        // 분사 내내 이어지는 불의 심지 + 촘촘한 화염 입자
        P().ribbon(P().jagged(wx(A.x), wy(A.y), wx(B.x), wy(B.y), 0.12, 0.4), 0.5, 0xff8a3d, 0.55, { alpha: 0.55 });
        P().ribbon([{ x: wx(A.x), y: wy(A.y) }, { x: wx(B.x), y: wy(B.y) }], 0.18, 0xfff0b0, 0.5, { alpha: 0.6, shrink: true });
        // 원뿔처럼 넓어지는 화염: 진행 방향으로 늘어진 불꽃 줄기가 앞으로 갈수록 커진다
        for (let i = 0; i < 9; i++) later(i * 0.025, () => {
          V.flameJet(A, near(B, 30), 0xff6a2a, 0.6);
          for (let j = 0; j < n(4); j++) { const life = R(0.26, 0.34), sp = R(-0.14, 0.14) + dirTo, d = Math.hypot(wx(B.x) - wx(A.x), wy(B.y) - wy(A.y)) * R(0.9, 1.05);
            P().particle({ x: wx(A.x), y: wy(A.y), vx: Math.cos(sp) * d / life, vy: Math.sin(sp) * d / life, life, size: 0.18, size1: 0.75, aspect: 4.5, rot: sp - Math.PI / 2, color: j % 3 === 0 ? 0xfff0b0 : j % 2 ? 0xffb040 : 0xff5a1e, tex: P().tex.beam, alpha: 0.95 }); }
        });
        await wait(330); // 줄기가 끊긴 뒤 한 박자 쉬고 폭발 (폭발이 화염에 묻히지 않게)
        V.impact(B.x, B.y, 'fire', 2.0, { embers: true }); V.core(B.x, B.y, 0xffffff, 1.2); BFX.explosion(B.x, B.y, 60, 0xff7a30, true); V.shock(B.x, FB, 0xff6a2a, 2.0, true);
        V.embers(B.x, B.y + 40, 0xff8a3d, 16, 1.4);
        // 발밑에서 1초 넘게 일렁이는 불
        for (let i = 0; i < 10; i++) later(i * 0.1, () => V.tongues(B.x + R(-70, 70), FB, 1.1, 3));
        V.scorch(B.x, FB, 1.1, 0x2a1408);
        for (let i = 0; i < 6; i++) { const x = B.x + (i - 2.5) * 28; later(0.04 * i, () => V.tongues(x, FB, 1.6, 4)); } // 발밑에서 치솟는 불길
        BFX.baked('Phoenix_skill1_hit', B.x, B.y, 1.0, flip); V.plume(B.x, B.y - 10, 0.8, 0x2a2420); await wait(260); break;
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
        V.impact(B.x, B.y, 'fire', 1.5, { embers: true, debris: true });
        V.shock(ground(B).x, ground(B).y, 0xff5a1e, 2, true);
        for (let p = 0; p < 4; p++) { const gx = B.x + (p - 1.5) * 60; V.scorch(gx, FB, 0.6, 0x2a1408);
          for (let i = 0; i < 5; i++) later(i * 0.2, () => V.tongues(gx + R(-12, 12), FB, 0.9, 3)); } // 땅에 번진 불 (위로 혀를 날름거리는 불꽃)
        for (let i = 0; i < 6; i++) later(i * 0.05, () => V.tongues(B.x + R(-90, 90), FB, 1.5, 4)); await wait(300);
        V.smoke(B.x, B.y - 30, 6, 1.5, 0x3a3030, 0.55); await wait(200); break;
      }
      case 'ice': {
        Audio2.sfx('ice', 0.65);
        for (let i = 0; i < 4; i++) {
          const q = near(B, 35);
          V.projectile(A, q, 0xbff6ff, 300, { size: 0.55, haloTex: 'snow', spin: 10 }).then(() => { V.core(q.x, q.y, 0x9ff4ff, 0.7); V.streaks(q.x, q.y, HOT, 8, 5, 0.8); });
          await wait(75);
        }
        await wait(260); BFX.frost(B.x, B.y, 90, 0x9ff4ff); V.impact(B.x, B.y, 'ice', 1.2); V.shock(B.x, FB, 0x9ff4ff, 1.3, true); break;
      }
      case 'blizzard': {
        Audio2.sfx('ice', 0.9); FX.doFlash('#bff6ff', 0.35);
        // 가로로 몰아치는 바람 띠 + 대상 주변을 도는 눈보라
        for (let i = 0; i < n(14); i++) P().particle({ x: wx(B.x - R(260, 360)), y: wy(B.y + R(-120, 100)), vx: R(14, 20), vy: R(-1, 1), life: R(0.6, 0.9), size: 0.1, size1: 0.06, aspect: 20, rot: -Math.PI / 2, color: i % 2 ? 0xdff9ff : 0x7fe8ff, tex: P().tex.beam, alpha: 1 });
        for (let i = 0; i < n(44); i++) { const a = R(0, Math.PI * 2), r = R(1.4, 3.4);
          P().particle({ x: wx(B.x) + Math.cos(a) * r, y: wy(B.y) + Math.sin(a) * r * 0.6, vx: -Math.sin(a) * 6 - 2, vy: Math.cos(a) * 3 - 1.5, drag: 0.3, life: R(1.0, 1.5), size: R(0.25, 0.4), size1: 0.06,
            color: i % 3 ? 0xdff9ff : 0x7fe8ff, tex: P().tex.snow, spin: R(-6, 6), fadeIn: 0.1 }); }
        BFX.baked('Titania_skill1_Ground_ice', B.x, B.y + 40, 0.7, flip);
        for (let i = 0; i < n(4); i++) P().particle({ x: wx(B.x + R(-80, 80)), y: wy(B.y + R(-20, 60)), life: 1.4, size: 2.5, size1: 3.6, color: 0xcfefff, frames: P().sheets.smoke, alpha: 0.3, normal: true, order: P().L.FX - 2, fadeIn: 0.2 });
        for (let i = 0; i < 3; i++) { V.shock(B.x, FB, 0x9ff4ff, 1.2 + i * 0.4, true); await wait(120); }
        // 발밑에 얼음 가시가 박혀 남는다
        for (let i = 0; i < n(7); i++) { const x = B.x + R(-90, 90), a = R(-0.5, 0.5);
          P().particle({ x: wx(x), y: wy(FB) + 0.4, life: 1.4, size: 0.4, size1: 0.32, aspect: R(5, 7), rot: a, color: i % 2 ? 0xbff6ff : 0xf0fdff, tex: P().tex.beam, alpha: 1, fadeIn: 0.05 }); }
        V.impact(B.x, B.y, 'ice', 1.4); await wait(220); break;
      }
      case 'spark': {
        Audio2.sfx('atk_elec', 0.75); V.charge(A.x, A.y, 0xffe14d, 0.2, 0.7); await wait(180);
        for (let i = 0; i < 4; i++) { const q = near(B, 30); BFX.lightning([{ x: A.x, y: A.y }, q], 0xffe14d, 0.2, 0.22); V.core(q.x, q.y, 0xffe14d, 0.6); V.streaks(q.x, q.y, HOT, 6, 6, 0.8); await wait(65); }
        V.impact(B.x, B.y, 'elec', 1.2); BFX.baked('Kunoichi_skill2_after_Lighting', B.x, B.y, 0.8, flip);
        for (let i = 0; i < 3; i++) later(0.12 * (i + 1), () => V.arcs(B.x + R(-25, 25), B.y + R(-40, 40), 0xffe14d, 0.6, 2)); // 몸을 타고 기어가는 잔전기
        break;
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
        V.shock(ground(B).x, ground(B).y, 0xffe14d, 2, true); V.dust(ground(B).x, ground(B).y, 1.3); V.scorch(ground(B).x, ground(B).y, 1.1); V.crack(ground(B).x, ground(B).y, 0xffe14d, 1); V.plume(B.x, B.y + 40, 0.5, 0x3a3a3a);
        BFX.baked('Kunoichi_skill2_after_Lighting', B.x, B.y, 1.3, flip);
        await wait(300); FX.doShake(13, 0.35); break;
      }
      case 'buff': {
        // 강화: 몸을 감아 오르는 금빛 나선 + 머리 위 화살표 + 마지막 섬광
        Audio2.sfx('charge', 0.5); Audio2.sfx('rise', 0.5);
        V.shock(A.x, FA, 0xffb22e, 1.4, true);
        const X0 = wx(A.x), Y0 = wy(FA);
        for (let i = 0; i < n(26); i++) { const t0 = i * 0.018;
          later(t0, () => { const a = i * 0.7, r = 1.0; P().particle({ x: X0 + Math.cos(a) * r, y: Y0, vx: -Math.sin(a) * 3, vy: 4.2, drag: 0.2, life: 0.9, size: 0.36, size1: 0.08, color: i % 2 ? 0xffb22e : 0xfff0b0, tex: P().tex.glow, alpha: 0.9 }); }); }
        P().particle({ x: X0, y: Y0 + 2.2, life: 1.0, size: 1.0, size1: 1.3, aspect: 6, color: 0xffb22e, tex: P().tex.beam, alpha: 0.5, fadeIn: 0.15 });
        await wait(380);
        const head = BattleArt.frame(this, side), hx = wx(head.x + head.w / 2), hy = wy(head.y) + 0.2;
        for (let i = 0; i < 3; i++) later(i * 0.12, () => { for (const d of [-1, 1]) P().particle({ x: hx + d * 0.42, y: hy + i * 0.6, vy: 1.4, life: 1.1, size: 0.35, size1: 0.3, aspect: 3.2, rot: d * 0.95, color: 0xffd060, tex: P().tex.beam, alpha: 1, fadeIn: 0.05 }); P().particle({ x: hx, y: hy + i * 0.6 + 0.2, vy: 1.4, life: 1.1, size: 1.0, size1: 0.8, color: 0xffb22e, tex: P().tex.glow, alpha: 0.5 }); }); // ^ 모양 상승 화살표
        P().particle({ x: wx(A.x), y: wy(A.y), life: 0.7, size: 2.0, size1: 3.2, color: 0xffb22e, tex: P().tex.glow, alpha: 0.45 }); V.shock(A.x, FA, 0xffe08a, 1.6, true);
        V.core(A.x, A.y - 60, 0xffb22e, 0.9); V.streaks(A.x, A.y - 60, 0xfff0b0, 10, 5, 0.9, Math.PI / 2, 0.8);
        P().particle({ x: wx(head.x + head.w / 2), y: wy(head.y + head.h / 2), life: 1.0, size: Math.max(head.w, head.h) / BFX.U * 0.9, size1: Math.max(head.w, head.h) / BFX.U, aspect: head.h / Math.max(1, head.w) * 0.8, color: 0xffb22e, tex: P().tex.glow, alpha: 0.28, fadeIn: 0.1 }); // 금빛 오라
        P().particle({ x: wx(A.x), y: wy(FA), life: 1.3, size: 3.0, size1: 3.4, aspect: 0.32, color: 0xffb22e, tex: P().tex.ring, alpha: 0.8 }); // 발밑에 남는 고리
        Audio2.sfx('shine', 0.45); await wait(360); break;
      }
      case 'debuff': {
        Audio2.sfx('warning', 0.45); Audio2.sfx('atk_energy', 0.4);
        BFX.wave(A.x, A.y, B.x, B.y, 0x5aa9ff); await wait(300);
        // 어두운 고리가 조여 들고 기운이 아래로 빠져나간다
        for (let i = 0; i < 3; i++) { BFX.ring(B.x, B.y, 160 - i * 35, 10, 0x5a7aff, 0.42); await wait(80); }
        for (let i = 0; i < n(16); i++) P().particle({ x: wx(B.x + R(-60, 60)), y: wy(B.y - R(-40, 80)), vy: -R(1.5, 3.5), life: R(0.5, 0.9), size: 0.1, size1: 0.02, aspect: 5, color: i % 2 ? 0x5a7aff : 0xb08aff, tex: P().tex.beam });
        V.smoke(B.x, B.y, 4, 1.1, 0x2a2850, 0.55); V.core(B.x, B.y, 0x7a5aff, 1); V.shock(B.x, FB, 0x7a5aff, 1.5, true);
        for (let i = 0; i < 3; i++) P().particle({ x: wx(B.x), y: wy(B.y - 120) + i * 0.15, life: 0.8, size: 0.5, size1: 0.3, aspect: 1, color: 0xb08aff, tex: P().tex.cross, alpha: 0.9, spin: 2, fadeIn: 0.1 });
        for (let i = 0; i < n(6); i++) P().particle({ x: wx(B.x + R(-50, 50)), y: wy(B.y + R(-20, 60)), vy: R(0.5, 1.2), life: R(1.0, 1.3), size: 1.0, size1: 2.4, color: 0x3a2a6a, frames: P().sheets.smoke, alpha: 0.6, normal: true, order: P().L.FX - 2, fadeIn: 0.1 });
        for (let i = 0; i < 3; i++) for (const d of [-1, 1]) P().particle({ x: wx(B.x) + d * 0.3, y: wy(B.y - 150) - i * 0.5, vy: -0.8, life: 1.3, size: 0.3, size1: 0.26, aspect: 3, rot: Math.PI - d * 0.95, color: 0x9a7aff, tex: P().tex.beam, alpha: 1, fadeIn: 0.08 + i * 0.08 }); // v 모양 하강 화살표
        await wait(180); break;
      }
      case 'shield': {
        // 보호막: 둥근 막이 잠시 버티고, 육각 테두리·빛 훑기·궤도 반짝이, 마지막에 '잠금' 맥동
        Audio2.sfx('shield', 0.75); Audio2.sfx('shine', 0.4);
        V.charge(A.x, A.y, 0x5ff4ff, 0.2, 1.3); await wait(180);
        const X = wx(A.x), Y = wy(A.y);
        P().particle({ x: X, y: Y, life: 1.3, size: 4.2, size1: 4.4, aspect: 0.9, color: 0x5ff4ff, tex: P().tex.ring, alpha: 0.9, fadeIn: 0.08 });
        P().particle({ x: X, y: Y, life: 1.3, size: 4.4, size1: 4.6, aspect: 0.9, color: 0xdffcff, tex: P().tex.ring, alpha: 0.5, fadeIn: 0.2 });
        P().particle({ x: X, y: Y, life: 0.9, size: 4.0, size1: 4.4, aspect: 0.9, color: 0x5ff4ff, tex: P().tex.glow, alpha: 0.25, fadeIn: 0.08 });
        const hex = []; for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; hex.push({ x: X + Math.cos(a) * 1.9, y: Y + Math.sin(a) * 1.7 }); }
        P().ribbon(hex, 0.08, 0xbffcff, 0.85, { alpha: 0.9 });
        V.shock(A.x, FA, 0x5ff4ff, 1.4, true);
        for (let i = 0; i < n(10); i++) { const a = i / 10 * Math.PI * 2;
          P().particle({ x: X + Math.cos(a) * 2.1, y: Y + Math.sin(a) * 1.9, vx: -Math.sin(a) * 2.5, vy: Math.cos(a) * 2.2, life: 0.8, size: 0.16, size1: 0.04, color: 0xbffcff, tex: P().tex.dot, alpha: 1 }); }
        await wait(300);
        P().ribbon(P().jagged(X - 2, Y + 1.4, X + 2, Y - 1.2, 0.05, 0.4), 0.18, 0xffffff, 0.3, { alpha: 0.7 });
        await wait(250);
        P().particle({ x: X, y: Y, life: 0.3, size: 4.0, size1: 4.8, aspect: 0.9, color: HOT, tex: P().tex.ring, alpha: 0.8 });
        for (let i = 0; i < n(12); i++) { const a = R(0, Math.PI * 2); later(0.5, () => P().particle({ x: X + Math.cos(a) * 2.1, y: Y + Math.sin(a) * 1.9, vx: Math.cos(a) * R(1.5, 3), vy: Math.sin(a) * R(1.5, 3), grav: 3, life: 0.6, size: 0.18, size1: 0.1, aspect: 2, rot: a, color: 0xbffcff, tex: P().tex.beam, alpha: 0.9, spin: 6 })); } // 막이 조각나며 흩어진다
        await wait(150); break;
      }
      case 'heal': {
        // 회복: 위에서 빛 방울이 내려와 몸으로 모이고, 초록 십자가 피어오르며 부드럽게 맥동
        Audio2.sfx('heal', 0.7); Audio2.sfx('shine', 0.35);
        { const hf = BattleArt.frame(this, side); P().particle({ x: wx(hf.x + hf.w / 2), y: wy(hf.y + hf.h / 2), life: 1.2, size: Math.max(hf.w, hf.h) / BFX.U * 0.9, size1: Math.max(hf.w, hf.h) / BFX.U, aspect: hf.h / Math.max(1, hf.w) * 0.8, color: 0x5dff9c, tex: P().tex.glow, alpha: 0.26, fadeIn: 0.15 }); } // 몸을 감싸는 초록 빛
        const X = wx(A.x), Y = wy(A.y);
        for (let i = 0; i < n(18); i++) { const sx = X + R(-1.6, 1.6), sy = Y + R(2.2, 3.4), life = R(0.45, 0.7);
          P().particle({ x: sx, y: sy, vx: (X - sx) / life, vy: (Y - sy) / life, life, size: 0.32, size1: 0.12, color: i % 2 ? 0x5dff9c : 0xc8ffde, tex: P().tex.glow, alpha: 0.95, fadeIn: 0.08 }); }
        P().particle({ x: X, y: Y + 0.6, life: 1.1, size: 1.5, size1: 1.8, aspect: 3, color: 0x5dff9c, tex: P().tex.glow, alpha: 0.35, fadeIn: 0.2 });
        P().particle({ x: X, y: wy(FA) + 2.4, life: 1.1, size: 0.9, size1: 1.2, aspect: 6, color: 0x5dff9c, tex: P().tex.beam, alpha: 0.45, fadeIn: 0.15 }); // 초록 빛기둥
        for (let i = 0; i < 3; i++) later(0.3 + i * 0.15, () => P().particle({ x: X + (i - 1) * 0.9, y: Y + 1.4, vy: 0.8, life: 1.2, size: 1.0, size1: 0.8, color: 0x7dffb0, tex: P().tex.cross, alpha: 0.95, fadeIn: 0.1 })); // 머리 위 큰 십자
        await wait(420);
        for (let i = 0; i < n(10); i++) { const a = i * 1.1; later(i * 0.06, () => P().particle({ x: X + Math.cos(a) * 0.9, y: Y - 0.8, vx: -Math.sin(a) * 1.6, vy: 1.8, life: 1.0, size: 0.8, size1: 0.4, color: i % 2 ? 0x5dff9c : 0xc8ffde, tex: P().tex.cross, alpha: 0.95 })); } // 나선으로 오르는 십자
        P().particle({ x: X, y: wy(FA), life: 1.4, size: 3.0, size1: 3.3, aspect: 0.32, color: 0x5dff9c, tex: P().tex.ring, alpha: 0.75 });
        for (let i = 0; i < n(6); i++) P().particle({ x: X + R(-1, 1), y: Y + R(-0.8, 0.4), vy: R(1.2, 2), life: R(0.9, 1.1), size: 0.7, size1: 0.35, color: 0x5dff9c, tex: P().tex.cross, alpha: 0.9, fadeIn: 0.06 });
        for (let i = 0; i < 2; i++) later(i * 0.18, () => P().particle({ x: X, y: Y, life: 0.45, size: 1.2, size1: 3.0, color: 0x5dff9c, tex: P().tex.glow, alpha: 0.45 }));
        V.shock(A.x, FA, 0x5dff9c, 1.2, true);
        later(0.45, () => { P().particle({ x: X, y: Y, life: 0.5, size: 1.4, size1: 3.2, color: 0xc8ffde, tex: P().tex.glow, alpha: 0.4 }); V.shock(A.x, FA, 0x5dff9c, 1.5, true); });
        await wait(380); break;
      }
      case 'smoke': {
        // 연막: 터지며 세 번에 걸쳐 짙은 연기가 대상을 덮고 오래 남는다
        Audio2.sfx('whoosh', 0.6);
        await V.projectile(A, B, 0x8899aa, 320, { arc: 90, size: 0.5, smoke: true });
        V.core(B.x, B.y, 0xc0c8d0, 0.9); V.shock(B.x, FB, 0x9aa4b0, 1.4, true);
        for (let w = 0; w < 3; w++) {
          const f = P();
          for (let i = 0; i < n(6); i++) f.particle({ x: wx(B.x + R(-70, 70)), y: wy(B.y + R(-60, 60)), vx: R(-0.9, 0.9), vy: R(0, 0.5), drag: 0.4, life: R(1.6, 2.0), size: 1.4, size1: R(3.5, 4.5),
            color: i % 3 ? 0x4a525e : 0x8a94a2, frames: f.sheets.smoke, alpha: 0.75, normal: true, order: f.L.FX - 2, spin: R(-0.6, 0.6), fadeIn: 0.12 });
          await wait(150);
        }
        V.dust(B.x, FB, 1.4, 0x7a8494); await wait(300); break;
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
      busy(); V.tracer(from, q, col, 150, 1.4);
      const a = Math.atan2(wy(q.y) - wy(from.y), wx(q.x) - wx(from.x));
      P().muzzleFlash(wx(from.x), wy(from.y), a, 0xffd27a, 2.1);
      // 탄피: 작은 금빛 조각이 뒤로 튀어 떨어진다
      for (let i = 0; i < n(2); i++) P().particle({ x: wx(from.x), y: wy(from.y), vx: -Math.cos(a) * R(1.5, 3) + R(-1, 1), vy: R(2, 4), grav: 14, life: 0.5, size: 0.07, aspect: 1.8, color: 0xd8a040, tex: P().tex.white, normal: true, spin: R(-14, 14) });
      V.smoke(from.x, from.y, 1, 0.4, 0x8a8a8a, 0.35);
    } else this.shapes.push({ type: 'tracer', x1: from.x, y1: from.y, x2: q.x, y2: q.y, t: 0, life: 0.115, color: gun ? '#ffe9a8' : TYPES[type].color });
    await wait(100);
    if (on()) {
      const a = Math.atan2(wy(q.y) - wy(from.y), wx(q.x) - wx(from.x));
      V.core(q.x, q.y, col, 0.6); V.streaks(q.x, q.y, col, 10, 7, 0.9, a + Math.PI, 0.9);
      V.smoke(q.x, q.y, 1, 0.55, 0x22242a, 0.7); V.debris(q.x, q.y, 5, 0.7, 0x4a443c);
      P().particle({ x: wx(q.x), y: wy(q.y), life: 0.45, size: 0.22, size1: 0.12, color: 0xffd27a, tex: P().tex.dot, alpha: 0.9 }); // 남는 탄흔 불씨
      P().particle({ x: wx(q.x), y: wy(q.y), life: 0.2, size: 0.3, size1: 1.6, color: col, tex: P().tex.ring, alpha: 0.8 });
      BFX.baked('hnadgun_hit', q.x, q.y, 0.45, tSide === 'me');
    } else Particles.burst(q.x, q.y, 8, { speed: 100, size: 3, life: 0.2, color: gun ? '#ffe9a8' : TYPES[type].color, add: true });
  };

  // ---------------------------------------------------------------- 근접: 베기·연속 베기·물기·돌진·강타
  Battle.prototype.meleeFx = async function (fx, side, tSide, type) {
    const back = await BattleArt.approach(this, side, tSide), T = this.fxTarget(tSide), FT = V.footOf(tSide) ?? T.y + 150;
    const [c1] = pal(type);
    try {
      const cnt = fx === 'slash3' ? 3 : 1;
      for (let i = 0; i < cnt; i++) {
        Audio2.sfx(fx === 'dash' || fx === 'smash' ? 'hit_smash' : 'atk_swing', 0.65);
        if (!on()) { this.shapes.push({ type: fx === 'bite' ? 'bite' : 'slash', x: T.x + R(-6, 6), y: T.y + R(-6, 6), r: fx === 'smash' ? 40 : 58, a0: -2.5 + i * 0.9, t: 0, life: 0.22, color: fx === 'bite' ? '#ff778b' : '#e9fbff' }); await wait(cnt > 1 ? 85 : 150); continue; }
        busy();
        if (fx === 'smash' || fx === 'dash') {
          V.impact(T.x, T.y, type, fx === 'smash' ? 1.7 : 1.3, { debris: true });
          V.shock(T.x, FT, c1, 1.6, true); V.dust(T.x, FT, 1.3); V.crack(T.x, FT, c1, fx === 'smash' ? 1.3 : 1); V.plume(T.x, FT + 30, 0.35, 0x9a9080); V.debris(T.x, FT - 10, 3, 2.2, 0x5a5048); P().particle({ x: wx(T.x), y: wy(FT), life: 0.12, size: 3.2, size1: 3.6, aspect: 0.32, color: HOT, tex: P().tex.ring, alpha: 1 }); V.scorch(T.x, FT, 0.9, 0x3a3020);
          if (fx === 'dash') { V.streaks(T.x, T.y, HOT, 14, 9, 1, side === 'me' ? 0 : Math.PI, 0.35);
            const S0 = this.fxOrigin(side, fx); P().ribbon([{ x: wx(S0.x), y: wy(S0.y) }, { x: wx(T.x), y: wy(T.y) }], 0.6, c1, 0.6, { alpha: 0.5, shrink: true });
            for (let i = 0; i < n(8); i++) { const k = R(0.1, 0.9), oy = R(-0.8, 0.8); P().particle({ x: lerp(wx(S0.x), wx(T.x), k), y: lerp(wy(S0.y), wy(T.y), k) + oy, vx: (side === 'me' ? 1 : -1) * 6, life: 0.55, size: 0.06, size1: 0.03, aspect: 16, rot: Math.PI / 2, color: HOT, tex: P().tex.beam, alpha: 0.8 }); } } // 속도선
          FX.doShake(fx === 'smash' ? 12 : 8, 0.3);
        } else if (fx === 'bite') {
          V.slashArc(T.x, T.y - 20, 0xff778b, 1.1, Math.PI); V.slashArc(T.x, T.y + 20, 0xff778b, 1.1, 0);
          V.core(T.x, T.y, 0xff778b, 0.9); V.streaks(T.x, T.y, 0xffb0c0, 10, 6, 1);
        } else {
          const rot = [-0.6, 0.9, -2.2][i % 3] + R(-0.2, 0.2), last = i === cnt - 1;
          V.slashArc(T.x + R(-10, 10), T.y + R(-10, 10), c1, fx === 'slash3' ? 1.15 : 1.35, rot);
          // 잔상: 같은 궤적이 0.5초 동안 옅게 남는다
          P().particle({ x: wx(T.x), y: wy(T.y), life: 0.8, size: 3.6, size1: 4.0, color: c1, tex: P().tex.slash, rot, alpha: 0.6 });
          V.groundMark(T.x + R(-20, 20), FT, rot * 0.3 + Math.PI / 2, 1, 0x241c14);
          V.core(T.x, T.y, c1, last && fx === 'slash3' ? 1.2 : 0.7); V.streaks(T.x, T.y, HOT, 10, 7, 1, rot, 0.5);
          if (last && fx === 'slash3') { V.slashArc(T.x, T.y, HOT, 1.5, rot + Math.PI / 2); FX.doFlash('#ffffff', 0.18); window.HITSTOP = Math.max(window.HITSTOP || 0, 0.06); } // 마지막 일격은 X자
          if (last) { V.shock(T.x, T.y, c1, 1.1); V.shock(T.x, FT, c1, 1.2, true); V.embers(T.x, T.y, c1, 10, 0.9, 0.6); V.linger(T.x, T.y, c1, 1); }
        }
        await wait(cnt > 1 ? 90 : 160);
      }
    } finally { await back(); }
  };

  // ---------------------------------------------------------------- 샤이닝 핸드 (램파리온)
  // 오른손이 하얗게 빛나며 차오르고 → 빛줄기를 남기며 돌진 → 상대가 빛에 감싸였다가 → 화염 폭발
  Battle.prototype.shiningHandFx = async function (side, tSide) {
    const H = this.fxOrigin(side, 'shininghand'), WHITE = 0xffffff, GOLD = 0xfff1b8;
    if (on()) {
      busy();
      Audio2.sfx('charge', 0.7); Audio2.sfx('shine', 0.5);
      V.charge(H.x, H.y, WHITE, 0.55, 1.4);
      // 손에서 하얀 빛이 차오른다: 커지는 빛 덩어리 + 위로 피어오르는 빛 알갱이 + 십자 섬광
      P().particle({ x: wx(H.x), y: wy(H.y), life: 0.7, size: 0.4, size1: 1.8, color: WHITE, tex: P().tex.glow, alpha: 1, fadeIn: 0.25 });
      P().particle({ x: wx(H.x), y: wy(H.y), life: 0.7, size: 0.8, size1: 2.6, color: GOLD, tex: P().tex.glow, alpha: 0.6, fadeIn: 0.3 });
      for (let i = 0; i < n(18); i++) later(i * 0.025, () => P().particle({ x: wx(H.x) + R(-0.5, 0.5), y: wy(H.y) + R(-0.4, 0.4), vy: R(1.5, 3), vx: R(-0.6, 0.6), life: R(0.35, 0.6), size: 0.1, size1: 0, color: i % 2 ? WHITE : GOLD, tex: P().tex.dot }));
      later(0.45, () => P().particle({ x: wx(H.x), y: wy(H.y), life: 0.3, size: 2.4, size1: 1.2, color: WHITE, tex: P().tex.cross, rot: Math.PI / 4, spin: 3, alpha: 1 }));
    }
    await wait(560);
    // 돌진: 빛나는 손이 지나간 자리에 빛줄기
    const S0 = this.fxOrigin(side, 'shininghand');
    Audio2.sfx('whoosh', 0.8);
    const back = await BattleArt.approach(this, side, tSide), T = this.fxTarget(tSide), FT = V.footOf(tSide) ?? T.y + 150;
    try {
      if (!on()) return;
      busy();
      P().ribbon([{ x: wx(S0.x), y: wy(S0.y) }, { x: wx(T.x), y: wy(T.y) }], 0.7, GOLD, 0.5, { alpha: 0.6, shrink: true });
      P().ribbon([{ x: wx(S0.x), y: wy(S0.y) }, { x: wx(T.x), y: wy(T.y) }], 0.25, WHITE, 0.4, { alpha: 0.9, shrink: true });
      Audio2.sfx('hit_smash', 0.8); FX.doFlash('#ffffff', 0.35); window.HITSTOP = Math.max(window.HITSTOP || 0, 0.08);
      // 움켜쥔 순간: 하얀 빛이 상대를 감싼다 (빛의 구 + 좁혀 드는 고리 + 몸을 타고 오르는 빛)
      V.core(T.x, T.y, WHITE, 1.4);
      P().particle({ x: wx(T.x), y: wy(T.y), life: 0.75, size: 2.2, size1: 3.2, color: WHITE, tex: P().tex.glow, alpha: 0.75, fadeIn: 0.1 });
      for (let i = 0; i < 3; i++) later(i * 0.12, () => P().particle({ x: wx(T.x), y: wy(T.y), life: 0.4, size: 4.2 - i * 0.6, size1: 0.6, color: i % 2 ? GOLD : WHITE, tex: P().tex.ring, alpha: 0.95 }));
      for (let i = 0; i < n(16); i++) later(i * 0.03, () => P().particle({ x: wx(T.x) + R(-0.9, 0.9), y: wy(FT) + 0.2, vy: R(3, 5), life: R(0.4, 0.6), size: 0.14, size1: 0.05, aspect: 5, color: i % 2 ? WHITE : GOLD, tex: P().tex.beam, alpha: 0.95 }));
      await wait(620);
      // 빛이 터지며 화염 폭발
      Audio2.sfx('explosion_big', 0.85); Audio2.sfx('flame', 0.5);
      FX.doFlash('#ffd9a0', 0.6); FX.doShake(16, 0.45);
      V.impact(T.x, T.y, 'fire', 2.2, { embers: true, debris: true });
      if (window.BFX && BFX.explosion) BFX.explosion(T.x, T.y, 70, 0xff7a30, true);
      V.shock(T.x, FT, 0xff8a3d, 2.4, true); V.scorch(T.x, FT, 1.3, 0x2a1408);
      for (let i = 0; i < 6; i++) { const x = T.x + (i - 2.5) * 26; later(0.05 * i, () => V.tongues(x, FT, 1.4, 4)); }
      V.embers(T.x, T.y, 0xffb050, 18, 1.4);
      later(0.25, () => V.plume(T.x, T.y - 20, 0.8, 0x2a2420));
      await wait(380);
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
