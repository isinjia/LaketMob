// =====================================================================
//  라켓몬스터 - 엔진 코어: 캔버스 / 입력 / 오디오 / 에셋 / 그리기 유틸
// =====================================================================
let W = 960, H = 640;
const TILE = 48;
const FONT = "'Pretendard','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";
const TITLE_FONT = "'Black Han Sans','Noto Sans KR','Malgun Gothic',sans-serif";

// 폰·저사양 기기: 터치 위주이거나 메모리가 4GB 이하. GPU 텍스처를 줄이고 쓰지 않는 리소스를 바로 해제한다
const LOW_MEM = !!((window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.deviceMemory && navigator.deviceMemory <= 4) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let SCALE = 1;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (window.MobileField) MobileField.dimensions();
  const fit = Math.min(vw / W, vh / H);
  const dpr = window.devicePixelRatio || 1;
  // 폰은 화면 버퍼·지형 레이어가 해상도 제곱으로 커져 메모리 초과로 탭이 꺼지므로 렌더 배율을 1.6으로 묶는다
  SCALE = Math.max(1, Math.min(LOW_MEM ? 1.6 : 2.5, fit * dpr));
  canvas.width = Math.round(W * SCALE);
  canvas.height = Math.round(H * SCALE);
  canvas.style.width = Math.floor(W * fit) + 'px';
  canvas.style.height = Math.floor(H * fit) + 'px';
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  if (typeof onResize === 'function') onResize();
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------------
//  유틸
// ---------------------------------------------------------------------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  outCubic: t => (--t) * t * t + 1,
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1,
};

// 한국어 조사
function hasBatchim(word) {
  if (!word) return false;
  const c = word.charCodeAt(word.length - 1);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
  if (/[0-9]$/.test(word)) return '013678'.includes(word[word.length - 1]);
  return /[lmnr]$/i.test(word);
}
function rieul(word) { const c = word.charCodeAt(word.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 === 8; }
function J(word, p) {
  const b = hasBatchim(word);
  switch (p) {
    case '이': case '가': return word + (b ? '이' : '가');
    case '을': case '를': return word + (b ? '을' : '를');
    case '은': case '는': return word + (b ? '은' : '는');
    case '와': case '과': return word + (b ? '과' : '와');
    case '아': case '야': return word + (b ? '아' : '야');
    case '으로': case '로': return word + (b && !rieul(word) ? '으로' : '로');
    case '이여': return word + (b ? '이여' : '여');
  }
  return word + p;
}

// 게임 시간 기반 타이머/트윈
const Tick = {
  list: [],
  time: 0,
  add(fn) { this.list.push(fn); },
  update(dt) {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i](dt) === false) this.list.splice(i, 1);
  },
};
function wait(ms) {
  return new Promise(res => { let t = 0; Tick.add(dt => { t += dt * 1000; if (t >= ms) { res(); return false; } }); });
}
function tween(obj, props, ms, ease = Ease.outQuad) {
  const from = {}; for (const k in props) from[k] = obj[k];
  return new Promise(res => {
    let t = 0;
    Tick.add(dt => {
      t += dt * 1000; const p = clamp(t / ms, 0, 1), e = ease(p);
      for (const k in props) obj[k] = from[k] + (props[k] - from[k]) * e;
      if (p >= 1) { res(); return false; }
    });
  });
}

