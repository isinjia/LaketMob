// 기술 이펙트 캡처 도구: 게임 페이지 콘솔에서 이 파일을 불러온 뒤 FXCAP.run('v2')
// 각 기술 fx 를 아군→상대로 재생하고 120~1100ms 사이 5장을 POST /save?name=... 로 보낸다.
// (POST 를 받아 저장하는 로컬 서버에서 열어야 한다)
(function () {
  const sl = (ms) => new Promise((r) => setTimeout(r, ms));
  const LIST = ['barrage', 'beam', 'blizzard', 'bombs', 'buff', 'bullet', 'bullets', 'dash', 'debuff', 'dive', 'fireball', 'flame', 'heal', 'ice', 'icebeam',
    'napalm', 'plasma', 'shell', 'shield', 'slash', 'slash3', 'smash', 'smoke', 'snipe', 'spark', 'thunder'];
  const FXCAP = window.FXCAP = {
    errs: [], done: null,
    async setup(me = 'constantia', foe = 'brownie') {
      addEventListener('error', (e) => FXCAP.errs.push(e.message + ' ' + e.filename + ':' + e.lineno));
      Game.reset(); Game.party = [new Mon(me, 30)]; Object.assign(Game.flags, { introDone: 1, gotStarter: 1, hintSeen: 1 });
      UI.stack.length = 0; Scene = World; World.load('route1', 10, 30, 'down'); await sl(500);
      startBattle({ kind: 'wild', foes: [new Mon(foe, 30)] }); await sl(2500);
      for (let i = 0; i < 14 && Scene.mode !== 'command'; i++) { Input.press('a'); await sl(80); Input.release('a'); await sl(500); }
    },
    async cap(fx, pre, times = [120, 300, 500, 750, 1100]) {
      const mv = Object.values(MOVES).find((m) => m.fx === fx), type = mv ? mv.type : 'phys';
      const b = Scene; b.mode = 'none'; const t0 = performance.now(); const p = b.playFx(fx, 'me', 'foe', type, true);
      for (const [i, t] of times.entries()) {
        const w = t - (performance.now() - t0); if (w > 0) await sl(w);
        await fetch('/save?name=' + pre + '_' + fx + '_' + i + '.jpg', { method: 'POST', body: canvas.toDataURL('image/jpeg', 0.75) });
      }
      await p; await sl(400); if (window.BFX) BFX.clear(); Particles.clear(); b.shapes.length = 0;
    },
    async run(pre, only) { FXCAP.done = null; await FXCAP.setup(); for (const f of only || LIST) await FXCAP.cap(f, pre); FXCAP.done = pre; },
  };
})();
