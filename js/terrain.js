// =====================================================================
//  야외 지형 렌더러: 노이즈 질감 + 유기적인 경계(마스크 블러/임계값)로 바닥 레이어를 그린다.
//  World.buildLayer 에서 실내가 아닌 맵에 사용. 결과는 맵 전체 크기의 캔버스 1장.
// =====================================================================
const Terrain = (() => {
  const TEX = {};
  // ---- 타일링 가능한 값 노이즈 ----
  function h3(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h = Math.imul(h ^ (h >>> 16), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967295; }
  function vnoise(x, y, p, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = k => ((k % p) + p) % p;
    const a = h3(m(xi), m(yi), s), b = h3(m(xi + 1), m(yi), s), c = h3(m(xi), m(yi + 1), s), d = h3(m(xi + 1), m(yi + 1), s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // x, y: 0..1 (타일 한 장 기준), base: 최저 주기
  function fbm(x, y, base, oct, s) { let f = 0, amp = 0.5, p = base, tot = 0; for (let i = 0; i < oct; i++) { f += vnoise(x * p, y * p, p, s + i * 17) * amp; tot += amp; amp *= 0.5; p *= 2; } return f / tot; }
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // 질감 캔버스 (논리 크기 L, 픽셀 크기 L*S)
  function tex(key, L, S, pix, post) {
    const k = key + '@' + S;
    if (TEX[k]) return TEX[k];
    const N = Math.round(L * S), c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const col = pix(x / N, y / N, x, y), i = (y * N + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (post) { g.save(); g.scale(N / L, N / L); post(g, L); g.restore(); }
    // 가장자리를 넘어가는 스트로크를 반대편에도 (타일링)
    TEX[k] = c; return c;
  }
  // 경계를 넘는 붓질을 9방향으로 반복해 이음매 없이
  function wrapDraw(g, L, fn) { for (const ox of [-L, 0, L]) for (const oy of [-L, 0, L]) { g.save(); g.translate(ox, oy); fn(g); g.restore(); } }
  function strokes(g, L, n, seed, cols, len, w, ang) {
    const pts = []; for (let i = 0; i < n; i++) pts.push([h3(i, 1, seed) * L, h3(i, 2, seed) * L, h3(i, 3, seed)]);
    wrapDraw(g, L, g2 => {
      g2.lineCap = 'round';
      for (const [x, y, r] of pts) {
        g2.strokeStyle = cols[Math.floor(r * cols.length)]; g2.lineWidth = w * (0.6 + r * 0.6);
        const a = ang + (r - 0.5) * 0.9, l = len * (0.5 + r);
        const ex = x + Math.cos(a) * l * 0.5; g2.beginPath(); g2.moveTo(x, y); g2.quadraticCurveTo(x + (ex - x) * 0.2, y - l * 0.6, ex, y - l); g2.stroke();
      }
    });
  }
  function dots(g, L, n, seed, cols, r0, r1) {
    const pts = []; for (let i = 0; i < n; i++) pts.push([h3(i, 4, seed) * L, h3(i, 5, seed) * L, h3(i, 6, seed)]);
    wrapDraw(g, L, g2 => { for (const [x, y, r] of pts) { g2.fillStyle = cols[Math.floor(r * cols.length)]; g2.beginPath(); g2.ellipse(x, y, r0 + (r1 - r0) * r, (r0 + (r1 - r0) * r) * 0.7, r * 3, 0, 7); g2.fill(); } });
  }

  // ---- 재질 ----
  const MAT = {
    grass(th, S) {
      const a = hex(th.grass[1]), dk = shadeC(a, 0.78), lt = mix(a, [255, 255, 200], 0.18);
      return tex('grass' + th.grass[1], 192, S, (u, v) => {
        const n = fbm(u, v, 4, 4, 11), m = fbm(u, v, 16, 2, 33);
        let c = n < 0.5 ? mix(dk, a, n * 2) : mix(a, lt, (n - 0.5) * 2);
        return mix(c, shadeC(c, 0.9), m * 0.6);
      }, (g, L) => {
        strokes(g, L, 260, 7, ['rgba(20,60,15,0.32)', 'rgba(30,80,20,0.25)', 'rgba(210,255,170,0.22)', 'rgba(255,255,210,0.14)'], 6, 1.4, Math.PI / 2);
        dots(g, L, 40, 9, ['rgba(255,255,220,0.18)', 'rgba(0,40,0,0.12)'], 1, 2.2);
      });
    },
    grassDeep(th, S) {
      const a = shadeC(hex(th.grass[1]), 0.55), lt = shadeC(hex(th.grass[1]), 0.8);
      return tex('grassD' + th.grass[1], 160, S, (u, v) => mix(a, lt, fbm(u, v, 6, 3, 21)), (g, L) => {
        strokes(g, L, 420, 17, ['rgba(10,45,10,0.45)', 'rgba(25,80,25,0.4)', 'rgba(150,220,110,0.28)'], 9, 1.8, Math.PI / 2);
      });
    },
    dirt(th, S) {
      const a = hex(th.path), dk = hex(th.pathEdge || '#8e6a40');
      return tex('dirt' + th.path, 160, S, (u, v) => {
        const n = fbm(u, v, 5, 4, 41), g = h3(Math.floor(u * 400), Math.floor(v * 400), 3);
        return shadeC(mix(dk, a, 0.45 + n * 0.6), 0.94 + g * 0.1);
      }, (g, L) => {
        dots(g, L, 70, 43, ['rgba(90,60,30,0.35)', 'rgba(255,240,200,0.35)', 'rgba(120,90,60,0.4)'], 1.2, 3.2);
        strokes(g, L, 30, 44, ['rgba(80,55,25,0.18)'], 14, 1, 0.2);
      });
    },
    sand(th, S) {
      const a = hex(th.sand || '#ead6a0');
      return tex('sand' + (th.sand || ''), 192, S, (u, v) => {
        const n = fbm(u, v, 4, 3, 51), g = h3(Math.floor(u * 600), Math.floor(v * 600), 5);
        const rip = Math.sin((v * 12 + fbm(u, v, 3, 2, 52) * 3) * Math.PI * 2) * 0.5 + 0.5;
        return shadeC(a, 0.9 + n * 0.12 + rip * 0.04 + (g - 0.5) * 0.08);
      }, (g, L) => dots(g, L, 30, 53, ['rgba(150,110,60,0.3)', 'rgba(255,255,255,0.45)'], 0.8, 2));
    },
    asphalt(th, S) {
      const a = hex(th.asphalt || '#5f646c');
      return tex('asph' + (th.asphalt || ''), 192, S, (u, v) => {
        const n = fbm(u, v, 3, 3, 61), g = h3(Math.floor(u * 700), Math.floor(v * 700), 7);
        return shadeC(a, 0.86 + n * 0.22 + (g - 0.5) * 0.16);
      }, (g, L) => {
        wrapDraw(g, L, g2 => {
          g2.strokeStyle = 'rgba(25,25,30,0.45)'; g2.lineWidth = 1;
          for (let i = 0; i < 5; i++) { let x = h3(i, 1, 66) * L, y = h3(i, 2, 66) * L; g2.beginPath(); g2.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (h3(i, k, 67) - 0.5) * 16; y += 6 + h3(i, k, 68) * 6; g2.lineTo(x, y); } g2.stroke(); }
        });
        dots(g, L, 30, 69, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.08)'], 2, 5);
      });
    },
    plaza(th, S) {
      const a = hex(th.plaza || '#cfc8b8');
      return tex('plaza' + (th.plaza || ''), 96, S, (u, v, px, py) => {
        const x = u * 4, y = v * 4, ry = Math.floor(y), rx = Math.floor(x + (ry % 2) * 0.5);
        const fx = (x + (ry % 2) * 0.5) - rx, fy = y - ry;
        const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
        const st = 0.92 + h3(((rx % 4) + 4) % 4, ry, 71) * 0.12, n = fbm(u, v, 8, 2, 72);
        let c = shadeC(a, st * (0.95 + n * 0.1));
        if (edge < 0.04) c = shadeC(a, 0.72); else if (fy < 0.1) c = shadeC(c, 1.05); else if (fy > 0.88) c = shadeC(c, 0.92);
        return c;
      });
    },
    water(th, S) {
      const a = hex(th.water[0]), b = hex(th.water[1]);
      return tex('water' + th.water[0], 192, S, (u, v) => {
        const n = fbm(u, v, 3, 4, 81), r = Math.abs(Math.sin((u * 3 + fbm(u, v, 4, 2, 82) * 1.5) * Math.PI * 2));
        return mix(b, a, n * 0.8 + (1 - r) * 0.2);
      });
    },
    snow(th, S) {
      return tex('snow', 192, S, (u, v) => {
        const n = fbm(u, v, 4, 4, 201), m = fbm(u, v, 12, 2, 202), g = h3(Math.floor(u * 500), Math.floor(v * 500), 9);
        return mix(mix([206, 220, 234], [246, 250, 253], n), [255, 255, 255], m * 0.3 + (g > 0.995 ? 0.8 : 0));
      }, (g, L) => dots(g, L, 30, 203, ['rgba(255,255,255,0.8)', 'rgba(150,175,205,0.25)'], 0.8, 2.4));
    },
    concrete(th, S) {
      return tex('concrete', 192, S, (u, v) => {
        const n = fbm(u, v, 4, 4, 211), g = h3(Math.floor(u * 600), Math.floor(v * 600), 11);
        const seam = (Math.abs(((u * 4) % 1) - 0.5) > 0.495 || Math.abs(((v * 4) % 1) - 0.5) > 0.495) ? 0.82 : 1;
        return shadeC(mix([120, 124, 116], [160, 162, 152], n), seam * (0.94 + g * 0.1));
      }, (g, L) => { dots(g, L, 40, 213, ['rgba(60,50,40,0.25)', 'rgba(90,110,60,0.25)'], 2, 7); strokes(g, L, 40, 214, ['rgba(40,40,40,0.35)'], 10, 1, 0.3); });
    },
    nest(th, S) {
      return tex('nest', 192, S, (u, v) => {
        const n = fbm(u, v, 4, 4, 91), w = fbm(u, v, 3, 3, 92), vein = Math.abs(w - 0.5) < 0.02 ? 1 : 0;
        return mix(mix([52, 34, 58], [92, 62, 98], n), [170, 40, 75], vein * 0.6);
      }, (g, L) => dots(g, L, 50, 93, ['rgba(0,0,0,0.3)', 'rgba(255,60,90,0.12)'], 2, 6));
    },
    flesh(th, S) {
      return tex('flesh', 128, S, (u, v) => mix([70, 14, 34], [140, 26, 56], fbm(u, v, 5, 3, 95)), (g, L) => strokes(g, L, 220, 96, ['rgba(255,70,100,0.35)', 'rgba(40,0,15,0.45)'], 8, 1.6, Math.PI / 2));
    },
    metal(th, S) {
      return tex('metal', 96, S, (u, v) => {
        const fx = (u * 2) % 1, fy = (v * 2) % 1, e = Math.min(fx, 1 - fx, fy, 1 - fy);
        const c = [140, 150, 162]; return e < 0.03 ? shadeC(c, 0.7) : shadeC(c, 0.95 + fbm(u, v, 6, 2, 97) * 0.1 + (fy < 0.06 ? 0.08 : 0));
      });
    },
  };

  // ---- 마스크 ----
  // R: 타일당 마스크 픽셀, blur: 블러 반경(마스크 px), thr: 임계값, jit: 노이즈로 경계 흔들기
  function rawMask(world, set, R, PAD) {
    const mw = (world.w + PAD * 2) * R, mh = (world.h + PAD * 2) * R, a = new Float32Array(mw * mh);
    for (let y = -PAD; y < world.h + PAD; y++) for (let x = -PAD; x < world.w + PAD; x++) {
      const c = world.tiles[clamp(y, 0, world.h - 1)][clamp(x, 0, world.w - 1)];
      if (!set.includes(c)) continue;
      for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) a[((y + PAD) * R + j) * mw + (x + PAD) * R + i] = 1;
    }
    return { a, mw, mh };
  }
  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = r * 2 + 1;
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * w + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / n; s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }
  function field(world, set, R, blur) {
    const PAD = 2, m = rawMask(world, set, R, PAD);
    let f = m.a; if (blur > 0) { f = boxBlur(f, m.mw, m.mh, blur); f = boxBlur(f, m.mw, m.mh, blur); }
    return { f, mw: m.mw, mh: m.mh, R, PAD };
  }
  // 임계값으로 알파 마스크 캔버스 생성 (부드러운 안티앨리어싱)
  function cut(F, thr, jit, seed, soft = 0.05) {
    const c = document.createElement('canvas'); c.width = F.mw; c.height = F.mh;
    const g = c.getContext('2d'), im = g.createImageData(F.mw, F.mh), d = im.data;
    for (let y = 0; y < F.mh; y++) for (let x = 0; x < F.mw; x++) {
      const i = y * F.mw + x; let v = F.f[i];
      if (v <= 0.001 || v >= 0.999) { if (v >= 0.999) { d[i * 4 + 3] = 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; } continue; }
      if (jit) v += (fbm(x / F.R / 8, y / F.R / 8, 8, 3, seed) - 0.5) * jit;
      const a = clamp((v - thr + soft) / (soft * 2), 0, 1);
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = a * 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  // 재질을 마스크 모양대로 레이어에 칠하기
  function paint(L, F, mask, fill, alpha = 1, off = 0) {
    const { g, S, cw, ch, tmp, tg } = L;
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, tmp.width, tmp.height);
    if (typeof fill === 'string') { tg.fillStyle = fill; tg.fillRect(0, 0, tmp.width, tmp.height); }
    else { tg.fillStyle = tg.createPattern(fill, 'repeat'); tg.fillRect(0, 0, tmp.width, tmp.height); }
    tg.globalCompositeOperation = 'destination-in';
    tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
    const p = F.PAD * F.R;
    tg.drawImage(mask, p, p, F.mw - p * 2, F.mh - p * 2, 0, off * S, tmp.width, tmp.height);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.drawImage(tmp, 0, 0); g.restore();
  }
  // 저주파 얼룩(밝기 변화)
  function blotches(L, world, seed, amt) {
    const c = document.createElement('canvas'); c.width = world.w + 2; c.height = world.h + 2;
    const g = c.getContext('2d');
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const n = fbm(x / 9, y / 9, 1, 3, seed) - 0.5;
      g.fillStyle = n > 0 ? `rgba(255,250,200,${n * amt})` : `rgba(0,20,0,${-n * amt * 1.3})`;
      g.fillRect(x, y, 1, 1);
    }
    L.g.save(); L.g.imageSmoothingEnabled = true; L.g.imageSmoothingQuality = 'high';
    L.g.drawImage(c, 1, 1, world.w, world.h, 0, 0, L.cw, L.ch); L.g.restore();
  }

  // 마스크 경계를 따라 장식 찍기 (경계 = thr 를 넘는 칸 중 이웃이 thr 미만)
  function edgePoints(F, thr, step, seed) {
    const pts = [], { f, mw, mh, R, PAD } = F;
    for (let y = 1; y < mh - 1; y += step) for (let x = 1; x < mw - 1; x += step) {
      const i = y * mw + x; if (f[i] < thr) continue;
      if (f[i - 1] >= thr && f[i + 1] >= thr && f[i - mw] >= thr && f[i + mw] >= thr) continue;
      if (h3(x, y, seed) < 0.45) continue;
      const gx = f[i + 1] - f[i - 1], gy = f[i + mw] - f[i - mw];
      pts.push({ x: (x / R - PAD) * TILE, y: (y / R - PAD) * TILE, nx: -gx, ny: -gy, r: h3(x, y, seed + 1) });
    }
    return pts;
  }
  function tuft(g, x, y, cols, k = 1, r = 0.5) {
    const n = 4 + Math.floor(r * 4);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.6 + (h3(i, x | 0, y | 0) - 0.5) * 0.4, l = (6 + h3(i, y | 0, 3) * 7) * k;
      g.strokeStyle = cols[i % cols.length]; g.lineWidth = 1.6 * k; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + (i - n / 2) * 1.5 * k, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.3, y - l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }
  function pebble(g, x, y, r, col) {
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, r * 1.2, r * 0.8, 0, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * 1.1, r * 0.75, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.25, r * 0.4, r * 0.25, 0, 0, 7); g.fill();
  }
  // 큰 지형 캔버스 전체에 blur 필터를 걸면 일부 안드로이드 폰에서 탭이 꺼진다(1번 폐도로 진입 크래시).
  // 그림자는 월드 1/2 해상도의 작은 캔버스에 그려 흐린 뒤 확대해 얹는다 (흐린 그림자라 차이가 거의 없다)
  function softShadow(g, fn, blur, alpha, cw, ch, S) {
    const k = 0.5, sc = document.createElement('canvas'); sc.width = Math.ceil(cw * k); sc.height = Math.ceil(ch * k);
    const sg = sc.getContext('2d'); sg.setTransform(k, 0, 0, k, 0, 0); sg.fillStyle = '#000'; fn(sg);
    const b = document.createElement('canvas'); b.width = sc.width; b.height = sc.height;
    const bg = b.getContext('2d'); try { bg.filter = 'blur(' + Math.max(1, blur / S * k * 2).toFixed(2) + 'px)'; } catch (e) { } bg.drawImage(sc, 0, 0);
    g.save(); g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.drawImage(b, 0, 0, cw, ch); g.restore();
    sc.width = sc.height = b.width = b.height = 0;
  }

  function build(world, th) {
    const cw = world.w * TILE, ch = world.h * TILE;
    // 폰: 긴 맵(1번 폐도로 24×40)은 지형 캔버스가 수백만 px이 되므로 약 450만 px로 묶는다
    const S = Math.min(SCALE, 2, LOW_MEM ? Math.sqrt(4.5e6 / (cw * ch)) : 9);
    const c = document.createElement('canvas'); c.width = Math.ceil(cw * S); c.height = Math.ceil(ch * S);
    const g = c.getContext('2d');
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
    const L = { g, S, cw, ch, tmp, tg: tmp.getContext('2d') };
    const R = 12, has = s => world.tiles.some(r => r.some(ch => s.includes(ch)));
    const nest = th === THEME.nest, edges = [];
    const gcols = th.snow ? ['#c6d3de', '#aebfcd', '#e9f1f6', '#93a6b6'] : th.concrete ? ['#5a6a3a', '#6f7f45', '#8a8a55', '#4a5530'] : th === THEME.forest ? ['#1f5a22', '#2f7a30', '#4c9a40', '#78c060'] : ['#3a7a2e', '#4f9a3c', '#6db752', '#9ad672'];
    // 바탕
    g.fillStyle = g.createPattern(nest ? MAT.nest(th, S) : th.snow ? MAT.snow(th, S) : th.concrete ? MAT.concrete(th, S) : MAT.grass(th, S), 'repeat'); g.fillRect(0, 0, c.width, c.height);
    g.setTransform(S, 0, 0, S, 0, 0);
    if (!nest) blotches(L, world, 5, th.snow ? 0.1 : 0.22);
    // 수풀 바닥 (짙은 풀)
    if (has('"')) { const F = field(world, '"', R, 3); paint(L, F, cut(F, 0.46, 0.7, 101, 0.12), MAT.grassDeep(th, S), 0.65); paint(L, F, cut(F, 0.55, 0.6, 104, 0.15), MAT.grassDeep(th, S), 0.5); }
    if (has('n')) { const F = field(world, 'n', R, 4); paint(L, F, cut(F, 0.42, 0.35, 102), MAT.flesh(th, S)); }
    // 모래
    if (has('s')) { const F = field(world, 's~', R, 5); paint(L, F, cut(F, 0.45, 0.3, 111), MAT.sand(th, S)); edges.push([F, 0.45, 'sand']); }
    // 흙길 (테두리 + 본체)
    if (has('_')) {
      const F = field(world, '_H', R, 4);
      paint(L, F, cut(F, 0.34, 0.25, 121), 'rgba(70,50,25,0.35)', 1, 1.5);
      paint(L, F, cut(F, 0.42, 0.25, 121), MAT.dirt(th, S));
      edges.push([F, 0.42, 'dirt']);
    }
    // 광장
    if (has(':')) {
      const F = field(world, ':', R, 2);
      paint(L, F, cut(F, 0.3, 0, 0), 'rgba(60,55,45,0.35)', 1, 2);
      paint(L, F, cut(F, 0.45, 0, 0, 0.08), MAT.plaza(th, S));
      edges.push([F, 0.45, 'plaza']);
    }
    // 도로 (연석 + 아스팔트 + 차선)
    if (has('=-')) {
      const F = field(world, '=-H', R, 2);
      paint(L, F, cut(F, 0.24, 0, 0, 0.02), 'rgba(30,30,30,0.35)', 1, 2);
      paint(L, F, cut(F, 0.26, 0, 0, 0.02), '#b9b4a8');
      paint(L, F, cut(F, 0.36, 0, 0, 0.02), '#8a857a');
      paint(L, F, cut(F, 0.42, 0, 0, 0.02), MAT.asphalt(th, S));
      edges.push([F, 0.26, 'road']);
      for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) if (world.tiles[y][x] === '-' && y % 2 === 0) {
        g.fillStyle = 'rgba(232,197,71,0.85)'; g.fillRect(x * TILE + 8, y * TILE + TILE - 3, 24, 4);
      }
    }
    // 물 (물가 → 물 → 깊은 물 → 거품)
    if (has('~')) {
      // 양옆이 물인 부두 칸은 물로 본다 (부두가 물 위에 떠 있도록)
      const wv = Object.assign(Object.create(world), { tiles: world.tiles.map((r, y) => r.map((c, x) => c === 'M' && (world.tiles[y][x - 1] === '~' || world.tiles[y][x + 1] === '~' || (world.tiles[y][x - 1] === 'M' && world.tiles[y][x - 2] === '~') || (world.tiles[y][x + 1] === 'M' && world.tiles[y][x + 2] === '~')) ? '~' : c)) });
      const F = field(wv, '~', R, 6);
      const shore = th.sand ? 'rgba(160,130,80,0.55)' : 'rgba(60,70,30,0.5)';
      paint(L, F, cut(F, 0.3, 0.25, 131), shore);
      // 둑: 북쪽 물가에 흙벽이 보이도록 물을 살짝 아래로
      paint(L, F, cut(F, 0.45, 0.25, 131, 0.03), th.sand ? '#8a6a3e' : '#4a3a24');
      paint(L, F, cut(F, 0.45, 0.25, 131, 0.03), 'rgba(0,0,0,0.25)', 1, 3);
      paint(L, F, cut(F, 0.45, 0.25, 131), MAT.water(th, S), 1, 7);
      paint(L, F, cut(F, 0.62, 0.3, 132, 0.12), 'rgba(10,40,90,0.3)', 1, 7);
      paint(L, F, cut(F, 0.8, 0.3, 133, 0.12), 'rgba(5,25,70,0.35)', 1, 7);
      paint(L, F, cut(F, 0.95, 0.3, 134, 0.1), 'rgba(0,15,50,0.3)', 1, 7);
      const ring = cut(F, 0.45, 0.25, 131), inner = cut(F, 0.53, 0.25, 131);
      const rg = ring.getContext('2d'); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(inner, 0, 0);
      paint(L, F, ring, 'rgba(255,255,255,0.55)', 1, 7);
      edges.push([F, 0.3, 'shore']);
    }
    // 금속 바닥(부두): 물 위에 그림자와 함께
    if (has('M') && !world.def.indoor) {
      const F = field(world, 'M', R, 1);
      paint(L, F, cut(F, 0.3, 0, 0), 'rgba(0,15,35,0.45)', 1, 8);
      paint(L, F, cut(F, 0.45, 0, 0, 0.04), '#4a5562', 1, 4);
      paint(L, F, cut(F, 0.45, 0, 0, 0.04), MAT.metal(th, S));
      for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) if (world.tiles[y][x] === 'M' && (world.tiles[y][x - 1] === '~' || world.tiles[y][x + 1] === '~')) {
        g.fillStyle = '#3a3026'; const px = world.tiles[y][x - 1] === '~' ? x * TILE + 2 : x * TILE + TILE - 8; g.fillRect(px, y * TILE + 30, 6, 22);
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(px - 3, y * TILE + 50, 12, 2);
      }
    }
    if (has('N') || nest) {
      // 둥지 바닥 혈관 무늬 강조
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25; g.strokeStyle = '#ff2a4a'; g.lineWidth = 1.5;
      for (let i = 0; i < world.w * world.h / 10; i++) {
        const x = hash2(i, 1, 9) * cw, y = hash2(i, 2, 9) * ch;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + rand(-30, 30), y + rand(-30, 30), x + rand(-30, 30), y + rand(-30, 30), x + rand(-50, 50), y + rand(-50, 50)); g.stroke();
      }
      g.restore();
    }
    // 나무 숲 가장자리 AO (접지 그늘)
    if (has('TP')) { const F = field(world, 'TP', R, 7); paint(L, F, cut(F, 0.1, 0.3, 141, 0.12), nest ? 'rgba(0,0,0,0.35)' : 'rgba(5,30,5,0.3)'); }
    if (has('X')) { const F = field(world, 'X', R, 6); paint(L, F, cut(F, 0.12, 0.4, 142, 0.14), 'rgba(0,0,0,0.38)'); paint(L, F, cut(F, 0.05, 0.4, 143, 0.2), 'rgba(120,10,30,0.18)'); }
    if (has('WR')) { const F = field(world, 'WR', R, 3); paint(L, F, cut(F, 0.15, 0.3, 144, 0.12), 'rgba(0,0,0,0.22)'); }
    // 경계 장식: 풀 삐침, 자갈, 물가 갈대·돌
    for (const [F, thr, kind] of edges) {
      for (const p of edgePoints(F, thr, kind === 'road' ? 5 : 3, 150 + kind.length)) {
        const ox = p.nx * 0.3, oy = p.ny * 0.3;
        if (kind === 'shore') { if (p.r < 0.25) pebble(g, p.x + ox * 20, p.y + oy * 20, 2 + p.r * 6, '#8d877c'); else if (p.r > 0.75 && !nest) tuft(g, p.x + ox * 30, p.y + oy * 30 + 6, ['#5a7a2a', '#7a9a3a', '#3e5e1e'], 1.4, p.r); continue; }
        if (kind === 'road' && p.r > 0.35) continue;
        if (nest) continue;
        if (p.r < (kind === 'dirt' ? 0.3 : 0.15)) pebble(g, p.x - ox * 8, p.y - oy * 8, 1.4 + p.r * 4, kind === 'sand' ? '#c8b080' : '#9a8a70');
        else tuft(g, p.x + ox * 6, p.y + oy * 6 + 3, gcols, kind === 'plaza' ? 0.8 : 1, p.r);
      }
    }
    // 들판 잔풀 / 돌 산포
    if (!nest) for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      const c = world.tiles[y][x]; if (c !== '.' && c !== ',') continue;
      const r = hash2(x, y, 610);
      if (r < 0.22) tuft(g, x * TILE + 8 + hash2(x, y, 611) * 32, y * TILE + 14 + hash2(x, y, 612) * 30, gcols, 0.9 + hash2(x, y, 613) * 0.4, hash2(x, y, 614));
      else if (r > 0.97) pebble(g, x * TILE + 10 + hash2(x, y, 615) * 28, y * TILE + 10 + hash2(x, y, 616) * 28, 2.5 + hash2(x, y, 617) * 3, '#9a978e');
    }
    // 해 방향(좌상단) 그림자: 나무 / 바위 / 건물
    softShadow(g, s => {
      for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
        const c = world.tiles[y][x];
        if (c === 'T' || c === 'P') { s.beginPath(); s.ellipse(x * TILE + 40, y * TILE + 44, 30, 12, 0.35, 0, 7); s.fill(); }
        else if (c === 'X') { s.beginPath(); s.ellipse(x * TILE + 44, y * TILE + 40, 34, 11, 0.45, 0, 7); s.fill(); }
        else if (c === 'r' || c === 'b') { s.beginPath(); s.ellipse(x * TILE + 32, y * TILE + 42, 20, 8, 0.3, 0, 7); s.fill(); }
      }
      for (const b of world.buildings) { s.beginPath(); s.moveTo(b.x * TILE + 10, (b.y + b.h) * TILE - 6); s.lineTo((b.x + b.w) * TILE + 6, (b.y + b.h) * TILE - 6); s.lineTo((b.x + b.w) * TILE + 30, (b.y + b.h) * TILE + 14); s.lineTo(b.x * TILE + 34, (b.y + b.h) * TILE + 14); s.closePath(); s.fill(); }
    }, 5, nest ? 0.4 : 0.22, cw, ch, S);
    // 소품 (기존 타일 그리기에서 바닥을 제외하고)
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) drawProps(g, world, x, y, th);
    return { canvas: c, S };
  }
  return { build, MAT };
})();