// ---------------------------------------------------------------------
//  입력
// ---------------------------------------------------------------------
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Space: 'a', Enter: 'a', NumpadEnter: 'a', KeyJ: 'a',
  KeyX: 'b', Escape: 'b', Backspace: 'b', KeyK: 'b',
  KeyM: 'menu', Tab: 'menu', ShiftLeft: 'run', ShiftRight: 'run',
};
const Input = {
  held: {}, pressed: {}, repeatT: {},
  mouse: { x: -1, y: -1, moved: false, click: null, active: false },
  anyPressed: false,
  press(act) { if (!this.held[act]) { this.pressed[act] = true; this.repeatT[act] = 0; this.anyPressed = true; } this.held[act] = true; Audio2.unlock(); },
  release(act) { this.held[act] = false; },
  // 메뉴용 반복 입력
  rep(act, dt) {
    if (this.pressed[act]) return true;
    if (!this.held[act]) return false;
    this.repeatT[act] = (this.repeatT[act] || 0) + dt;
    if (this.repeatT[act] > 0.32) { this.repeatT[act] -= 0.075; return true; }
    return false;
  },
  endFrame() { this.pressed = {}; this.anyPressed = false; this.mouse.moved = false; this.mouse.click = null; },
  clear() { this.held = {}; this.pressed = {}; },
};
window.addEventListener('keydown', e => {
  const act = KEYMAP[e.code];
  if (act) { e.preventDefault(); if (!e.repeat) Input.press(act); }
  else if (!e.repeat) { Input.anyPressed = true; Audio2.unlock(); }
});
window.addEventListener('keyup', e => { const act = KEYMAP[e.code]; if (act) Input.release(act); });
window.addEventListener('blur', () => Input.clear());
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  if (window.MobileField && MobileField.portrait && UI.busy()) return MobileField.uiPoint(e, r);
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('mousemove', e => { const p = toLogical(e); Input.mouse.x = p.x; Input.mouse.y = p.y; Input.mouse.moved = true; Input.mouse.active = true; });
canvas.addEventListener('mousedown', e => { const p = toLogical(e); Input.mouse.x = p.x; Input.mouse.y = p.y; Input.mouse.click = p; Input.anyPressed = true; Audio2.unlock(); });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); Input.press('b'); setTimeout(() => Input.release('b'), 60); });
// 휠은 메뉴·목록 스크롤 전용 (필드에서 캐릭터가 걸어가지 않도록)
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (typeof Scene !== 'undefined' && typeof World !== 'undefined' && Scene === World && !UI.busy()) return;
  const a = e.deltaY > 0 ? 'down' : 'up'; Input.pressed[a] = true;
}, { passive: false });

// 터치 가상 패드
function setupTouchPad() {
  const pad = document.getElementById('touchpad');
  if (!pad) return;
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) return;
  pad.style.display = 'block';
  pad.querySelectorAll('[data-act]').forEach(btn => {
    const act = btn.dataset.act;
    const on = e => { e.preventDefault(); Input.press(act); btn.classList.add('on'); };
    const off = e => { e.preventDefault(); Input.release(act); btn.classList.remove('on'); };
    btn.addEventListener('touchstart', on, { passive: false });
    btn.addEventListener('touchend', off, { passive: false });
    btn.addEventListener('touchcancel', off, { passive: false });
  });
}

// ---------------------------------------------------------------------
//  오디오 (HTMLAudio 기반: file:// 에서도 동작) + WebAudio 합성음
// ---------------------------------------------------------------------
const Settings = {
  bgm: 0.55, sfx: 0.8, voice: 0.9, textSpeed: 2, runDefault: false, questTracker: true, difficulty: 1, touchStyle: 'modern',
  load() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem('racketmon_settings') || '{}') || {}; } catch (e) { }
    const vol = (v, def) => Number.isFinite(+v) && v !== null && v !== '' ? clamp(+v, 0, 1) : def;
    this.bgm = vol(d.bgm, this.bgm); this.sfx = vol(d.sfx, this.sfx); this.voice = vol(d.voice, this.voice);
    if (Number.isFinite(+d.textSpeed) && d.textSpeed !== null) this.textSpeed = clamp(Math.round(+d.textSpeed), 1, 4);
    if (typeof d.runDefault === 'boolean') this.runDefault = d.runDefault;
    if (typeof d.questTracker === 'boolean') this.questTracker = d.questTracker;
    if (['modern', 'buttons'].includes(d.touchStyle)) this.touchStyle = d.touchStyle;
    if (Number.isInteger(d.difficulty)) this.difficulty = clamp(d.difficulty, 0, 2);
  },
  save() { try { localStorage.setItem('racketmon_settings', JSON.stringify({ bgm: this.bgm, sfx: this.sfx, voice: this.voice, textSpeed: this.textSpeed, runDefault: this.runDefault, questTracker: this.questTracker, difficulty: this.difficulty, touchStyle: this.touchStyle })); } catch (e) { } },
};
Settings.load();

