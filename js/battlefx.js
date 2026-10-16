// =====================================================================
//  전투 이펙트 레이어: 원작 Unity 이펙트(FXB, js/fxbake.js) + 파티클(window.FX, js/fx.js)
//  화면 밖 WebGL 캔버스에 그린 뒤 2D 전투 화면 위에 합성한다. 사용할 수 없으면 기존 2D 연출로 대체.
// =====================================================================
const BFX = {
  ok: false, busy: 0, U: 60, canvas: null, renderer: null, scene: null, camera: null, inst: [], P: null,
  BAKED: ['simple_explosion', 'hnadgun_hit', 'FX_hit_bori', 'skill_hit_simple', 'Phoenix_skill1_hit', 'Kunoichi_skill2_after_Lighting',
    'valkyrie_Hit_skill1', 'valkyrie_Hit_skill2', 'RPG_skill2_hit', 'Harpy_skill2_missile_last_Hit', 'Thetis_skill1_Ground_Hit',
    'Undine_skill1_Hit', 'Mercury_N_Skill2_Hit', 'Raven_skill1_Hit', 'Sleipnir_hit', 'FX_hit_bori', 'Titania_skill1_Ground_ice'],
  async init() {
    try {
      if (typeof THREE === 'undefined' || !window.FXB || !window.FX || !window.FX.init || !window.FX_IMAGES_SRC) return;
      this.P = window.FX; // 파티클 (core.js 의 FX 와 이름이 같아 window 로 접근)
      this.canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, premultipliedAlpha: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);
      this.resize();
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-W / 2 / this.U, W / 2 / this.U, H / 2 / this.U, -H / 2 / this.U, -100, 100);
      const imgs = {};
      await Promise.all(Object.entries(window.FX_IMAGES_SRC).map(([k, src]) => loadImage(src).then(im => { imgs[k] = im; })));
      this.P.init(this.scene, imgs);
      FXB.renderer = this.renderer;
      this.ok = true;
      // 폰은 자주 쓰는 이펙트 몇 개만 미리 받고, 나머지는 처음 쓰일 때 받는다 (그 한 번은 2D 연출로 대신)
      (LOW_MEM ? this.BAKED.slice(0, 4) : this.BAKED).forEach(n => FXB.prepare(n).catch(() => { }));
    } catch (e) { console.warn('전투 이펙트 레이어 비활성', e); this.ok = false; }
  },
  // 폰: 전투가 끝나면 최근에 쓴 이펙트 몇 개만 남기고 아틀라스를 해제한다
  trim(keep = 6) {
    if (!this.ok || !window.FXB) return;
    this.clear();
    const keepSet = new Set([...this.BAKED.slice(0, 4), ...(this.used || []).slice(0, keep)]);
    for (const n of FXB.loaded()) if (!keepSet.has(n)) FXB.evict(n);
  },
  resize() { if (this.renderer) this.renderer.setSize(Math.round(W * Math.min(SCALE, 1.5)), Math.round(H * Math.min(SCALE, 1.5)), false); },
  wx(x) { return (x - W / 2) / this.U; },
  wy(y) { return (H / 2 - y) / this.U; },
  col(c) { return typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16); },
  // 원작 이펙트 재생 (x, y: 화면 픽셀)
  baked(name, x, y, k = 1, flip = false) {
    if (!this.ok) return false;
    if (!FXB.ready(name)) { FXB.prepare(name).catch(() => { }); return false; }
    this.used = this.used || []; this.used = [name, ...this.used.filter(n => n !== name)];
    const i = FXB.create(name); if (!i) return false;
    this.busy = 4;
    i.root.position.set(this.wx(x), this.wy(y), 0);
    const s = 0.28 * k; i.root.scale.set(flip ? -s : s, s, 1);
    i.setOrder && i.setOrder(45);
    this.scene.add(i.root); this.inst.push(i);
    return true;
  },
  hit(x, y, c, s = 1) { this.busy = 4; this.P.hit(this.wx(x), this.wy(y), this.col(c), s); },
  sparks(x, y, c, n, sp) { this.busy = 4; this.P.sparks(this.wx(x), this.wy(y), this.col(c), n, sp); },
  explosion(x, y, r, c, big) { this.busy = 4; this.P.explosion(this.wx(x), this.wy(y), r / this.U, this.col(c), big); },
  ring(x, y, r0, r1, c, life) { this.busy = 4; this.P.ring(this.wx(x), this.wy(y), r0 / this.U, r1 / this.U, this.col(c), life); },
  beam(x0, y0, x1, y1, w, c, life) { this.busy = 4; this.P.beam(this.wx(x0), this.wy(y0), this.wx(x1), this.wy(y1), w / this.U, this.col(c), life); },
  lightning(pts, c, w, life) { this.busy = 4; this.P.lightning(pts.map(p => ({ x: this.wx(p.x), y: this.wy(p.y) })), this.col(c), w, life); },
  slash(x, y, c, s) { this.busy = 4; this.P.slash(this.wx(x), this.wy(y), this.col(c), s); },
  flame(x0, y0, x1, y1, c) { this.busy = 4; this.P.flame(this.wx(x0), this.wy(y0), this.wx(x1), this.wy(y1), this.col(c)); },
  wave(x0, y0, x1, y1, c) { this.busy = 4; this.P.wave(this.wx(x0), this.wy(y0), this.wx(x1), this.wy(y1), this.col(c)); },
  frost(x, y, r, c) { this.busy = 4; this.P.frost(this.wx(x), this.wy(y), r / this.U, this.col(c)); },
  holy(x, y, r, c) { this.busy = 4; this.P.holy(this.wx(x), this.wy(y), r / this.U, this.col(c)); },
  muzzle(x, y, ang, c, k) { this.busy = 4; this.P.muzzleFlash(this.wx(x), this.wy(y), ang, this.col(c || 0xffd27a), k); },
  bolt(x, y, c) { this.busy = 4; this.P.thunderBolt(this.wx(x), this.wy(y), this.col(c)); },
  trail(x, y, c, s) { this.busy = 4; this.P.trail(this.wx(x), this.wy(y), this.col(c), s); },
  update(dt) {
    if (!this.ok) return;
    if (this.busy <= 0 && !this.inst.length) return;
    this.busy -= dt;
    if (this.busy <= 0 && !this.inst.length) { this.P.clear(); return; }
    this.P.update(dt);
    for (let i = this.inst.length - 1; i >= 0; i--) {
      const f = this.inst[i]; f.update(dt);
      if (f.done) { f.dispose(); this.inst.splice(i, 1); }
    }
  },
  draw() {
    if (!this.ok || (this.busy <= 0 && !this.inst.length)) return;
    this.P.draw();
    this.renderer.render(this.scene, this.camera);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(this.canvas, 0, 0, W, H); ctx.restore();
  },
  clear() { if (!this.ok) return; this.busy = 0; this.P.clear(); for (const f of this.inst) f.dispose(); this.inst.length = 0; },
};
window.BFX = BFX;

