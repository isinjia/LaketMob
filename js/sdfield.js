// =====================================================================
//  필드 SD 캐릭터: js/sd.js(원작 컷아웃 리그 런타임)로 애니메이션한 SD를
//  화면 밖 WebGL 캔버스 한 장에 칸별로 렌더링한 뒤 2D 게임 화면에 합성한다.
//  THREE 또는 리그 데이터가 없으면 기존 아이콘 스탠디로 자동 대체된다.
// =====================================================================
const SDF = {
  COLS: 8, ROWS: 3, CW: 110, CH: 172, R: 2,
  ok: false, renderer: null, scene: null, camera: null, canvas: null,
  avail: new Set(), status: {}, frameSlots: [],
  init() {
    try {
      if (typeof THREE === 'undefined' || !window.SD) return;
      this.canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: !LOW_MEM, premultipliedAlpha: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(this.COLS * this.CW * this.R, this.ROWS * this.CH * this.R, false);
      this.renderer.setClearColor(0x000000, 0);
      this.scene = new THREE.Scene();
      const w = this.COLS * this.CW, h = this.ROWS * this.CH;
      this.camera = new THREE.OrthographicCamera(0, w, h, 0, -1000, 1000);
      SD.renderer = this.renderer;
      SD.crossfade = 0.12;
      (window.SD_LIST || []).forEach(k => this.avail.add(k));
      this.ok = true;
    } catch (e) { console.warn('SD 필드 비활성', e); this.ok = false; }
  },
  // 리그 준비(비동기). 준비 전에는 false
  ready(key) {
    if (!this.ok || !this.avail.has(key)) return false;
    const st = this.status[key];
    if (st === 'ok') return true;
    if (!st) {
      this.status[key] = 'loading';
      SD.prepare(key).then(t => { this.status[key] = t ? 'ok' : 'fail'; }).catch(() => { this.status[key] = 'fail'; });
    }
    return false;
  },
  // 이번 프레임에 그릴 SD 목록을 받아 한 번에 렌더링한다. items: [{holder, key, anim, flip, h}]
  renderFrame(items, dt) {
    this.frameSlots = [];
    if (!this.ok || !items.length) return;
    const max = this.COLS * this.ROWS;
    const used = new Set();
    items.slice(0, max).forEach((it, i) => {
      let c = it.holder._sd;
      if (!c || c.tpl.id !== it.key) { if (c) { this.scene.remove(c.root); } c = it.holder._sd = SD.create(it.key); if (!c) return; c.play('idle', null, true); c._anim = 'idle'; }
      if (c._anim !== it.anim && c.has(it.anim)) { c.play(it.anim, null, true); c._anim = it.anim; }
      c.update(dt);
      // 리그 전체 높이(무기·부속 포함)가 아니라 공통 키 기준(사람형 ≈ 9)으로 맞춘다. 칸(130px)을 넘는 큰 리그만 줄인다
      const t = c.tpl, k = Math.min((it.h || 72) / 9, (this.CH - 8) / t.height);
      const col = i % this.COLS, row = Math.floor(i / this.COLS);
      const cx = col * this.CW + this.CW / 2, by = (this.ROWS - 1 - row) * this.CH + 6;
      c.root.scale.set(it.flip ? -k : k, k, 1);
      const mid = (t.box.min.x + t.box.max.x) / 2 * k;
      c.root.position.set(cx - (it.flip ? -mid : mid), by - t.box.min.y * k, 0);
      if (!c.root.parent) this.scene.add(c.root);
      c.root.visible = true;
      used.add(c);
      it.holder._sdSlot = { sx: col * this.CW * this.R, sy: row * this.CH * this.R, f: this.frameSlots.length };
      this.frameSlots.push(it.holder);
    });
    for (const o of this.scene.children) o.visible = false;
    for (const c of used) c.root.visible = true;
    this.renderer.render(this.scene, this.camera);
  },
  // holder의 SD를 발 위치 (cx, footY)에 그린다
  draw(holder, cx, footY, alpha = 1) {
    const s = holder._sdSlot; if (!s || this.frameSlots[s.f] !== holder) return false;
    const R = this.R;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(this.canvas, s.sx, s.sy, this.CW * R, this.CH * R, cx - this.CW / 2, footY - this.CH + 6, this.CW, this.CH);
    ctx.restore();
    return true;
  },
  release(holder) { if (holder && holder._sd) { this.scene.remove(holder._sd.root); holder._sd.dispose && holder._sd.dispose(); holder._sd = null; } },
};
window.SDF = SDF;