// 바닥 이외의 소품만 (꽃, 덤불, 바위, 잔해, 벽, 울타리, 화단)
function drawProps(g, world, x, y, th) {
  const c = world.tiles[y][x], X = x * TILE, Y = y * TILE;
  if (c === ',') {
    const cols = ['#ffffff', '#ffd1e8', '#fff07a', '#ff9fb0', '#b9a8ff'];
    for (let i = 0; i < 5; i++) {
      const px = X + 4 + hash2(x, y, 70 + i) * 40, py = Y + 6 + hash2(x, y, 80 + i) * 38, col = cols[Math.floor(hash2(x, y, 90 + i) * cols.length)], r = 1.6 + hash2(x, y, 95 + i);
      g.strokeStyle = 'rgba(40,100,30,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 5); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.arc(px + 1, py + 2, r * 2, 0, 7); g.fill();
      g.fillStyle = col; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(px + Math.cos(k * 1.256) * r * 1.3, py + Math.sin(k * 1.256) * r * 1.3, r, 0, 7); g.fill(); }
      g.fillStyle = '#ffcc33'; g.beginPath(); g.arc(px, py, r * 0.7, 0, 7); g.fill();
    }
    return;
  }
  if (c === 'b') {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(X + 24, Y + 40, 22, 8, 0, 0, 7); g.fill();
    leafCluster(g, X + 24, Y + 26, 20, hash2(x, y, 7) * 100, th === THEME.forest ? ['#1f5a24', '#2f7a32', '#4c9d43', '#7cc860'] : ['#2a6e2a', '#3d8f39', '#5fb150', '#9ad874']);
    return;
  }
  if (c === 'f') {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 4, Y + 40, 40, 4);
    g.fillStyle = '#7a4d30'; g.fillRect(X + 3, Y + 12, 42, 30); g.fillStyle = '#5a3720'; g.fillRect(X + 3, Y + 34, 42, 8);
    g.fillStyle = '#4a2f1c'; g.fillRect(X + 6, Y + 14, 36, 20);
    for (let i = 0; i < 9; i++) { const px = X + 10 + (i % 3) * 14 + hash2(x, y, i) * 4, py = Y + 18 + Math.floor(i / 3) * 7; g.fillStyle = '#3a8a35'; g.beginPath(); g.arc(px, py + 2, 4, 0, 7); g.fill(); g.fillStyle = ['#ff6b9a', '#ffd34d', '#fff', '#b97dff'][(i + x) % 4]; g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill(); }
    return;
  }
  if (c === 'r') return rock(g, X, Y, x, y);
  if (c === 'R') return rubble(g, X, Y, x, y);
  if (c === 'W') return ruinWall(g, X, Y, x, y, world);
  if (c === 'F') { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X, Y + 38, TILE, 3); g.fillStyle = '#c9b48a'; g.fillRect(X, Y + 18, TILE, 5); g.fillRect(X, Y + 30, TILE, 5); for (const px of [6, 38]) { g.fillRect(X + px, Y + 10, 5, 30); } return; }
  if (c === 'H') { g.fillStyle = '#2a2a2a'; g.fillRect(X, Y, TILE, TILE); }
  if (c === 'x') {
    const k = hash2(x, y, 620), wood = k < 0.5;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(X + 6, Y + 40, 40, 6);
    g.fillStyle = wood ? '#9a7a4a' : '#5d6a78'; g.fillRect(X + 4, Y + 10, 40, 32);
    g.fillStyle = wood ? '#b8925a' : '#7a8896'; g.fillRect(X + 4, Y + 10, 40, 8);
    g.strokeStyle = wood ? '#6a4f2a' : '#3a4450'; g.lineWidth = 2; g.strokeRect(X + 4, Y + 10, 40, 32);
    if (wood) { g.beginPath(); g.moveTo(X + 4, Y + 18); g.lineTo(X + 44, Y + 42); g.stroke(); } else { g.fillStyle = '#e8c547'; g.fillRect(X + 4, Y + 30, 40, 4); }
  }
}
// 둥근 잎 뭉치 (덤불/나무)
function leafCluster(g, cx, cy, r, seed, cols) {
  const R = i => hash2(i, Math.floor(seed), 77);
  g.save();
  // 외곽 그림자 실루엣
  g.fillStyle = cols[0];
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = r * 0.55; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8 + 2, r * (0.48 + R(i) * 0.12), 0, 7); g.fill(); }
  g.beginPath(); g.arc(cx, cy, r * 0.8, 0, 7); g.fill();
  // 중간 / 밝은 잎
  for (let layer = 1; layer < cols.length; layer++) {
    g.fillStyle = cols[layer];
    const n = 7 - layer, sh = layer * r * 0.12;
    for (let i = 0; i < n; i++) {
      const a = R(i + layer * 10) * Math.PI * 2, d = r * (0.45 - layer * 0.1) * R(i + layer * 20);
      g.beginPath(); g.arc(cx + Math.cos(a) * d - sh * 0.5, cy + Math.sin(a) * d * 0.8 - sh, r * (0.42 - layer * 0.07), 0, 7); g.fill();
    }
  }
  // 하이라이트 점
  g.fillStyle = 'rgba(255,255,220,0.35)';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx - r * 0.3 + R(i + 50) * r * 0.6, cy - r * 0.55 + R(i + 60) * r * 0.4, 1.5, 0, 7); g.fill(); }
  g.restore();
}
