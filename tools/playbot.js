// =====================================================================
//  라켓몬스터 자동 완주 테스트 봇
//  사용: 게임 페이지(?speed=4 권장) 콘솔에서 이 파일을 로드 → BOT.run()
//  이동·대화·메뉴는 키 입력(Input.press/release)으로만 조작한다.
//  전투에서 아이템/코어 사용만 전투 행동 API(Scene.pending)로 선택한다.
// =====================================================================
(function () {
  const B = window.BOT = { log: [], phase: 'idle', battles: 0, wins: 0, losses: 0, caught: [], errors: [], done: false, stop: false };
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const L = (...a) => { const s = '[' + Math.round(Game.playTime) + 's] ' + a.join(' '); B.log.push(s); if (B.log.length > 400) B.log.shift(); };
  window.addEventListener('error', e => B.errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', e => B.errors.push(String(e.reason && e.reason.stack || e.reason)));
  async function tap(k, hold = 90) { Input.press(k); await sl(hold); Input.release(k); await sl(60); }

  // ---------------- 공통 대기/처리 ----------------
  function idle() { return Scene === World && !UI.busy() && !World.locked && !Trans.active && !World.player.moving; }
  async function settle(max = 600) {
    for (let i = 0; i < max; i++) {
      if (B.stop) throw new Error('stopped');
      if (Scene instanceof Battle) { await fight(); continue; }
      if (UI.busy()) { await handleUI(); continue; }
      if (idle()) return;
      await sl(60);
    }
  }
  async function handleUI() {
    const t = UI.top();
    if (t instanceof Choice) {
      const o = t.options;
      let i = 0;
      if (o.includes('교체한다')) i = 1;                 // 트레이너 교체 질문 → 그대로
      else if (o[0] === '잊게 한다') i = 0;
      else if (o.includes('저장한다')) i = 0;
      else if (o[0] === '출격') i = 0;
      t.nav.i = i; await tap('a'); return;
    }
    if (t instanceof MoveForgetScreen) {
      const m = t.m, list = [...m.moves.map(x => x.id), t.newId];
      const val = id => { const d = MOVES[id]; if (d.cat !== 'atk') return 25; return d.pow * (m.types.includes(d.type) ? 1.5 : 1) * d.acc / 100; };
      let worst = 4, wv = val(t.newId);
      for (let k = 0; k < 4; k++) if (val(list[k]) < wv) { wv = val(list[k]); worst = k; }
      t.nav.i = worst; await tap('a'); return;
    }
    if (t instanceof PartyScreen) { const k = Game.party.findIndex((p, i) => p.hp > 0 && i !== t.o.active); t.nav.i = Math.max(0, k); await tap('a'); return; }
    if (t instanceof ShopScreen) { t.nav.i = t.stock.length; await tap('a'); return; }
    if (t instanceof NumberPick) { await tap('b'); return; }
    if (t instanceof PromotionScreen) { await sl(150); return; }
    if (t instanceof StarterPreview) { await sl(100); return; }
    await tap('a');
  }

  // ---------------- 전투 ----------------
  function bestMoveIdx(me, f) {
    let b = 0, bs = -1;
    me.moves.forEach((m, k) => { const d = MOVES[m.id]; if (m.pp <= 0) return; const s = d.cat === 'atk' ? d.pow * typeEff(d.type, f.types) * (me.types.includes(d.type) ? 1.5 : 1) * d.acc / 100 : 1; if (s > bs) { bs = s; b = k; } });
    return b;
  }
  async function fight() {
    const b = Scene;
    if (b._botSeen !== true) { b._botSeen = true; B.battles++; L('전투 시작', b.kind, b.foes.map(f => f.name + f.level).join(','), 'vs', Game.party.map(m => m.name + m.level).join(',')); }
    while (Scene === b) {
      if (UI.busy()) { await handleUI(); continue; }
      if (b.mode === 'command') {
        const me = b.me, f = b.foe;
        // 회복
        const kit = ['kit3', 'kit2', 'kit'].find(k => Game.bag[k] > 0);
        if (kit && me.hp / me.maxHp < 0.3 && f.hp / f.maxHp > 0.35) { b.mode = 'none'; b.pending({ type: 'item', item: kit, target: b.meI }); L('회복 아이템', ITEMS[kit].name); continue; }
        // 포획
        const ball = Game.bag.core2 > 0 ? 'core2' : Game.bag.core > 0 ? 'core' : null;
        const catchable = b.kind === 'wild' && f.kind === 'bio' && !f.species.legend;
        const want = catchable && !Game.dex.caught[f.key] && (Game.party.length < 4 || (Game.party.length < 6 && f.types.some(t => t === 'heavy' || t === 'air')));
        if (want && ball && (f.hp / f.maxHp < 0.5 || f.species.catch >= 150)) { b.mode = 'none'; b.pending({ type: 'item', item: ball }); L('링크 코어 투척', f.name); continue; }
        if (b.kind === 'wild' && b.o.legend && Game.bag.core3 > 0) { b.mode = 'none'; b.pending({ type: 'item', item: 'core3' }); L('마스터 코어 투척', f.name); continue; }
        // 상성이 나쁘면 교체 (보통 플레이어 전술)
        if (b.kind === 'trainer' && !b._sw) {
          const threat = m => Math.max(...f.moves.map(x => { const d = MOVES[x.id]; return d.cat === 'atk' ? d.pow * typeEff(d.type, m.types) * (f.types.includes(d.type) ? 1.5 : 1) : 0; }));
          let bi = -1, bv = threat(me) * 0.6;
          Game.party.forEach((m, i) => { if (m.hp > m.maxHp * 0.5 && i !== b.meI) { const t = threat(m); if (t < bv) { bv = t; bi = i; } } });
          if (bi >= 0) { b._sw = 2; b.mode = 'none'; b.pending({ type: 'switch', to: bi }); L('교체', Game.party[bi].name); continue; }
        }
        if (b._sw) b._sw--;
        b.menuNav.i = 0; await tap('a');
      } else if (b.mode === 'move') {
        b.moveNav.i = bestMoveIdx(b.me, b.foe); await tap('a');
      } else await sl(60);
    }
    // 결과 집계
    for (let i = 0; i < 200 && (UI.busy() || Trans.active || Scene !== World); i++) { if (UI.busy()) await handleUI(); else await sl(60); }
    const lost = Game.party.every(m => m.hp === m.maxHp) && World.id === Game.lastHeal[0] && b.kind !== 'wild' ? false : false;
    if (b._result === 'lose') B.losses++;
  }
  // 승패 기록용 훅
  const origFinish = Battle.prototype.finish;
  Battle.prototype.finish = async function (res) {
    this._result = res;
    if (res === 'win') B.wins++; if (res === 'lose') { B.losses++; L('패배!', this.foes.map(f => f.name + f.level).join(',')); }
    if (res === 'caught') { B.caught.push(this.foe.name); L('영입 성공', this.foe.name); }
    return origFinish.call(this, res);
  };

  // ---------------- 이동 ----------------
  const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function passable(x, y, tx, ty) {
    if (x === tx && y === ty) return !World.blocked(x, y);
    if (World.blocked(x, y)) return false;
    if (World.objAt(x, y, 'warp') || World.objAt(x, y, 'exit') || World.tile(x, y) === 'H') return false;
    const b = World.buildingAt(x, y); if (b) return false;
    for (const e of World.ents) if (e.kind === 'trainer' && e.o.zone && !Game.flags['beat_' + e.o.id]) { const [zx, zy, zw, zh] = e.o.zone; if (x >= zx && x < zx + zw && y >= zy && y < zy + zh) return false; }
    return true;
  }
  function path(tx, ty) {
    const p = World.player, key = (x, y) => x + ',' + y;
    const prev = new Map([[key(p.x, p.y), null]]), q = [[p.x, p.y]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) break;
      for (const d in DV) { const nx = x + DV[d][0], ny = y + DV[d][1], k = key(nx, ny); if (prev.has(k) || !passable(nx, ny, tx, ty)) continue; prev.set(k, [x, y, d]); q.push([nx, ny]); }
    }
    if (!prev.has(key(tx, ty))) return null;
    const steps = []; let k = key(tx, ty);
    while (prev.get(k)) { const [x, y, d] = prev.get(k); steps.unshift(d); k = key(x, y); }
    return steps;
  }
  async function step(dir) {
    const p = World.player, sx = p.x, sy = p.y, map = World.id;
    for (let i = 0; i < 6; i++) {
      Input.press(dir); await sl(90); Input.release(dir); await sl(50);
      for (let j = 0; j < 40 && (p.moving || World.locked || Trans.active); j++) await sl(40);
      if (p.x !== sx || p.y !== sy || World.id !== map || UI.busy() || Scene !== World) return true;
    }
    return false;
  }
  async function walkTo(tx, ty, tries = 400) {
    for (let i = 0; i < tries; i++) {
      await settle();
      const p = World.player;
      if (p.x === tx && p.y === ty) return true;
      const ps = path(tx, ty);
      if (!ps || !ps.length) { L('경로 없음', World.id, tx, ty, 'from', p.x, p.y); return false; }
      await step(ps[0]);
    }
    return false;
  }
  async function face(dir) { const p = World.player; if (p.dir !== dir) { Input.press(dir); await sl(60); Input.release(dir); await sl(120); } }
  async function interactAt(x, y) {
    for (const d in DV) {
      const sx = x - DV[d][0], sy = y - DV[d][1];
      if (!World.blocked(sx, sy) && path(sx, sy)) { await walkTo(sx, sy); await face(d); await settle(); await tap('a'); await settle(); return true; }
    }
    // 카운터 너머
    for (const d of ['up']) { const sx = x, sy = y + 2; if (!World.blocked(sx, sy) && path(sx, sy)) { await walkTo(sx, sy); await face(d); await tap('a'); await settle(); return true; } }
    return false;
  }
  async function exitVia(x, y, dir) { await walkTo(x - DV[dir][0], y - DV[dir][1]); const m = World.id; for (let i = 0; i < 30 && World.id === m; i++) { if (World.player.x !== x - DV[dir][0] || World.player.y !== y - DV[dir][1]) await walkTo(x - DV[dir][0], y - DV[dir][1]); await step(dir); await settle(); for (let k = 0; k < 20 && (Trans.active || World.locked) && World.id === m; k++) await sl(100); } if (World.id === m) L('출구 실패', m, x, y); return World.id !== m; }

  // ---------------- 쇼핑 ----------------
  async function shop(plan) {
    const clerk = World.ents.find(e => e.o.talk === 'shop');
    if (!clerk) return;
    await walkTo(clerk.x, clerk.y + 2); await face('up'); await tap('a');
    for (let i = 0; i < 40 && !(UI.top() instanceof ShopScreen); i++) { if (UI.top() instanceof Dialog) await tap('a'); else await sl(80); }
    await sl(300);
    const sc = UI.top(); if (!(sc instanceof ShopScreen)) return;
    for (const [id, n] of plan) {
      const idx = sc.stock.indexOf(id); if (idx < 0 || Game.money < ITEMS[id].price) continue;
      sc.nav.i = idx; await sl(150); await tap('a');
      for (let i = 0; i < 20 && !(UI.top() instanceof NumberPick); i++) await sl(60);
      const np = UI.top(); if (!(np instanceof NumberPick)) continue;
      np.n = Math.min(n, np.max); await tap('a');
      for (let i = 0; i < 40 && UI.top() !== sc; i++) { if (UI.top() instanceof Dialog) await tap('a'); else await sl(60); }
    }
    sc.nav.i = sc.stock.length; await tap('a');
    await settle();
    L('쇼핑 완료', JSON.stringify(Game.bag), '남은 자원', Game.money);
  }
  // ---------------- 성장 / 회복 ----------------
  const lead = () => Game.party[0];
  function teamHpRatio() { const a = Game.party.reduce((s, m) => s + m.hp, 0), b = Game.party.reduce((s, m) => s + m.maxHp, 0); return a / b; }
  function sortParty() { Game.party.sort((a, b) => (b.hp > 0) - (a.hp > 0) || b.level - a.level); }
  async function heal(where) {
    if (where === 'pod') { const pod = World.ents.find(e => e.kind === 'obj' && e.o.kind === 'healpod'); if (pod) { await interactAt(pod.x, pod.y); L('수복 포드 회복'); } }
    else if (where === 'nurse') { const n = World.ents.find(e => e.o.talk === 'nurse'); await walkTo(n.x, n.y + 2); await face('up'); await tap('a'); await settle(); L('수복실 회복'); }
  }
  async function grind(targetLv, healFn, maxBattles = 200) {
    const grass = [];
    for (let y = 0; y < World.h; y++) for (let x = 0; x < World.w; x++) { const c = World.tile(x, y); if ((c === '"' || c === 'n') && !World.blocked(x, y)) { const ps = path(x, y); if (ps) grass.push([x, y, ps.length]); } }
    grass.sort((a, b) => a[2] - b[2]);
    let spot = grass.find(([x, y]) => ['up', 'down', 'left', 'right'].some(d => { const t = World.tile(x + DV[d][0], y + DV[d][1]); return (t === '"' || t === 'n') && !World.blocked(x + DV[d][0], y + DV[d][1]); }));
    if (!spot) { L('수풀 없음'); return; }
    const [gx, gy] = spot;
    const dir2 = ['up', 'down', 'left', 'right'].find(d => { const t = World.tile(gx + DV[d][0], gy + DV[d][1]); return (t === '"' || t === 'n') && !World.blocked(gx + DV[d][0], gy + DV[d][1]); });
    const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[dir2];
    const start = B.battles;
    L('육성 시작', World.id, '목표 Lv', targetLv, '현재', Game.party.map(m => m.name + m.level).join(','));
    while (Math.min(...Game.party.slice(0, 1).map(m => m.level)) < targetLv && B.battles - start < maxBattles) {
      if (teamHpRatio() < 0.45 || lead().hp / lead().maxHp < 0.4) { await healFn(); sortParty(); }
      const map = World.id;
      await walkTo(gx, gy);
      if (World.id !== map) { L('육성 중 이동됨', World.id); return; }
      await step(dir2); await settle(); await step(back); await settle();
      sortParty();
    }
    L('육성 종료', Game.party.map(m => m.name + m.level + m.rank).join(','));
  }

  // ---------------- 시나리오 ----------------
  B.run = async function () {
    try {
      B.phase = 'title';
      Settings.bgm = 0; Settings.sfx = 0; Settings.voice = 0; // 테스트 중 무음 (저장하지 않음)
      Audio2.unlock();
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
      for (let i = 0; i < 30 && !(Scene instanceof TitleScene); i++) await sl(200);
      await tap('a'); await sl(400);
      Scene.nav.i = Scene.opts.indexOf('새로 시작'); await tap('a'); await sl(400);
      if (UI.busy()) { UI.top().nav.i = 0; await tap('a'); }
      B.phase = 'intro';
      for (let i = 0; i < 40 && Scene instanceof IntroScene; i++) await tap('a'), await sl(300);
      for (let i = 0; i < 100 && Scene !== World; i++) await sl(100);
      await settle();
      L('연구소 도착', World.id);
      // 스타터: 하르페이아 (기동·전기 상성 경로 검증)
      B.phase = 'starter';
      await interactAt(8, 4);
      await settle();
      L('스타터', Game.party.map(m => m.name + m.level).join(','));
      // 기지 → 1번 도로
      await exitVia(6, 8, 'down');
      L('기지', World.id, World.player.x, World.player.y);
      await walkTo(5, 13); await exitVia(5, 12, 'up'); await shop([['core', 10], ['kit', 4]]); await exitVia(6, 7, 'down');
      await walkTo(13, 1); await exitVia(13, 0, 'up');
      await B.league(true);
      return;
    } catch (e) { B.errors.push('BOT: ' + (e.stack || e)); L('봇 오류', e.message); }
    B.done = true;
  };
  // ---------------- 레모네이드 리그 ----------------
  // 체육관: 건물 문(x, y)으로 들어가 관원 → 관장 순으로 승부, 지면 나와서 육성 후 재도전
  async function gym(doorX, doorY, id, prep) {
    for (let t = 0; t < 6 && !Game.flags['beat_' + id]; t++) {
      if (t) { L(id + ' 재도전 준비'); await prep(t); }
      if (!await exitVia(doorX, doorY, 'up')) { L('체육관 진입 실패', id); continue; }
      await settle();
      await walkTo(6, 4); await settle();
      if (!Game.flags['beat_' + id]) { await walkTo(6, 3); await settle(); }
      L(id + ' 결과', !!Game.flags['beat_' + id], '배지', Game.badges.join(','));
      await exitVia(6, 10, 'down');
    }
    return !!Game.flags['beat_' + id];
  }
  B.league = async function (inner) {
    if (!inner) { B.stop = false; B.done = false; }
    try {
      const baseHeal = async () => {
        if (World.id === 'route1') await exitVia(11, 39, 'down');
        await walkTo(21, 6); await exitVia(21, 5, 'up'); await heal('nurse'); await exitVia(7, 9, 'down'); await exitVia(13, 0, 'up');
      };
      // 1. 감마 (1번 폐도로)
      B.phase = 'gamma'; L('1번 도로 진입');
      await grind(13, baseHeal); await baseHeal();
      await gym(5, 4, 'gamma', async () => { await grind(lead().level + 2, baseHeal, 25); await baseHeal(); });
      // 2. 베타 (엘프의 숲)
      await exitVia(11, 0, 'up'); B.phase = 'beta'; L('엘프의 숲', World.id);
      await heal('pod'); await grind(17, () => heal('pod')); await heal('pod');
      await gym(30, 11, 'beta', async () => { await grind(lead().level + 2, () => heal('pod'), 25); await heal('pod'); });
      // 3. 델타 (항구 마을)
      await exitVia(35, 13, 'right'); B.phase = 'delta'; L('항구 마을', World.id);
      const harborHeal = async () => { await walkTo(6, 7); await exitVia(6, 6, 'up'); await heal('nurse'); await exitVia(7, 9, 'down'); };
      await harborHeal();
      await walkTo(19, 6); await exitVia(19, 5, 'up'); await shop([['core2', 6], ['kit2', 6], ['revive', 2]]); await exitVia(6, 7, 'down');
      await gym(11, 4, 'delta', async () => {
        await exitVia(0, 10, 'left'); await heal('pod'); await grind(lead().level + 2, () => heal('pod'), 25); await heal('pod'); await exitVia(35, 13, 'right'); await harborHeal();
      });
      // 4. 제타 (폐허 해안)
      await exitVia(27, 10, 'right'); B.phase = 'zeta'; L('폐허 해안', World.id);
      await heal('pod'); await grind(25, () => heal('pod')); await heal('pod');
      await gym(35, 9, 'zeta', async () => { await grind(lead().level + 2, () => heal('pod'), 25); await heal('pod'); });
      // 5. 엡실론 (폐공장 지대)
      await walkTo(36, 4); await exitVia(36, 3, 'up'); B.phase = 'epsilon'; L('폐공장', World.id);
      await heal('pod'); await grind(29, () => heal('pod')); await heal('pod');
      await gym(23, 5, 'epsilon', async () => { await grind(lead().level + 2, () => heal('pod'), 25); await heal('pod'); });
      // 6. 알파 (설원)
      await exitVia(15, 0, 'up'); B.phase = 'alpha'; L('설원', World.id);
      await heal('pod'); await grind(33, () => heal('pod')); await heal('pod');
      await gym(8, 7, 'alpha', async () => { await grind(lead().level + 2, () => heal('pod'), 25); await heal('pod'); });
      await grind(37, () => heal('pod'), 120); await heal('pod');
      // 7. 챔피언 오메가 (리조트)
      await exitVia(15, 0, 'up'); B.phase = 'omega'; L('리조트', World.id);
      await heal('pod');
      await gym(13, 7, 'omega', async () => {
        await exitVia(13, 19, 'down'); await heal('pod'); await grind(lead().level + 2, () => heal('pod'), 25); await heal('pod'); await exitVia(15, 0, 'up'); await heal('pod');
      });
      L('챔피언 격파', !!Game.flags.beat_omega, '배지', Game.badges.join(','));
      // 숨겨진 흑막
      await B.finale(true);
      return;
    } catch (e) { B.errors.push('BOT: ' + (e.stack || e)); L('봇 오류', e.message); }
    B.done = true;
  };
  // 둥지 단계부터 이어서 (해안에 있을 때)
  B.finale = async function (inner) {
    if (!inner) { B.stop = false; B.done = false; }
    try {
      for (let tries = 0; tries < 6 && !Game.flags.cleared; tries++) {
        // 재도전 준비 중에 챔피언을 이기면 아직 챔피언 홀 안에 있다
        if (World.id.startsWith('gym_')) await exitVia(6, 10, 'down');
        if (World.id === 'snowfield') await exitVia(15, 0, 'up'); // 재도전 준비 중 설원까지 내려왔다면 리조트로
        if (World.id === 'resort') { await heal('pod'); await walkTo(19, 14); await exitVia(20, 14, 'right'); }
        if (World.id !== 'nest') { L('둥지 진입 실패', World.id); break; }
        B.phase = 'nest'; L('리조트 지하 진입', tries);
        await heal('pod');
        await grind(Math.max(39, lead().level + 1), async () => { if (World.id === 'nest') await heal('pod'); }, 30);
        if (World.id !== 'nest') continue;
        await heal('pod');
        await walkTo(17, 6); await step('left'); await settle();
        if (!Game.flags.cleared && World.id === 'nest') { await exitVia(14, 31, 'down'); }
      }
      B.phase = 'ending';
      for (let i = 0; i < 900 && !(World.id === 'base' && idle() && Game.flags.cleared); i++) { if (UI.busy()) await handleUI(); else await sl(100); }
      L('엔딩 후 위치', World.id, 'cleared', Game.flags.cleared, 'core3', Game.bag.core3, '배지', Game.badges.length);
      B.phase = 'done';
    } catch (e) { B.errors.push('BOT: ' + (e.stack || e)); L('봇 오류', e.message); }
    B.done = true;
  };
  B.status = () => ({ phase: B.phase, map: World.id, pos: World.player && [World.player.x, World.player.y], party: Game.party.map(m => m.name + m.level + m.rank + ' ' + m.hp + '/' + m.maxHp), battles: B.battles, wins: B.wins, losses: B.losses, caught: B.caught, badges: Game.badges, money: Game.money, playTime: Math.round(Game.playTime), errors: B.errors.slice(-5), last: B.log.slice(-6) });
})();
