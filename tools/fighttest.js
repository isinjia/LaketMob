// 보스 밸런스 측정 도구: 게임 페이지(?speed=4)에서 로드 후 FT.run(trainerId, [[key,lv],...], n)
(function () {
  if (!window.__fastTimers) {
    window.__fastTimers = true; const q = []; const ch = new MessageChannel(); let running = false;
    const pump = () => { const now = performance.now(); for (let i = q.length - 1; i >= 0; i--) if (q[i].t <= now) { const it = q.splice(i, 1)[0]; try { it.fn(...it.a); } catch (e) { console.error(e); } } if (q.length) ch.port2.postMessage(0); else running = false; };
    ch.port1.onmessage = pump;
    window.setTimeout = (fn, ms, ...a) => { q.push({ fn, t: performance.now() + (ms || 0), a }); if (!running) { running = true; ch.port2.postMessage(0); } return 1; };
    window.setInterval = (fn, ms) => { const tick = () => { fn(); window.setTimeout(tick, ms); }; window.setTimeout(tick, ms); return 1; };
    window.setInterval(() => { if (performance.now() - lastT > 30) frame(performance.now()); }, 16);
  }
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const tap = async k => { Input.press(k); await sl(90); Input.release(k); await sl(60); };
  const best = () => { const me = Scene.me, f = Scene.foe; let b = 0, bs = -1; me.moves.forEach((m, k) => { const d = MOVES[m.id]; if (m.pp <= 0) return; const s = d.cat === 'atk' ? d.pow * typeEff(d.type, f.types) * (me.types.includes(d.type) ? 1.5 : 1) * d.acc / 100 : 1; if (s > bs) { bs = s; b = k; } }); return b; };
  // 상성이 나쁘면 더 나은 유닛으로 교체하는 '보통 플레이어' 전술
  const pickSwitch = () => {
    const f = Scene.foe, me = Scene.me;
    const threat = m => Math.max(...f.moves.map(x => { const d = MOVES[x.id]; return d.cat === 'atk' ? d.pow * typeEff(d.type, m.types) * (f.types.includes(d.type) ? 1.5 : 1) : 0; }));
    const cur = threat(me);
    let bi = -1, bv = cur * 0.6;
    Game.party.forEach((m, i) => { if (m.hp > m.maxHp * 0.5 && i !== Scene.meI) { const t = threat(m); if (t < bv) { bv = t; bi = i; } } });
    return bi;
  };
  async function fight(T, party, bg, smart, wild) {
    Game.party = party; const log = [];
    if (wild) startBattle({ kind: 'wild', foes: [new Mon(wild[0], wild[1])], bg });
    else startBattle({ kind: 'trainer', foes: T.team.map(([k, l]) => new Mon(k, l, { trainer: true })), trainer: T, bg, noRun: true });
    await sl(1500);
    for (let i = 0; i < 1200 && Scene instanceof Battle; i++) {
      const t = UI.top();
      if (t instanceof Dialog) { if (log[log.length - 1] !== t.full) log.push(t.full); await tap('a'); }
      else if (t instanceof Choice) { t.nav.i = t.options[0] === '출격' ? 0 : t.options.length - 1; await tap('a'); }
      else if (t instanceof PartyScreen) { t.nav.i = Game.party.findIndex((p, j) => p.hp > 0 && j !== t.o.active); await tap('a'); }
      else if (t instanceof MoveForgetScreen) { t.nav.i = 4; await tap('a'); }
      else if (UI.busy()) await tap('a');
      else if (Scene.mode === 'command') {
        const me = Scene.me;
        const kit = ['kit2', 'kit'].find(k => Game.bag[k] > 0);
        if (smart && kit && me.hp < me.maxHp * 0.35) { Scene.mode = 'none'; Scene.pending({ type: 'item', item: kit, target: Scene.meI }); continue; }
        const sw = smart ? pickSwitch() : -1;
        if (sw >= 0 && !Scene._sw) { Scene._sw = 2; Scene.mode = 'none'; Scene.pending({ type: 'switch', to: sw }); continue; }
        if (Scene._sw) Scene._sw--;
        Scene.menuNav.i = 0; await tap('a');
      }
      else if (Scene.mode === 'move') { Scene.moveNav.i = best(); await tap('a'); }
      else await sl(60);
    }
    for (let i = 0; i < 30 && UI.busy(); i++) await tap('a');
    return { win: wild ? Game.party.some(m => m.hp > 0) && !log.find(l => l.includes('전투불능이 되었다')) : !!log.find(l => l.includes('승부에서 이겼다')), log };
  }
  window.FT = {
    mine(k, lv) { const m = new Mon(k, lv, { trainer: true }); m.rank = autoRank(SPECIES[k].rank, lv); m.recalc(); m.hp = m.maxHp; return m; },
    async wild(key, lv, team, n = 3) {
      const out = [];
      for (let k = 0; k < n; k++) { Game.bag = {}; const party = team.map(([kk, l]) => FT.mine(kk, l)); const r = await fight(null, party, 'coast', false, [key, lv]); out.push(r.win ? 'W' : 'L'); FT.last = r.log; }
      return out.join('');
    },
    async run(id, team, n = 3, smart = true, items = {}) {
      const T = TRAINERS[id], out = [];
      for (let k = 0; k < n; k++) {
        Game.bag = Object.assign({}, items);
        const party = team.map(([key, lv]) => FT.mine(key, lv));
        const r = await fight(T, party, 'forest', smart);
        out.push(r.win ? 'W' : 'L');
        FT.last = r.log;
      }
      return out.join('');
    },
  };
})();
