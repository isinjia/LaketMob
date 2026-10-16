// =====================================================================
//  라켓몬스터 퀘스트 전수 테스트
//  사용: 게임 페이지 콘솔에서 이 파일을 로드 → await QT.run()
//  모든 퀘스트(메인 9 · 서브 10 · 전설 5)를 실제 대화(키 입력)와 실제 전설 전투로 끝까지 진행한다.
//  목표 달성 조건(영입·배지 등)만 상태를 직접 맞춰 주고, 수락·보고·전투는 게임 흐름 그대로 거친다.
//  테스트 중에는 저장을 꺼서 저장 데이터를 건드리지 않는다.
// =====================================================================
(function () {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const tap = async k => { Input.press(k); await sl(70); Input.release(k); await sl(70); };
  const QT = window.QT = { log: [], errors: [] };
  const L = (...a) => { QT.log.push(a.join(' ')); };
  window.addEventListener('error', e => QT.errors.push(String(e.message)));

  // 대화·선택지·전투를 끝날 때까지 진행 (선택지는 항상 첫 번째 = 수락)
  async function drain(max = 600) {
    const seen = [];
    let idle = 0;
    for (let i = 0; i < max; i++) {
      await sl(90);
      if (Scene instanceof Battle) {
        const b = Scene, t = UI.top();
        if (t) { if (t instanceof Choice) t.nav.i = 0; if (t instanceof PartyScreen) t.nav.i = Math.max(0, Game.party.findIndex((p, j) => p.hp > 0 && j !== t.o.active)); if (t instanceof MoveForgetScreen) t.nav.i = 4; await tap('a'); continue; }
        if (b.mode === 'command') { b.menuNav.i = 0; await tap('a'); }
        else if (b.mode === 'move') {
          // 상성·자속·명중을 따져 가장 강한 기술
          let bi = 0, bs = -1;
          b.me.moves.forEach((m, k) => { const d = MOVES[m.id]; if (m.pp <= 0) return; const s = d.cat === 'atk' ? d.pow * typeEff(d.type, b.foe.types) * (b.me.types.includes(d.type) ? 1.5 : 1) * d.acc / 100 : 1; if (s > bs) { bs = s; bi = k; } });
          b.moveNav.i = bi; await tap('a');
        }
        continue;
      }
      const t = UI.top();
      if (t instanceof ShopScreen) { t.nav.i = t.stock.length; await tap('a'); continue; } // 상점은 그냥 나간다
      if (t instanceof NumberPick) { await tap('b'); continue; }
      if (t) { idle = 0; if (t.full && seen[seen.length - 1] !== t.full) seen.push(t.full); if (t instanceof Choice) t.nav.i = 0; await tap('a'); continue; }
      if (Scene === World && !World.locked && !Trans.active && ++idle > 4) break;
    }
    return seen;
  }
  function place(e) {
    for (const [dx, dy, d] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) {
      const x = e.x + dx, y = e.y + dy;
      if (!World.blocked(x, y)) { Object.assign(World.player, { x, y, px: x * TILE, py: y * TILE, dir: d, moving: false }); return true; }
    }
    return false;
  }
  async function goMap(map) { if (World.id !== map) { World.load(map, 1, 1, 'down'); await sl(250); } }
  // 지도의 NPC/트레이너/전설에게 다가가 말을 건다
  async function talk(map, id, kind) {
    await goMap(map);
    const e = World.ents.find(x => x.o.id === id && (!kind || x.kind === kind) && World.entActive(x));
    if (!e) throw new Error('엔티티 없음 ' + map + ':' + id);
    e.o.wander = 0; e.moving = false; e.px = e.x * TILE; e.py = e.y * TILE;
    if (!place(e)) throw new Error('접근 불가 ' + map + ':' + id);
    await sl(150);
    await tap('a');
    return drain();
  }
  const st = id => Quests.state(id) || {};
  function expect(cond, msg) { if (!cond) throw new Error('실패: ' + msg); }

  // 메인: 관장 격파 상태를 맞추고, 관장에게 보고 → 다음 관장 퀘스트 수락
  const MAIN = [
    ['m2', 'base', 'constantia', 'gamma'], ['m3', 'gym_gamma', 'gamma', 'beta'], ['m4', 'gym_beta', 'beta', 'delta'], ['m5', 'gym_delta', 'delta', 'zeta'],
    ['m6', 'gym_zeta', 'zeta', 'epsilon'], ['m7', 'gym_epsilon', 'epsilon', 'alpha'], ['m8', 'gym_alpha', 'alpha', 'omega'],
  ];
  // 서브: [id, 목표 달성 함수]
  const SIDE = {
    s_poi: () => { Game.dex.caught.gremlin = 1; },
    s_rhea: () => { Game.party[0].rank = 'A'; },
    s_audrey: () => { DEX_LIST.slice(0, 10).forEach(s => Game.dex.caught[s.key] = 1); },
    s_letter: null,
    s_vanilla: () => { Game.bag.chip = 2; },
    s_merlin: () => { Game.stats.knockouts = (Game.stats.knockouts || 0) + 15; },
    s_tomoe: () => { Game.flags.beat_raven = 1; Game.flags.beat_kheshig = 1; },
    s_shirayuri: () => { Game.dex.caught.miho = 1; },
    s_johanna: () => { Game.dex.caught.hraesvelgr = 1; },
    s_sekhmet: () => { Game.dex.caught.echidna = 1; },
    // 오토바이: 버려진 차 옆 부품을 실제로 조사해서 줍고, 그렘린을 부대에 넣는다
    s_bike: async () => { if (!Game.flags.bike_part) await talk('route1', 'bikepart', 'obj'); if (!Game.party.some(m => m.key === 'gremlin')) Game.party.push(new Mon('gremlin', 30)); },
  };
  const LEGEND_MAP = { hongryun: 'forest', phoenix: 'snowfield', eternity: 'coast', blacklilith: 'nest' };

  // 퀘스트 하나를 의뢰인 → 각 단계 → 완료까지
  async function runQuest(q, satisfy) {
    const before = st(q.id).s;
    if (q.giver && !before) { await talk(q.giver[0], q.giver[1]); expect(st(q.id).s === 'active', q.id + ' 수락'); }
    expect(st(q.id).s === 'active' || st(q.id).s === 'done', q.id + ' 시작 안 됨');
    for (let guard = 0; guard < 8 && st(q.id).s === 'active'; guard++) {
      const step = q.steps[st(q.id).step];
      if (step.at) {
        if (step.check && !step.check(st(q.id)) && satisfy) await satisfy();
        Quests.tick();
        expect(Quests.stepReady(q), q.id + ' 단계 ' + st(q.id).step + ' 준비 안 됨: ' + step.goal);
        const k0 = st(q.id).step;
        await talk(step.at[0], step.at[1]);
        expect(st(q.id).s === 'done' || st(q.id).step > k0, q.id + ' 보고 실패: ' + step.goal);
      } else {
        // 자동 단계: 전설 조우는 실제 전투, 그 외는 조건 충족
        const lg = Object.keys(LEGEND_MAP).find(k => step.goal.includes(SPECIES[k].name) || (k === 'eternity' && step.goal.includes('빛의 정체')) || (k === 'phoenix' && step.goal.includes('불꽃의 새')));
        if (lg) {
          await goMap(LEGEND_MAP[lg]);
          const e = World.ents.find(x => x.kind === 'legend' && x.o.id === lg);
          expect(e && World.entActive(e), lg + ' 전설이 나타나지 않음');
          Game.healAll();
          await talk(LEGEND_MAP[lg], lg, 'legend');
          expect(Game.flags['met_' + lg], lg + ' 전투 결과가 기록되지 않음');
          L('  전설 조우', SPECIES[lg].name, Game.flags['legend_' + lg] ? '(영입)' : '(승리)');
        } else if (step.goal.includes('설원 고지대에 가기')) { await goMap('snowfield'); }
        else if (satisfy) await satisfy();
        Quests.tick();
      }
    }
    expect(st(q.id).s === 'done', q.id + ' 완료 안 됨');
    L('완료', q.type, q.id, q.title);
  }

  QT.run = async function () {
    // 테스트 중에는 저장을 막는다 (같은 포트의 다른 탭 저장 데이터를 건드리지 않도록 백업·복원 대신 저장 자체를 끈다)
    const origSave = Game.save, origSetSave = Settings.save;
    Game.save = () => true; Settings.save = () => { };
    const vol = [Settings.bgm, Settings.sfx, Settings.voice]; Settings.bgm = Settings.sfx = Settings.voice = 0;
    QT.log = []; QT.errors = []; QT.failed = null;
    try {
      for (let i = 0; i < 60 && !(Scene instanceof TitleScene); i++) await sl(200);
      UI.stack.length = 0;
      Game.reset();
      Object.assign(Game.flags, { introDone: 1, hasDex: 1, hintSeen: 1 });
      // 상성이 겹치지 않는 3인 부대 (전설전용). 승급 퀘스트 확인을 위해 선두는 B랭크로 시작
      Game.party = [new Mon('harpy', 70, { trainer: true }), new Mon('gnome', 70, { trainer: true }), new Mon('leona', 70, { trainer: true })];
      Game.party[0].rank = 'B'; Game.party.forEach(m => { m.recalc(); m.hp = m.maxHp; });
      Scene = World; World.load('lab', 6, 4, 'up'); World.locked = false; await sl(300);
      // m1: 자동 시작 → 스타터 선택 → 라비아타 보고
      Quests.tick(); expect(st('m1').s === 'active', 'm1 자동 시작');
      Game.flags.gotStarter = 1; Quests.tick();
      await runQuest(Quests.byId.m1);
      // m2~m8
      for (const [id, , , beat] of MAIN) {
        const q = Quests.byId[id];
        await runQuest(q, () => { Game.flags['beat_' + beat] = 1; if (!Game.badges.includes(beat)) Game.badges.push(beat); });
        if (beat === 'alpha') Game.flags.dokJoined = 1;
      }
      // m9: 흑막 격파 → 엔딩 대신 라비아타 보고
      Game.flags.beat_omega = 1; if (!Game.badges.includes('omega')) Game.badges.push('omega'); Game.flags.resortRed = 1;
      await runQuest(Quests.byId.m9, () => { Game.flags.cleared = 1; Game.flags.beat_mpzeta = 1; });
      // 서브 퀘스트: 모든 트레이너를 이긴 상태에서 진행
      for (const T of Object.keys(TRAINERS)) Game.flags['beat_' + T] = 1;
      for (const [id, fn] of Object.entries(SIDE)) await runQuest(Quests.byId[id], fn);
      // 전설 사이드 스토리 (l_hongryun 은 s_tomoe 완료 후)
      for (const id of ['l_hongryun', 'l_phoenix', 'l_eternity', 'l_blacklilith', 'l_master']) {
        Game.healAll();
        await runQuest(Quests.byId[id]);
      }
      const done = QUESTS.filter(q => Quests.done(q.id)).length;
      L('결과', done + ' / ' + QUESTS.length, '완료');
      QT.result = { done, total: QUESTS.length, errors: QT.errors.slice() };
    } catch (e) {
      QT.failed = String(e.message || e); L('중단', QT.failed);
      QT.result = { failed: QT.failed, done: QUESTS.filter(q => Quests.done(q.id)).length, total: QUESTS.length, errors: QT.errors.slice() };
    } finally {
      [Settings.bgm, Settings.sfx, Settings.voice] = vol;
      UI.stack.length = 0; Scene = new TitleScene(); // 페이지를 떠날 때 자동 저장이 테스트 상태를 저장하지 않도록
      Game.save = origSave; Settings.save = origSetSave;
      QT.restored = true;
    }
    return QT.result;
  };
})();