const Audio2 = {
  ctx: null, unlocked: false,
  bgmA: null, bgmKey: null, bgmVol: 1, fading: [],
  pools: {}, voiceEl: null, duck: 1,
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // 효과음 버스: 게인(덕킹 연동) → 컴프레서 → 출력 (겹치는 폭발음 클리핑 방지)
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(comp); comp.connect(this.ctx.destination);
    } catch (e) { }
    if (this.ctx) ['atk_elec', 'atk_energy', 'atk_laser', 'atk_light', 'atk_quake', 'atk_rifle', 'atk_swing', 'badge', 'battle_start', 'buy', 'catch', 'catch_ss', 'charge', 'cloth', 'coin', 'confirm', 'door', 'encounter', 'explosion', 'explosion_big', 'fireball', 'flame', 'footstep', 'heal', 'hit_elec', 'hit_fire', 'hit_gun', 'hit_gun_big', 'hit_ice', 'hit_phy', 'hit_phy_big', 'hit_robot', 'hit_slash', 'hit_smash', 'ice', 'item_get', 'levelup', 'lightning', 'like', 'question', 'rise', 'save', 'shake', 'shield', 'shine', 'snap', 'spark', 'stage_in', 'warning', 'water', 'whoosh', 'win_jingle', 'win_sfx'].forEach(k => this.loadBuf(k));
    if (this.pendingBgm) { const p = this.pendingBgm; this.pendingBgm = null; this.bgm(p.key, p.opt); }
    if (this.pendingAmb) { const k = this.pendingAmb; this.pendingAmb = null; this.ambient(k); }
  },
  bgm(key, opt = {}) {
    if (!this.unlocked) { this.pendingBgm = { key, opt }; return; }
    if (this.bgmKey === key && this.bgmA && !opt.restart) return;
    const old = this.bgmA;
    if (old) this.fadeOut(old, opt.fadeOut != null ? opt.fadeOut : 600);
    this.bgmKey = key;
    if (!key) { this.bgmA = null; return; }
    const a = new Audio('assets/bgm/' + key + '.mp3');
    a.loop = opt.loop !== false;
    a.volume = 0;
    a._target = 1;
    a.play().catch(() => { });
    this.bgmA = a;
    const fin = opt.fadeIn != null ? opt.fadeIn : 500;
    let t = 0;
    Tick.add(dt => { if (this.bgmA !== a) return false; t += dt * 1000; a._target = clamp(t / Math.max(1, fin), 0, 1); this.applyVol(a); if (t >= fin) return false; });
    if (opt.onEnd) a.addEventListener('ended', opt.onEnd);
  },
  applyVol(a) { a.volume = clamp(a._target * Settings.bgm * this.duck * this.voiceDuck, 0, 1); },
  fadeOut(a, ms) {
    let t = 0; const start = a._target;
    Tick.add(dt => { t += dt * 1000; a._target = start * (1 - clamp(t / Math.max(1, ms), 0, 1)); this.applyVol(a); if (t >= ms) { a.pause(); return false; } });
  },
  stopBgm(ms = 500) { if (this.bgmA) this.fadeOut(this.bgmA, ms); this.bgmA = null; this.bgmKey = null; },
  setDuck(v) { this.duck = v; if (this.bgmA) this.applyVol(this.bgmA); this.refreshAmbient(); if (this.sfxBus) try { this.sfxBus.gain.setTargetAtTime(0.6 + 0.4 * v, this.ctx.currentTime, 0.05); } catch (e) { } },
  refreshVolume() { if (this.bgmA) this.applyVol(this.bgmA); this.refreshAmbient(); },
  voiceDuck: 1,
  refreshAmbient() {
    const k = this.duck;
    if (this.ambEl && this.ambEl._base != null) this.ambEl.volume = clamp(this.ambEl._base * Settings.sfx * k, 0, 1);
    if (this.ambNodes && this.ctx) { try { this.ambNodes.g.gain.setTargetAtTime(0.07 * Settings.sfx * k, this.ctx.currentTime, 0.2); } catch (e) { } }
  },
  // 효과음: WebAudio 버퍼(지연 없음, 동시 재생 무제한) 우선, 디코딩 전/실패 시 HTMLAudio
  buf: {},
  loadBuf(key) {
    if (this.buf[key] !== undefined || !this.ctx || location.protocol === 'file:') return;
    this.buf[key] = null;
    fetch('assets/sfx/' + key + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(ab => this.ctx.decodeAudioData(ab)).then(b => { this.buf[key] = b; }).catch(() => { this.buf[key] = false; });
  },
  sfx(key, vol = 1, rate = 1) {
    if (!this.unlocked) return;
    this.loadBuf(key);
    const b = this.buf[key];
    if (b && this.ctx) {
      try {
        const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
        src.buffer = b; src.playbackRate.value = rate;
        g.gain.value = clamp(vol * Settings.sfx, 0, 1);
        src.connect(g); g.connect(this.sfxBus || this.ctx.destination); src.start();
        return src;
      } catch (e) { }
    }
    let pool = this.pools[key];
    if (!pool) pool = this.pools[key] = [];
    let a = pool.find(x => x.paused || x.ended);
    if (!a) { if (pool.length >= 5) a = pool[0]; else { a = new Audio('assets/sfx/' + key + '.mp3'); pool.push(a); } }
    try { a.currentTime = 0; } catch (e) { }
    a.volume = clamp(vol * Settings.sfx, 0, 1);
    a.preservesPitch = false; a.playbackRate = rate;
    a.play().catch(() => { });
    return a;
  },
  voice(key, tag, vol = 1) {
    if (!this.unlocked || !key || SPECIES[key]?.noVoice) return;
    if (this.voiceEl) { const old = this.voiceEl; let t = 0; const v0 = old.volume; Tick.add(dt => { t += dt; old.volume = Math.max(0, v0 * (1 - t / 0.15)); if (t >= 0.15) { old.pause(); return false; } }); }
    const a = new Audio('assets/voice/' + key + '_' + tag + '.mp3');
    a.volume = clamp(vol * Settings.voice, 0, 1);
    a.onerror = () => { };
    a.play().catch(() => { });
    this.voiceEl = a;
    // 음성 재생 중 BGM을 살짝 낮춘다
    this.voiceDuck = 0.6; if (this.bgmA) this.applyVol(this.bgmA);
    const restore = () => { if (this.voiceEl === a) { this.voiceDuck = 1; if (this.bgmA) this.applyVol(this.bgmA); } };
    a.addEventListener('ended', restore); a.addEventListener('error', restore); a.addEventListener('pause', restore);
    return a;
  },
  // 탭이 가려지면 소리를 멈추고, 돌아오면 이어서 재생한다
  setHidden(h) {
    const els = [this.bgmA, this.ambEl, this.voiceEl].filter(Boolean);
    if (h) {
      this._resume = els.filter(a => !a.paused);
      this._resume.forEach(a => { try { a.pause(); } catch (e) { } });
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => { });
    } else {
      (this._resume || []).forEach(a => { if (a === this.bgmA || a === this.ambEl) a.play().catch(() => { }); });
      this._resume = null;
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => { });
    }
  },
  // ---- 환경음 루프 ----
  ambKind: null, ambEl: null, ambNodes: null,
  ambient(kind) {
    if (!this.unlocked) { this.pendingAmb = kind; return; }
    if (this.ambKind === kind) return;
    this.ambKind = kind;
    if (this.ambEl) { const el = this.ambEl; let t = 0; const v0 = el.volume; Tick.add(dt => { t += dt; el.volume = Math.max(0, v0 * (1 - t / 0.6)); if (t >= 0.6) { el.pause(); return false; } }); this.ambEl = null; }
    if (this.ambNodes) { const n = this.ambNodes; try { n.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); setTimeout(() => { try { n.src.stop(); n.lfo.stop(); } catch (e) { } }, 900); } catch (e) { } this.ambNodes = null; }
    if (!kind) return;
    if (kind === 'sea' && this.ctx) {
      // 파도: 브라운 노이즈 + 느린 스웰
      const c = this.ctx, len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const g = c.createGain(); g.gain.value = 0;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.12; const lg = c.createGain(); lg.gain.value = 0.05 * Settings.sfx;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(c.destination);
      g.gain.setTargetAtTime(0.07 * Settings.sfx, c.currentTime, 0.8);
      src.start(); lfo.start();
      this.ambNodes = { src, lfo, g };
      return;
    }
    const file = { wind: 'amb_wind', hum: 'amb_hum' }[kind];
    if (!file) return;
    const a = new Audio('assets/sfx/' + file + '.mp3'); a.loop = true; a.volume = 0;
    a.play().catch(() => { });
    this.ambEl = a;
    a._base = kind === 'hum' ? 0.35 : 0.3;
    let t = 0; Tick.add(dt => { if (this.ambEl !== a) return false; t += dt; a.volume = Math.min(1, a._base * Settings.sfx * this.duck * Math.min(1, t / 1.2)); if (t >= 1.2) return false; });
  },
  // ---- 합성 효과음 ----
  tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol * Settings.sfx, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.2, filterFreq = 1200, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = c.createGain(); g.gain.value = vol * Settings.sfx;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0);
  },
  cursor() { this.tone(1320, 0.04, 'triangle', 0.06); },
  select() { this.tone(880, 0.05, 'triangle', 0.08); this.tone(1320, 0.08, 'triangle', 0.07, 0, 0.05); },
  cancel() { this.tone(660, 0.06, 'triangle', 0.07); this.tone(440, 0.08, 'triangle', 0.06, 0, 0.05); },
  bump() { this.tone(110, 0.09, 'triangle', 0.18, -40); },
  textBlip() { this.tone(1500 + Math.random() * 120, 0.018, 'triangle', 0.022); },
  lowHp() { this.tone(1500, 0.07, 'square', 0.035); this.tone(1500, 0.07, 'square', 0.035, 0, 0.14); },
  ballShake() { this.tone(300, 0.06, 'triangle', 0.2, -100); this.noise(0.05, 0.12, 2400); },
  ballClick() { this.tone(1800, 0.04, 'square', 0.08); this.tone(2400, 0.06, 'square', 0.06, 0, 0.04); },
  exclaim() { this.tone(1046, 0.08, 'square', 0.08); this.tone(1568, 0.12, 'square', 0.08, 0, 0.08); },
  expTick() { this.tone(1900 + Math.random() * 200, 0.03, 'sine', 0.04); },
  jingle(notes, step = 0.12, type = 'square', vol = 0.07) {
    notes.forEach((n, i) => { if (n) this.tone(n, step * 1.6, type, vol, 0, i * step); });
  },
};
document.addEventListener('visibilitychange', () => { try { Audio2.setHidden(document.hidden); } catch (e) { } });

