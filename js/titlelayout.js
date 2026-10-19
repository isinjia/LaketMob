// =====================================================================
//  타이틀 화면을 화면 전체에 맞춘다 (세로·가로 모두 검은 여백 없이)
//  - 타이틀에서만 논리 화면을 실제 화면비로 넓힌다: 가로는 높이 640 기준, 세로는 폭 540 기준
//  - 대화창·설정이 열려도 타이틀 화면비는 유지하고 UI만 별도로 배치한다.
//  game.js, mobilefield.js 다음에 로드한다.
// =====================================================================
(function () {
  const TitleFill = window.TitleFill = {
    on: false,
    active() { return typeof Scene !== 'undefined' && (Scene instanceof TitleScene || Scene instanceof LoadingScene); }, // 로딩 화면도 화면 전체에,
    apply() {
      this.on = this.active();
      if (!this.on) return;
      const vw = innerWidth, vh = innerHeight, r = vw / vh;
      if (vw >= vh) {
        // 가로: 높이 640 고정, 폭을 화면비만큼 (3:2 보다 좁은 화면은 폭 960 고정, 높이를 늘린다)
        if (r >= 1.5) { H = 640; W = Math.round(640 * r); } else { W = 960; H = Math.round(960 / r); }
      } else { W = 540; H = Math.round(540 / r); }
    },
  };
  // 화면 크기 계산: 기존 계산 뒤에 타이틀이면 화면비에 맞춘다
  const baseDims = MobileField.dimensions.bind(MobileField);
  MobileField.dimensions = function () { baseDims(); TitleFill.apply(); };
  const baseContext = MobileField.portraitContext.bind(MobileField);
  MobileField.portraitContext = function () { return baseContext() || (TitleFill.active() && UI.busy()); };
  // Desktop / legacy controls keep their original dialog geometry, centred over
  // the full-size title. Portrait touch menus already have their own layout.
  function overlayBox() {
    const scale = Math.min(W / 960, H / 640);
    return {scale,x:(W-960*scale)/2,y:(H-640*scale)/2};
  }
  const baseUIDraw = UI.draw.bind(UI);
  UI.draw = function () {
    if(!TitleFill.active() || !UI.busy() || MobileField.portrait) return baseUIDraw();
    const b=overlayBox(),width=W,height=H;
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.scale,b.scale);
    try{W=960;H=640;return baseUIDraw();}finally{W=width;H=height;ctx.restore();}
  };
  const basePoint = toLogical;
  toLogical = function (e) {
    const p=basePoint(e);
    if(!TitleFill.active() || !UI.busy() || MobileField.portrait) return p;
    const b=overlayBox();return {x:(p.x-b.x)/b.scale,y:(p.y-b.y)/b.scale};
  };
  // 타이틀 ↔ 다른 장면(또는 타이틀 위 창)으로 바뀌면 크기를 다시 계산한다
  const baseSync = MobileField.sync.bind(MobileField);
  MobileField.sync = function () {
    baseSync();
    if (TitleFill.active() !== TitleFill.on) resize();
    // 타이틀에서는 화면을 직접 눌러 고르므로 방향키·A·B 터치 패드를 숨긴다 (글자·메뉴를 가리지 않게)
    document.body.classList.toggle('title-screen', TitleFill.on);
    document.body.classList.toggle('title-ui', TitleFill.on && UI.busy());
  };
  const st = document.createElement('style');
  st.textContent = 'body.title-screen #touchpad, body.title-screen:not(.title-ui) #mobile-field { display: none !important; }';
  document.head.appendChild(st);

  // ---- 화면비에 맞춘 타이틀 그리기 ----
  function logo(cx, y, size, t, align) {
    ctx.save();
    ctx.font = font(size, 400, TITLE_FONT);
    const maxWidth = H > W ? W - 64 : Math.min(520, W * .53);
    size *= Math.min(1, maxWidth / ctx.measureText('라스트 로이드').width);
    ctx.font = font(size, 400, TITLE_FONT);
    const tw = ctx.measureText('라스트 로이드').width, x0 = align === 'center' ? cx - tw / 2 : cx;
    ctx.translate(x0, y);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText('라스트 로이드', 6, 8);
    const lg = ctx.createLinearGradient(0, -size * 0.87, 0, size * 0.11); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.5, '#9ff3ff'); lg.addColorStop(1, '#2fb7e6');
    ctx.lineWidth = size * 0.11; ctx.strokeStyle = '#08213a'; ctx.lineJoin = 'round'; ctx.strokeText('라스트 로이드', 0, 0);
    ctx.fillStyle = lg; ctx.fillText('라스트 로이드', 0, 0);
    const sx = ((t * 260) % (tw + 200)) - 100;
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(sx, -size); ctx.lineTo(sx + 30, -size); ctx.lineTo(sx - 10, size * 0.22); ctx.lineTo(sx - 40, size * 0.22); ctx.closePath(); ctx.fill();
    ctx.restore();
    return tw;
  }
  // 주황 띠 + 버전 (폭 436)
  function band(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffb22e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(370, 0); ctx.lineTo(356, 30); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
    txt('LAST ORIGIN  ·  LAST ROID', 14, 22, { size: 17, weight: 900, color: '#1b1205', shadow: false });
    ctx.fillStyle = '#0b1d33'; ctx.beginPath(); ctx.moveTo(366, 0); ctx.lineTo(436, 0); ctx.lineTo(422, 30); ctx.lineTo(352, 30); ctx.closePath(); ctx.fill();
    txt(GAME_VERSION, 392, 22, { size: 16, weight: 900, align: 'center', color: '#9ff3ff', shadow: false });
    ctx.restore();
  }
  function menu(scene, x, y0, w, gap) {
    scene.nav.beginDraw();
    scene.opts.forEach((o, i) => {
      const y = y0 + i * gap, on = i === scene.nav.i;
      scene.nav.rect(i, x, y, w, 50);
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + 50); ctx.lineTo(x, y + 50); ctx.closePath();
      ctx.fillStyle = on ? 'rgba(15,184,222,0.85)' : 'rgba(10,20,40,0.72)'; ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(56,225,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      txt(o, x + 26, y + 34, { size: 23, weight: 900, color: on ? '#fff' : '#cfe6f5' });
      if (o === '이어하기') { const d = Game.saveInfo(); if (d) txt((MAPS[d.map] ? MAPS[d.map].name : '') + ' · ' + Game.playTimeStr(d.playTime) + ' · 배지 ' + (d.badges || []).length, x + w - 14, y + 32, { size: 13, align: 'right', color: on ? '#e8fbff' : UI_COL.sub }); }
    });
  }
  const touch = () => !!(window.MobileField && MobileField.touch);

  TitleScene.prototype.draw = function () {
    const t = this.t, portrait = H > W;
    // 배경: 화면 전체를 덮도록 (cover)
    if (this.bg && !this.bg._bad) { const s = Math.max(W / this.bg.width, H / this.bg.height) * 1.08; ctx.drawImage(this.bg, (W - this.bg.width * s) / 2 + Math.sin(t * 0.1) * 20, (H - this.bg.height * s) / 2, this.bg.width * s, this.bg.height * s); }
    else { ctx.fillStyle = '#0a1426'; ctx.fillRect(0, 0, W, H); }
    const k = this.cast[this.ci], a = Ease.outCubic(clamp(this.ct / 0.6, 0, 1)) * (this.ct > 2.7 ? 1 - (this.ct - 2.7) / 0.5 : 1);
    const col = TYPES[SPECIES[k].types[0]].color;
    if (portrait) {
      // 세로: 위에 로고, 가운데 캐릭터, 아래에 메뉴
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(4,10,24,0.88)'); g.addColorStop(0.3, 'rgba(4,10,24,0.35)'); g.addColorStop(0.62, 'rgba(4,10,24,0.25)'); g.addColorStop(1, 'rgba(4,10,24,0.92)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cy = H * 0.5, ch = H * 0.56;
      ctx.save(); const rg = ctx.createRadialGradient(W / 2, cy, 20, W / 2, cy, W * 0.62); rg.addColorStop(0, col + '55'); rg.addColorStop(1, 'transparent'); ctx.globalAlpha = a; ctx.fillStyle = rg; ctx.fillRect(0, cy - ch / 2, W, ch); ctx.restore();
      drawFit(IMG.full[k], W / 2 - 250 + (1 - a) * 40, H * 0.2, 500, ch, { anchor: 'bottom', alpha: a });
      const ly = Math.max(110, H * 0.11);
      logo(W / 2, ly, 78, t, 'center');
      band(W / 2 - 436 * 0.92 / 2, ly + 26, 0.92);
      txt('마지막 인간, 사령관의 링크 대모험', W / 2, ly + 88, { size: 19, weight: 700, align: 'center', color: '#cfe6f5' });
      if (this.stage === 0) {
        const blink = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.save(); ctx.globalAlpha = blink; txt(touch() ? 'TOUCH TO START' : 'PRESS ANY KEY', W / 2, H - 130, { size: 28, weight: 900, align: 'center', color: '#fff', family: TITLE_FONT }); ctx.restore();
        txt(touch() ? '화면을 누르면 시작합니다' : '방향키 이동 · Z 결정 · X 취소/메뉴', W / 2, H - 96, { size: 14, align: 'center', color: UI_COL.sub });
      } else {
        const n = this.opts.length, w = 400;
        menu(this, (W - w) / 2, H - 70 - n * 60, w, 60);
      }
      txt('© LAST ORIGIN', W / 2, H - 22, { size: 12, align: 'center', color: 'rgba(200,220,235,0.6)' });
      return;
    }
    // 가로: 기존 배치를 유지하되 왼쪽 글·메뉴는 왼쪽에, 캐릭터는 오른쪽 끝에 붙이고 세로 가운데로
    const oy = Math.round((H - 640) / 2), lx = Math.max(60, Math.round((W - 960) * 0.25) + 60);
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(4,10,24,0.92)'); g.addColorStop(0.55, 'rgba(4,10,24,0.55)'); g.addColorStop(1, 'rgba(4,10,24,0.2)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const ax = W - 490 - Math.round((W - 960) * 0.2);
    ctx.save(); const rg = ctx.createRadialGradient(ax + 230, oy + 330, 20, ax + 230, oy + 330, 320); rg.addColorStop(0, col + '55'); rg.addColorStop(1, 'transparent'); ctx.globalAlpha = a; ctx.fillStyle = rg; ctx.fillRect(ax - 90, 0, 580, H); ctx.restore();
    drawFit(IMG.full[k], ax + (1 - a) * 60, oy + 30, 480, 610, { anchor: 'bottom', alpha: a });
    const ly = oy + 170;
    logo(lx, ly, 92, t, 'left');
    band(lx + 4, ly + 40, 1);
    txt('마지막 인간, 사령관의 링크 대모험', lx + 6, ly + 104, { size: 20, weight: 700, color: '#cfe6f5' });
    if (this.stage === 0) {
      const blink = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save(); ctx.globalAlpha = blink; txt(touch() ? 'TOUCH TO START' : 'PRESS ANY KEY', lx + 6, oy + 440, { size: 26, weight: 900, color: '#fff', family: TITLE_FONT }); ctx.restore();
      txt(touch() ? '화면을 누르면 시작합니다' : '키보드: 방향키 이동 · Z 결정 · X 취소/메뉴 · Shift 달리기', lx + 6, oy + 476, { size: 14, color: UI_COL.sub });
    } else menu(this, lx, oy + 380, 330, 58);
    txt('© LAST ORIGIN', W - 14, H - 12, { size: 12, align: 'right', color: 'rgba(200,220,235,0.6)' });
  };
})();
