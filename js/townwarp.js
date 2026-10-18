// =====================================================================
//  전술 귀환 장치 + 작전 지도: 메뉴의 '지도'에서 한 번 가 본 마을로 순간이동한다
//  - 라비아타가 처음 선물로 준다 (Game.flags.warpKit). 이미 진행 중인 세이브는 불러올 때 지급
//  ui.js, game.js, portraitui.js 다음에 로드한다.
// =====================================================================
const WARP_TOWNS = [
  { id: 'base', to: ['base', 21, 6, 'down'] },
  { id: 'harbor', to: ['harbor', 6, 7, 'down'] },
  { id: 'resort', to: ['resort', 13, 9, 'down'] },
];
// 지도에 그릴 지역 순서 (마을은 굵게, 나머지는 경유지)
const WARP_ROUTE = ['base', 'route1', 'forest', 'harbor', 'coast', 'nest', 'factory', 'snowfield', 'resort'];

async function warpTo(t) {
  Audio2.sfx('shine', 0.7);
  await Trans.fade(1, 450);
  UI.stack.length = 0;
  World.locked = false;
  World.load(...t.to);
  await Trans.fade(0, 500);
}

class MapScreen {
  constructor() {
    this.towns = WARP_TOWNS.filter(t => MAPS[t.to[0]]);
    this.nav = new ListNav(this.towns.length, { start: Math.max(0, this.towns.findIndex(t => t.id === World.id)) });
    this.portraitDraw = true; // PortraitUI 가 축소하지 않고 그대로 그리게
  }
  visited(t) { return !!Game.flags['visit_' + t.id] || World.id === t.id; }
  async update(dt) {
    if (this.busy) return;
    const r = this.nav.update(dt);
    if (r === 'b' || Input.pressed.menu) { Audio2.cancel(); UI.close(this); return; }
    if (r !== 'a') return;
    const t = this.towns[this.nav.i];
    if (!this.visited(t)) { Audio2.bump(); await say('아직 가 본 적 없는 곳이다.'); return; }
    if (t.id === World.id) { Audio2.bump(); await say('이미 ' + MAPS[t.id].name + '에 있다.'); return; }
    Audio2.select();
    this.busy = true;
    try {
      const c = await ask(MAPS[t.id].name + '(으)로 순간이동할까요?', ['이동한다', '그만둔다']);
      if (c === 0) { await warpTo(t); return; }
    } finally { this.busy = false; }
  }
  draw() {
    const portrait = H > W;
    ctx.save(); ctx.fillStyle = '#040b18'; ctx.fillRect(0, 0, W, H); ctx.restore();
    txt('작전 지도', 28, 54, { size: 30, weight: 900, color: UI_COL.line, family: TITLE_FONT });
    txt('전술 귀환 장치 · 가 본 마을로 순간이동', 30, 84, { size: 16, color: UI_COL.sub });
    // 경로 도식
    const route = WARP_ROUTE.filter(id => MAPS[id]);
    const top = 130, bottom = portrait ? H - 190 : H - 60, x0 = portrait ? 60 : 70;
    const step = (bottom - top) / Math.max(1, route.length - 1);
    ctx.save(); ctx.strokeStyle = 'rgba(56,225,255,0.35)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, top + step * (route.length - 1)); ctx.stroke(); ctx.restore();
    this.nav.beginDraw();
    route.forEach((id, k) => {
      const y = top + step * k, ti = this.towns.findIndex(t => t.id === id), town = ti >= 0;
      const seen = !!Game.flags['visit_' + id] || World.id === id, here = World.id === id;
      ctx.save(); ctx.beginPath(); ctx.arc(x0, y, town ? 13 : 7, 0, 7);
      ctx.fillStyle = here ? '#ffd23a' : seen ? (town ? UI_COL.line : '#4f7f98') : '#26384a'; ctx.fill(); ctx.restore();
      const name = seen ? MAPS[id].name : '???';
      if (!town) { txt(name, x0 + 26, y + 6, { size: 16, color: seen ? '#8fb4c8' : '#4a5a6a' }); return; }
      const bw = (portrait ? W - x0 - 50 : 420), bh = Math.min(64, step * 0.9), bx = x0 + 26, by = y - bh / 2, on = ti === this.nav.i;
      this.nav.rect(ti, bx, by, bw, bh);
      ctx.save(); chamfer(bx, by, bw, bh, 10);
      ctx.fillStyle = on ? 'rgba(25,60,96,0.96)' : 'rgba(10,22,40,0.92)'; ctx.fill();
      ctx.strokeStyle = on ? UI_COL.line : 'rgba(56,225,255,0.3)'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke(); ctx.restore();
      txt(name, bx + 18, by + bh / 2 + 8, { size: 22, weight: 800, color: seen ? '#fff' : '#5a6a7a' });
      txt(here ? '현재 위치' : seen ? '이동 가능' : '미방문', bx + bw - 16, by + bh / 2 + 7, { size: 15, weight: 800, align: 'right', color: here ? '#ffd23a' : seen ? UI_COL.green : '#5a6a7a' });
    });
    if (!portrait) txt('Z 이동 · X 닫기', W - 30, H - 24, { size: 14, align: 'right', color: UI_COL.sub });
  }
}

(function () {
  // 세로 UI: 이 화면은 자체적으로 세로 배치를 하므로 축소하지 않는다
  if (window.PortraitUI) {
    const baseDraw = PortraitUI.draw.bind(PortraitUI);
    PortraitUI.draw = function (w) { if (w.portraitDraw) { w.draw(); return true; } return baseDraw(w); };
  }
  // 이미 진행 중인 세이브: 첫 부대원을 받은 뒤라면 장치를 지급
  const baseLoad = Game.load.bind(Game);
  Game.load = function () { const ok = baseLoad(); if (ok && this.flags.gotStarter) this.flags.warpKit = 1; return ok; };
})();