// ---------------------------------------------------------------------
//  에셋 로더
// ---------------------------------------------------------------------
const IMG = { full: {}, icon: {}, bg: {}, room: {}, bld: {} };
const _lazy = {};
// 필요할 때 불러오는 이미지 (스킨 진화 형태 / 중파 일러스트)
// 같은 파일명으로 교체한 그림은 브라우저 캐시에 옛 그림이 남으므로 여기에 번호를 올려 새로 받게 한다
const ASSET_REV = { 'full/constantia': 3 };
const assetUrl = (cat, name) => 'assets/' + cat + '/' + name + '.webp' + (ASSET_REV[cat + '/' + name] ? '?r=' + ASSET_REV[cat + '/' + name] : '');
function lazyImg(cat, name) {
  const im = IMG[cat][name];
  if (im) return im._bad ? null : im;
  const k = cat + '/' + name;
  if (!_lazy[k]) { _lazy[k] = 1; loadImage(assetUrl(cat, name)).then(i => { IMG[cat][name] = i; }); }
  return null;
}
function loadImage(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => { i._bad = true; res(i); }; if (window.PACKED) PACKED.setSrc(i, src); else i.src = src; });
}
async function loadAssets(onProgress) {
  const jobs = [];
  const keys = Object.keys(ASSET_SIZES);
  for (const k of keys) {
    jobs.push(['full', k, assetUrl('full', k)]);
    jobs.push(['icon', k, 'assets/icon/' + k + '.webp']);
  }
  for (const b of ['base', 'route', 'forest', 'town', 'coast', 'cliff', 'nest', 'nightcliff', 'lighttower', 'hangar', 'camp', 'beach', 'sky', 'hospital', 'px'])
    jobs.push(['bg', b, 'assets/bg/' + b + '.jpg']);
  let done = 0;
  const N = 8; let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const [cat, k, src] = jobs[idx++];
      IMG[cat][k] = await loadImage(src);
      done++; onProgress && onProgress(done / jobs.length);
    }
  }
  await Promise.all(Array.from({ length: N }, worker));
}