// ---------------------------------------------------------------------
//  기술 연출 (원작 이펙트 + 파티클)
// ---------------------------------------------------------------------
Battle.prototype.playFx3 = async function (fx, side, tSide, type, isAtk) {
  const A = side === 'me' ? this.mePos() : this.foePos();
  const B = tSide === 'me' ? this.mePos() : this.foePos();
  const col = TYPES[type].color;
  const uv = this.view(side);
  const flip = side === 'foe';
  const ang = Math.atan2(-(B.y - A.y), B.x - A.x);
  const lunge = async (dist = 60) => { const dir = side === 'me' ? 1 : -1; const bx = uv.x; await tween(uv, { x: bx + dir * dist }, 110, Ease.outQuad); tween(uv, { x: bx }, 220); };
  const travel = (o) => new Promise(res => {
    let t = 0;
    Tick.add(dt => {
      t += dt * 1000; const p = clamp(t / o.ms, 0, 1);
      const x = lerp(A.x, B.x, p), y = lerp(A.y, B.y, p) - Math.sin(p * Math.PI) * (o.arc || 0);
      BFX.trail(x, y, o.color || col, o.size || 0.35);
      if (o.glow) BFX.trail(x, y, 0xffffff, (o.size || 0.35) * 0.5);
      if (p >= 1) { res(); return false; }
    });
  });
  const near = (p, r = 30) => ({ x: p.x + rand(-r, r), y: p.y + rand(-r, r) });
  switch (fx) {
    case 'bullet':
      for (let i = 0; i < 3; i++) {
        Audio2.sfx('atk_rifle', 0.6, rand(0.95, 1.05)); BFX.muzzle(A.x, A.y - 10, ang, 0xffd27a, 1.2);
        BFX.beam(A.x, A.y - 10, B.x, B.y, 3, 0xffe9a8, 0.08);
        const q = near(B); BFX.baked('hnadgun_hit', q.x, q.y, 0.8, flip) || BFX.hit(q.x, q.y, col, 0.7);
        await wait(90);
      }
      break;
    case 'bullets':
      for (let i = 0; i < 7; i++) {
        if (i % 2 === 0) Audio2.sfx('atk_rifle', 0.5, rand(0.95, 1.1));
        BFX.muzzle(A.x, A.y - 10, ang, 0xffd27a, 1); BFX.beam(A.x, A.y - 10, B.x + rand(-40, 40), B.y + rand(-40, 40), 2.5, 0xffe9a8, 0.07);
        const q = near(B, 45); if (i % 2) BFX.baked('hnadgun_hit', q.x, q.y, 0.7, flip); else BFX.hit(q.x, q.y, col, 0.6);
        await wait(55);
      }
      break;
    case 'snipe':
      Audio2.sfx('charge', 0.4); BFX.ring(A.x, A.y, 60, 4, 0xffffff, 0.35); await wait(280);
      Audio2.sfx('atk_rifle', 0.9); BFX.muzzle(A.x, A.y - 10, ang, 0xffffff, 1.8);
      BFX.beam(A.x, A.y - 10, B.x, B.y, 6, 0xffffff, 0.3);
      BFX.baked('skill_hit_simple', B.x, B.y, 1.4, flip); FX.doFlash('#fff', 0.35); await wait(80); break;
    case 'smash': case 'dash':
      Audio2.sfx('cloth', 0.6); await lunge(fx === 'dash' ? 140 : 70);
      BFX.baked('FX_hit_bori', B.x, B.y, 1.2, flip) || BFX.explosion(B.x, B.y, 40, col);
      if (fx === 'dash') BFX.slash(B.x, B.y, col, 1.8);
      break;
    case 'slash': case 'slash3': case 'bite': {
      Audio2.sfx('atk_swing', 0.7); await lunge(40);
      const n = fx === 'slash3' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        BFX.slash(B.x + rand(-20, 20), B.y + rand(-20, 20), fx === 'bite' ? 0xff4d5e : col, 2.6 + i * 0.3); BFX.slash(B.x + rand(-10, 10), B.y + rand(-10, 10), 0xffffff, 1.8 + i * 0.2); BFX.sparks(B.x, B.y, col, 10, 5);
        if (i === n - 1) BFX.baked(fx === 'bite' ? 'FX_hit_bori' : n > 1 ? 'valkyrie_Hit_skill2' : 'valkyrie_Hit_skill1', B.x, B.y, 1.1, flip);
        if (n > 1) { Audio2.sfx('hit_slash', 0.5); await wait(90); }
      }
      await wait(90); break;
    }
    case 'shell':
      Audio2.sfx('atk_rifle', 0.7); BFX.muzzle(A.x, A.y - 10, ang, 0xffb050, 1.6);
      await travel({ ms: 420, arc: 140, color: 0xffd76a, size: 0.7, glow: true });
      Audio2.sfx('explosion', 0.6); BFX.baked('simple_explosion', B.x, B.y, 1.3, flip) || BFX.explosion(B.x, B.y, 45, 0xffb050); break;
    case 'barrage':
      for (let i = 0; i < 4; i++) {
        Audio2.sfx('atk_rifle', 0.5); BFX.muzzle(A.x, A.y - 10, ang, 0xffb050, 1.4);
        const q = near(B, 60);
        travel({ ms: 380, arc: 120 + i * 30, color: 0xffd76a, size: 0.35 }).then(() => { BFX.baked(i % 2 ? 'RPG_skill2_hit' : 'simple_explosion', q.x, q.y, 1.1, flip); Audio2.sfx('explosion', 0.4); });
        await wait(110);
      }
      await wait(380); Audio2.sfx('explosion_big', 0.7); FX.doShake(14, 0.4); break;
    case 'beam': case 'icebeam': case 'plasma':
      Audio2.sfx('charge', 0.5); BFX.ring(A.x, A.y, 80, 6, col, 0.35); BFX.holy(A.x, A.y, 30, col);
      await wait(300);
      Audio2.sfx(fx === 'icebeam' ? 'ice' : 'atk_laser', 0.8);
      BFX.beam(A.x, A.y, B.x, B.y, fx === 'beam' ? 22 : 14, fx === 'beam' ? 0x7ff6ff : col, 0.45);
      await wait(200);
      if (fx === 'beam') BFX.baked('Mercury_N_Skill2_Hit', B.x, B.y, 1.4, flip) || BFX.explosion(B.x, B.y, 50, 0x7ff6ff, true);
      else if (fx === 'icebeam') { BFX.frost(B.x, B.y, 90, col); BFX.baked('Undine_skill1_Hit', B.x, B.y, 1.2, flip); }
      else BFX.baked('Sleipnir_hit', B.x, B.y, 1.3, flip) || BFX.explosion(B.x, B.y, 40, col);
      break;
    case 'dive':
      Audio2.sfx('whoosh', 0.8);
      await tween(uv, { dy: -260, a: 0.2 }, 220, Ease.inQuad);
      BFX.beam(B.x, B.y - 360, B.x, B.y, 16, col, 0.25);
      await wait(120); BFX.baked('Harpy_skill2_missile_last_Hit', B.x, B.y, 1.2, flip) || BFX.explosion(B.x, B.y, 50, col);
      uv.dy = 0; tween(uv, { a: 1 }, 200); break;
    case 'bombs':
      Audio2.sfx('whoosh', 0.6);
      for (let i = 0; i < 5; i++) {
        const tx = B.x + rand(-80, 80), ty = B.y + rand(-30, 50);
        BFX.beam(tx, ty - 380, tx, ty, 4, 0xffe0a0, 0.3);
        Tick.add((() => { let t = 0; return dt => { t += dt; if (t > 0.3) { BFX.baked(i % 2 ? 'Thetis_skill1_Ground_Hit' : 'simple_explosion', tx, ty, 1, flip); Audio2.sfx('explosion', 0.45); return false; } }; })());
        await wait(90);
      }
      await wait(400); FX.doShake(12, 0.35); break;
    case 'flame':
      Audio2.sfx('flame', 0.7);
      for (let i = 0; i < 10; i++) { BFX.flame(A.x, A.y, B.x, B.y, 0xff6a2a); await wait(30); }
      BFX.baked('Phoenix_skill1_hit', B.x, B.y, 1.1, flip); await wait(200); break;
    case 'fireball':
      Audio2.sfx('fireball', 0.7); BFX.muzzle(A.x, A.y, ang, 0xff8a3d, 1.5);
      await travel({ ms: 380, arc: 40, color: 0xff8a3d, size: 0.7, glow: true });
      BFX.baked('Phoenix_skill1_hit', B.x, B.y, 1.3, flip); BFX.explosion(B.x, B.y, 40, 0xff7a30); break;
    case 'napalm':
      Audio2.sfx('fireball', 0.8); await travel({ ms: 360, arc: 160, color: 0xff8a3d, size: 0.6, glow: true });
      Audio2.sfx('explosion_big', 0.7); Audio2.sfx('flame', 0.5); FX.doFlash('#ff7a45', 0.3); FX.doShake(14, 0.4);
      BFX.baked('Phoenix_skill1_hit', B.x, B.y, 1.1, flip);
      for (let i = 0; i < 6; i++) { BFX.flame(B.x + rand(-70, 70), B.y + 60, B.x + rand(-50, 50), B.y - 60, 0xff5a20); await wait(40); }
      BFX.ring(B.x, B.y + 40, 30, 150, 0xff7a30, 0.5); await wait(200); break;
    case 'ice':
      Audio2.sfx('ice', 0.6);
      for (let i = 0; i < 3; i++) { travel({ ms: 300, color: 0xbff6ff, size: 0.3, glow: true }); await wait(80); }
      await wait(220); BFX.frost(B.x, B.y, 70, 0x9ff4ff); BFX.baked('Undine_skill1_Hit', B.x, B.y, 1, flip); break;
    case 'blizzard':
      Audio2.sfx('ice', 0.9); FX.doFlash('#bff6ff', 0.45);
      BFX.baked('Titania_skill1_Ground_ice', B.x, B.y + 40, 1.2, flip);
      for (let i = 0; i < 3; i++) { BFX.frost(B.x + rand(-60, 60), B.y + rand(-40, 40), 110, 0xdff9ff); await wait(110); }
      await wait(200); break;
    case 'spark':
      Audio2.sfx('atk_elec', 0.7);
      for (let i = 0; i < 3; i++) { BFX.lightning([{ x: A.x, y: A.y }, near(B, 25)], 0xffe14d, 0.18, 0.2); await wait(70); }
      BFX.baked('Kunoichi_skill2_after_Lighting', B.x, B.y, 0.8, flip); break;
    case 'thunder':
      Audio2.sfx('lightning', 0.9); Audio2.sfx('atk_elec', 0.5); FX.doFlash('#fff7b0', 0.35);
      BFX.bolt(B.x, B.y + 60, 0xfff27a);
      BFX.baked('Kunoichi_skill2_after_Lighting', B.x, B.y, 1.4, flip);
      await wait(300); FX.doShake(12, 0.35); break;
    case 'acid':
      Audio2.sfx('water', 0.7);
      for (let i = 0; i < 4; i++) { travel({ ms: 380, arc: 100 + i * 20, color: 0x9a4dff, size: 0.35 }); await wait(70); }
      await wait(300); BFX.hit(B.x, B.y, 0x9a4dff, 1.4); break;
    case 'drain':
      Audio2.sfx('atk_energy', 0.6); BFX.slash(B.x, B.y, 0xff4d7a, 1.6); await wait(200); break;
    case 'wave':
      Audio2.sfx('atk_energy', 0.7); BFX.wave(A.x, A.y, B.x, B.y, col); await wait(450); BFX.ring(B.x, B.y, 20, 120, col, 0.4); break;
    case 'buff':
      Audio2.sfx('charge', 0.5); Audio2.sfx('rise', 0.5);
      BFX.ring(A.x, A.y + 80, 20, 130, 0xffb22e, 0.5);
      for (let i = 0; i < 4; i++) { BFX.holy(A.x + rand(-30, 30), A.y + 40 - i * 30, 40, 0xffb22e); BFX.sparks(A.x, A.y + 60 - i * 30, 0xffe08a, 6, 3); await wait(80); }
      Audio2.sfx('shine', 0.4); await wait(150); break;
    case 'debuff':
      Audio2.sfx('warning', 0.45); Audio2.sfx('atk_energy', 0.4);
      BFX.wave(A.x, A.y, B.x, B.y, 0x5aa9ff); await wait(300);
      for (let i = 0; i < 3; i++) { BFX.ring(B.x, B.y, 140 - i * 30, 10, 0x5aa9ff, 0.4); BFX.sparks(B.x, B.y - 40 + i * 30, 0x5aa9ff, 6, 2); await wait(90); }
      BFX.hit(B.x, B.y, 0x5aa9ff, 1); await wait(150); break;
    case 'shield':
      Audio2.sfx('shield', 0.7); Audio2.sfx('shine', 0.4);
      BFX.ring(A.x, A.y, 20, 150, 0x5ff4ff, 0.6); await wait(90);
      BFX.ring(A.x, A.y, 150, 110, 0xbffcff, 0.8); BFX.holy(A.x, A.y, 60, 0x5ff4ff); BFX.sparks(A.x, A.y, 0xbffcff, 16, 4);
      await wait(300); break;
    case 'heal':
      Audio2.sfx('heal', 0.7); Audio2.sfx('shine', 0.35);
      BFX.ring(A.x, A.y + 90, 20, 140, 0x5dff9c, 0.6);
      for (let i = 0; i < 5; i++) { BFX.holy(A.x + rand(-50, 50), A.y + 60 - i * 25, 35, 0x5dff9c); BFX.sparks(A.x + rand(-40, 40), A.y + 40 - i * 20, 0xc8ffde, 5, 2.5); await wait(70); }
      await wait(100); break;
    case 'smoke':
      Audio2.sfx('whoosh', 0.6); for (let i = 0; i < 3; i++) BFX.explosion(B.x + rand(-60, 60), B.y + rand(-30, 40), 50, 0x8899aa); await wait(400); break;
    default: await wait(200);
  }
};
