// =====================================================================
//  폰 크래시 진단: 마지막 단계·에러·메모리 상태를 localStorage 에 남기고,
//  비정상 종료(탭이 강제로 꺼짐) 뒤 다음 실행의 타이틀 화면에 표시한다.
//  titlelayout.js 다음에 로드한다.
// =====================================================================
(function () {
  const K = 'rm_diag';
  let prev = null;
  try { prev = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { }
  const D = window.CrashDiag = {
    // 정상적으로 닫히지 않은 직전 실행만 보여 준다
    prev: prev && !prev.clean ? prev : null,
    cur: { v: GAME_VERSION, dpr: window.devicePixelRatio || 1, dm: navigator.deviceMemory || 0, steps: [], errs: [], last: '' },
    t0: Date.now(),
    mark(s) {
      this.cur.steps.push(((Date.now() - this.t0) / 1000).toFixed(1) + 's ' + s);
      if (this.cur.steps.length > 10) this.cur.steps.shift();
      this.save();
    },
    save() { try { localStorage.setItem(K, JSON.stringify(this.cur)); } catch (e) { } },
  };
  addEventListener('error', e => { D.cur.errs.push(String(e.message).slice(0, 120) + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno); D.cur.errs = D.cur.errs.slice(-3); D.save(); });
  addEventListener('unhandledrejection', e => { D.cur.errs.push('rej ' + String(e.reason && e.reason.message || e.reason).slice(0, 120)); D.cur.errs = D.cur.errs.slice(-3); D.save(); });
  // 사용자가 직접 닫거나 다른 앱으로 넘어간 경우는 크래시가 아니다
  addEventListener('pagehide', () => { D.cur.clean = 1; D.save(); });
  document.addEventListener('visibilitychange', () => { D.cur.clean = document.hidden ? 1 : 0; D.save(); });
  D.mark('boot');

  // 주요 단계 기록
  const baseLoad = World.load.bind(World);
  World.load = function (id, ...a) { D.mark('map ' + id + ' 시작'); const r = baseLoad(id, ...a); D.mark('map ' + id + ' 완료'); return r; };
  const baseCont = window.continueGame;
  window.continueGame = function () { D.mark('이어하기'); return baseCont.apply(this, arguments); };
  const baseNew = window.newGame;
  window.newGame = function () { D.mark('새로 시작'); return baseNew.apply(this, arguments); };
  // 2초마다 상태 스냅샷 (장면·화면 크기·배율·SD 리그 수·JS 힙)
  setInterval(() => {
    const sc = Scene === World ? 'World:' + World.id : Scene && Scene.constructor ? Scene.constructor.name : '?';
    const sd = window.SD && SD.loaded ? SD.loaded().length : 0;
    const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + 'MB' : '';
    D.cur.last = sc + ' ' + W + 'x' + H + ' S' + SCALE.toFixed(2) + ' cv' + canvas.width + 'x' + canvas.height + ' sd' + sd + ' ' + heap;
    D.save();
  }, 2000);

  // 타이틀에 직전 비정상 종료 기록 표시 (화면을 캡처해 보내 달라고 할 수 있도록)
  const baseDraw = TitleScene.prototype.draw;
  TitleScene.prototype.draw = function () {
    baseDraw.call(this);
    const p = D.prev; if (!p) return;
    const lines = ['[직전 실행이 비정상 종료됨] ' + p.v + ' dpr' + p.dpr + ' mem' + p.dm, '상태: ' + p.last, ...p.steps.slice(-6), ...p.errs.map(e => '에러: ' + e)];
    const lh = 15, h = lines.length * lh + 12;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(6, 6, W - 12, h); ctx.restore();
    lines.forEach((s, i) => txt(s, 12, 22 + i * lh, { size: 11, color: i ? '#ffd6a0' : '#ff8a80', shadow: false }));
  };
})();