// ---------------------------------------------------------------------
//  그리기 유틸
// ---------------------------------------------------------------------
function font(size, weight = 500, family = FONT) { return `${weight} ${size}px ${family}`; }
function txt(str, x, y, o = {}) {
  ctx.font = font(o.size || 20, o.weight || 600, o.family || FONT);
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.shadow !== false) {
    ctx.fillStyle = o.shadowColor || 'rgba(0,0,0,0.55)';
    ctx.fillText(str, x + (o.sx || 0), y + (o.sy != null ? o.sy : 2));
  }
  if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeColor || '#000'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(str, x, y);
}
function measure(str, size = 20, weight = 600) { ctx.font = font(size, weight); return ctx.measureText(str).width; }
function wrapText(str, maxW, size = 22, weight = 600) {
  ctx.font = font(size, weight);
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) { out.push(line); line = ''; }
      // 단어 자체가 길면 글자 단위로 자른다
      let cur = '';
      for (const ch of w) {
        if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch;
      }
      line = cur;
    }
    out.push(line);
  }
  return out;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
// 모서리를 사선으로 깎은 라스트오리진풍 패널 경로
function chamfer(x, y, w, h, c = 12) {
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x, y + h); ctx.lineTo(x, y + c); ctx.closePath();
}
const UI_COL = {
  panel: 'rgba(10,18,34,0.92)', panel2: 'rgba(16,30,54,0.95)', line: '#38e1ff', line2: 'rgba(56,225,255,0.35)',
  accent: '#ffb22e', text: '#eaf6ff', sub: '#8fb3c9', sel: 'rgba(56,225,255,0.18)', red: '#ff4d5e', green: '#5dff9c',
};
function panel(x, y, w, h, o = {}) {
  const c = o.c != null ? o.c : 14;
  ctx.save();
  chamfer(x, y, w, h, c);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, o.top || 'rgba(18,34,60,0.95)');
  g.addColorStop(1, o.bottom || 'rgba(7,13,26,0.95)');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  // 스캔라인 패턴
  ctx.globalAlpha = 0.06; ctx.fillStyle = '#9fe9ff';
  for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.save();
  chamfer(x + 0.5, y + 0.5, w - 1, h - 1, c);
  ctx.strokeStyle = o.border || UI_COL.line2; ctx.lineWidth = 1.5; ctx.stroke();
  // 코너 강조선
  ctx.strokeStyle = o.accent || UI_COL.line; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 1, y + c + 18); ctx.lineTo(x + 1, y + c); ctx.lineTo(x + c, y + 1); ctx.lineTo(x + c + 26, y + 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - 1, y + h - c - 18); ctx.lineTo(x + w - 1, y + h - c); ctx.lineTo(x + w - c, y + h - 1); ctx.lineTo(x + w - c - 26, y + h - 1); ctx.stroke();
  ctx.restore();
}
function headerBar(x, y, w, label, o = {}) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + 34); ctx.lineTo(x, y + 34); ctx.closePath();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, o.color || '#0fb8de'); g.addColorStop(1, o.color2 || 'rgba(15,184,222,0.15)');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  txt(label, x + 14, y + 25, { size: 20, weight: 800, color: '#fff' });
}
function bar(x, y, w, h, ratio, colors, o = {}) {
  ctx.save();
  rrect(x, y, w, h, h / 2); ctx.fillStyle = o.bg || 'rgba(0,0,0,0.6)'; ctx.fill();
  const rw = Math.max(0, w * clamp(ratio, 0, 1));
  if (rw > 0) {
    rrect(x, y, rw, h, h / 2);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    ctx.fillStyle = g; ctx.fill();
    ctx.globalAlpha = 0.35; rrect(x + 2, y + 1, Math.max(0, rw - 4), h * 0.35, h * 0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  }
  rrect(x, y, w, h, h / 2); ctx.strokeStyle = o.border || 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function hpColors(r) { return r > 0.5 ? ['#7dffb0', '#16c46a'] : r > 0.2 ? ['#ffe27a', '#e6a800'] : ['#ff8a8a', '#e0213a']; }
function typeBadge(type, x, y, w = 56, h = 22, size = 14) {
  const t = TYPES[type]; if (!t) return;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 6, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, t.color); g.addColorStop(1, t.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  txt(t.name, x + w / 2, y + h / 2 + size * 0.36, { size, weight: 800, align: 'center', color: '#fff', shadowColor: 'rgba(0,0,0,0.6)', sy: 1 });
}
function rankBadge(rank, x, y, s = 26) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s, y + s / 2); ctx.lineTo(x + s / 2, y + s); ctx.lineTo(x, y + s / 2); ctx.closePath();
  ctx.fillStyle = RANK_COLOR[rank] || '#fff'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  txt(rank, x + s / 2, y + s / 2 + s * 0.18, { size: rank.length > 1 ? s * 0.42 : s * 0.5, weight: 900, align: 'center', color: '#1a1030', shadow: false });
}
function statusBadge(st, x, y) {
  const s = STATUS[st]; if (!s) return;
  rrect(x, y, 46, 20, 4); ctx.fillStyle = s.color; ctx.fill();
  txt(s.short, x + 23, y + 15, { size: 13, weight: 800, align: 'center', color: '#1a1a1a', shadow: false });
}
// 이미지를 박스에 맞춰 그리기 (anchor: 'bottom' | 'center')
function drawFit(img, x, y, w, h, o = {}) {
  if (!img || img._bad || !img.width) return null;
  const s = Math.min(w / img.width, h / img.height) * (o.scale || 1);
  const dw = img.width * s, dh = img.height * s;
  const dx = x + (w - dw) / 2;
  const dy = o.anchor === 'top' ? y : o.anchor === 'center' ? y + (h - dh) / 2 : y + h - dh;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.flip) { ctx.translate(dx + dw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(dx + dw / 2), 0); }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return { x: dx, y: dy, w: dw, h: dh };
}
function iconCircle(key, cx, cy, r, o = {}) {
  const img = IMG.icon[key] || lazyImg('icon', key);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = o.bg || '#1b2a44'; ctx.fill();
  ctx.clip();
  if (img && !img._bad) {
    if (o.silhouette) { ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.6; }
    else if (o.gray) ctx.filter = 'grayscale(1) brightness(0.7)';
    const z = o.zoom || 1.0;
    ctx.drawImage(img, cx - r * z, cy - r * z + (o.dy || 0), r * 2 * z, r * 2 * z);
    ctx.filter = 'none'; ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (o.border !== false) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = o.border || '#fff'; ctx.lineWidth = o.lw || 2; ctx.stroke();
  }
}
function iconSquare(key, x, y, s, o = {}) {
  const img = IMG.icon[key] || lazyImg('icon', key);
  ctx.save();
  chamfer(x, y, s, s, s * 0.14); ctx.fillStyle = o.bg || '#1b2a44'; ctx.fill(); ctx.clip();
  if (img && !img._bad) {
    if (o.silhouette) ctx.filter = 'brightness(0) opacity(0.55)';
    else if (o.gray) ctx.filter = 'grayscale(1) brightness(0.6)';
    ctx.drawImage(img, x, y, s, s); ctx.filter = 'none';
  }
  ctx.restore();
  chamfer(x + 0.5, y + 0.5, s - 1, s - 1, s * 0.14); ctx.strokeStyle = o.border || 'rgba(56,225,255,0.6)'; ctx.lineWidth = o.lw || 1.5; ctx.stroke();
}

// 아이템 아이콘 (절차적)
function itemIcon(id, cx, cy, s = 28) {
  ctx.save(); ctx.translate(cx, cy);
  const k = ITEMS[id] ? ITEMS[id].icon : id;
  if (k.startsWith('core')) {
    const col = k === 'core' ? ['#5ff4ff', '#0a6c9c'] : k === 'core2' ? ['#ffd25f', '#b0570a'] : ['#ff7bd1', '#7a1a9c'];
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; ctx.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5); }
    ctx.closePath();
    const g = ctx.createRadialGradient(-s * 0.1, -s * 0.15, 1, 0, 0, s * 0.55); g.addColorStop(0, '#fff'); g.addColorStop(0.35, col[0]); g.addColorStop(1, col[1]);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.14, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
  } else if (k.startsWith('kit')) {
    const col = k === 'kit' ? '#4be38a' : k === 'kit2' ? '#3fb6ff' : '#ff5fa2';
    rrect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.64, 5); ctx.fillStyle = '#f2f6fa'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(-s * 0.07, -s * 0.22, s * 0.14, s * 0.44); ctx.fillRect(-s * 0.22, -s * 0.07, s * 0.44, s * 0.14);
  } else if (k === 'schip') {
    // 스킨 데이터 칩: 칩마다 테마 색
    const c = (ITEMS[id] && ITEMS[id].color) || '#7fffd4';
    rrect(-s * 0.4, -s * 0.3, s * 0.8, s * 0.6, 4); ctx.fillStyle = '#1b2433'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = c; for (let i = 0; i < 4; i++) { ctx.fillRect(-s * 0.3 + i * s * 0.18, -s * 0.42, 3, s * 0.12); ctx.fillRect(-s * 0.3 + i * s * 0.18, s * 0.3, 3, s * 0.12); }
    ctx.beginPath(); ctx.moveTo(0, -s * 0.16); ctx.lineTo(s * 0.14, 0); ctx.lineTo(0, s * 0.16); ctx.lineTo(-s * 0.14, 0); ctx.closePath(); ctx.fill();
  } else if (k === 'chip') {
    rrect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72, 4); ctx.fillStyle = '#2b3a4f'; ctx.fill(); ctx.strokeStyle = '#7fffd4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7fffd4'; for (let i = -1; i <= 1; i++) { ctx.fillRect(i * s * 0.2 - 1.5, -s * 0.5, 3, s); ctx.fillRect(-s * 0.5, i * s * 0.2 - 1.5, s, 3); }
    rrect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4, 3); ctx.fillStyle = '#123'; ctx.fill();
  } else if (k === 'revive') {
    ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.5); ctx.lineTo(s * 0.32, -s * 0.05); ctx.lineTo(s * 0.04, -s * 0.05); ctx.lineTo(s * 0.12, s * 0.5); ctx.lineTo(-s * 0.32, 0); ctx.lineTo(-s * 0.04, 0); ctx.closePath();
    ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.strokeStyle = '#a06a00'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (k === 'cell') {
    rrect(-s * 0.22, -s * 0.42, s * 0.44, s * 0.84, 4); ctx.fillStyle = '#1f2f45'; ctx.fill(); ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffb22e'; ctx.fillRect(-s * 0.1, -s * 0.5, s * 0.2, s * 0.1);
    for (let i = 0; i < 3; i++) ctx.fillRect(-s * 0.14, s * 0.18 - i * s * 0.2, s * 0.28, s * 0.12);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  파티클
// ---------------------------------------------------------------------
const Particles = {
  list: [],
  add(p) { p.life = p.life || 0.6; p.t = 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.g = p.g || 0; p.size = p.size || 4; p.drag = p.drag || 1; this.list.push(p); return p; },
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(o.speed * 0.4, o.speed);
      this.add(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }, o, { size: rand(o.size * 0.5, o.size), life: rand(o.life * 0.6, o.life), color: Array.isArray(o.color) ? pick(o.color) : o.color }));
    }
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt; if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot != null) p.rot += (p.vr || 0) * dt;
    }
  },
  draw() {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      ctx.save();
      ctx.globalAlpha = (p.alpha != null ? p.alpha : 1) * (p.fade === false ? 1 : k);
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color || '#fff';
      const sz = p.shrink === false ? p.size : p.size * (0.3 + 0.7 * k);
      if (p.shape === 'line') {
        ctx.strokeStyle = p.color; ctx.lineWidth = sz; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.shape === 'square') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      } else if (p.shape === 'star') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? sz * 0.45 : sz; const a = i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * (p.grow || 4)), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },
  clear() { this.list.length = 0; },
};

// 화면 흔들림 / 플래시
const FX = {
  shake: 0, shakeMag: 0, flash: 0, flashColor: '#fff',
  doShake(mag = 8, dur = 0.3) { this.shakeMag = mag; this.shake = dur; },
  doFlash(color = '#fff', a = 0.8) { this.flashColor = color; this.flash = a; },
  update(dt) { this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt * 2.5); },
  offset() { if (this.shake <= 0) return [0, 0]; const m = this.shakeMag * (this.shake / 0.3); return [rand(-m, m), rand(-m, m)]; },
  drawFlash() { if (this.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, this.flash); ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, W, H); ctx.restore(); } },
};
