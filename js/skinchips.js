// =====================================================================
//  스킨 데이터 칩 (이브이의 진화의 돌처럼)
//  - 모든 캐릭터는 레벨(랭크)로 다음 모습으로 진화한다. 진화하기 전에 묻고, 거부할 수 있다
//  - 갈래가 있는 캐릭터(LRL·발키리·홍련 등)와 럼버제인은 칩으로 원하는 모습을 고를 수도 있다
//  - LRL은 칩에 따라 빨간 두건 · 마왕 · 수영복으로 갈라진다
//  - 야생: 도감에 잡은 모습이 있으면 다음 모습으로 나오고, 단계가 높을수록 훨씬 드물다
//  game.js · world.js · data.js 다음에 로드한다.
// =====================================================================
(function () {
  // 칩 10종 (테마 → 이름·색·설명)
  const CHIPS = {
    wave:   { name: '파도의 데이터 칩', color: '#3fd2ff', desc: '여름 바다의 기록이 담긴 칩. 수영복·해변 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    serve:  { name: '봉사의 데이터 칩', color: '#ff9ec7', desc: '메이드와 카페의 기록. 메이드·카페 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    snow:   { name: '눈꽃의 데이터 칩', color: '#e8f6ff', desc: '한겨울 축제의 기록. 크리스마스·겨울 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    bride:  { name: '순백의 데이터 칩', color: '#fff4dc', desc: '드림위버 컬렉션의 기록. 웨딩·드레스 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    stage:  { name: '무대의 데이터 칩', color: '#ffd23a', desc: '조명과 환호의 기록. 아이돌·무대 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    rest:   { name: '휴일의 데이터 칩', color: '#9be27a', desc: '평범한 하루의 기록. 사복·교복 같은 일상 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    night:  { name: '달밤의 데이터 칩', color: '#a58bff', desc: '달빛 아래의 기록. 고딕·밤·마왕 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    bunny:  { name: '토끼의 데이터 칩', color: '#ff5f8f', desc: '오르카 바니의 기록. 바니 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    arm:    { name: '강화의 데이터 칩', color: '#ff8a3d', desc: '개량 설계도가 담긴 칩. 전투복·개조 기체 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
    tale:   { name: '동화의 데이터 칩', color: '#ff6a5a', desc: '옛이야기의 기록. 동화·요정 모습을 가진 유닛에게 쓰면 그 모습으로 바뀐다.' },
  };
  // 스킨(artKey) → 칩 테마. 원작 스킨 이름과 그림으로 분류했다 (한 유닛 안에서 같은 칩이 겹치지 않게)
  const THEME = {
    gnome_1: 'night', gnome_2: 'bunny', harpy_1: 'wave', harpy_2: 'stage', hyena_1: 'wave', hyena_2: 'rest', gremlin_1: 'rest',
    nymph_1: 'tale', nymph_2: 'night', sylphid_1: 'rest', undine_1: 'snow', undine_2: 'serve', spriggan_1: 'wave', impet_1: 'wave',
    miho_1: 'bride', miho_2: 'tale', bulgasari_1: 'rest', bulgasari_2: 'arm', talonfeather_1: 'snow', talonfeather_2: 'bride',
    hraesvelgr_1: 'stage', hraesvelgr_2: 'wave', perrault_1: 'wave', perrault_2: 'bunny', alice_1: 'wave', alice_2: 'night',
    daika_1: 'bride', bloodypanther_1: 'wave', cheona_1: 'serve', cheona_2: 'rest', phantom_1: 'bunny',
    valkyrie_1: 'night', valkyrie_2: 'wave', valkyrie_3: 'rest', valkyrie_4: 'bride', tyrant_1: 'arm', rampart_1: 'arm', goltarion_1: 'arm',
    lindwurm_1: 'rest', lindwurm_2: 'stage', phoenix_1: 'arm', phoenix_2: 'tale', roc_1: 'arm',
    hongryun_1: 'bride', hongryun_2: 'rest', hongryun_3: 'arm', hongryun_4: 'stage', echidna_1: 'snow', echidna_2: 'bride', echidna_3: 'rest',
    efreeti_1: 'arm', blackhound_1: 'snow', blackhound_2: 'stage', leona_1: 'stage', leona_2: 'bride', leona_3: 'night',
    blacklilith_1: 'serve', eternity_1: 'tale', eternity_2: 'wave', eternity_3: 'stage',
    albatross_1: 'arm', alexandra_1: 'bride', constantia_1: 'serve', erato_1: 'bunny', fallen_1: 'arm', frigga_1: 'rest', habetrot_1: 'wave',
    janghwa_1: 'serve', khan_1: 'arm', kunoichizero_1: 'bunny', lrl_1: 'tale', lrl_2: 'night', lrl_3: 'wave', may_1: 'wave', mercury_1: 'stage',
    muse_1: 'stage', neodym_1: 'night', nightangel_1: 'wave', pa00el_1: 'stage', rena_1: 'bunny', salamander_1: 'rest', saraqael_1: 'wave',
    scathy_1: 'rest', sleipnir_1: 'wave', sonia_1: 'wave', stratoangel_1: 'bunny', lumberjane_1: 'wave',
  };
  // 럼버제인: 원작 수영복 스킨(NS1)을 파도의 데이터 칩으로
  if (!FORMS.lumberjane) FORMS.lumberjane = { dam: false, forms: [{ skin: 'NS1', dam: true, voice: false, icon: false }] };
  Object.assign(FORM_SIZES, { lumberjane_1: [720, 699], lumberjane_1_dam: [720, 667] });
  if (typeof SKIN_NAMES !== 'undefined') SKIN_NAMES.lumberjane_1 = '여름 휴가 럼버제인';
  // LRL: 이브이처럼 칩에 따라 갈라지는 세 모습 (빨간 두건은 원래 있던 1번을 그대로 둬 예전 세이브가 이어진다)
  if (FORMS.lrl) {
    FORMS.lrl.forms = [FORMS.lrl.forms[0], { skin: 'NS3', dam: false, voice: false, icon: true }, { skin: 'NS5', dam: false, voice: false, icon: true }];
    Object.assign(FORM_SIZES, { lrl_2: [502, 720], lrl_3: [691, 720] });
  }
  if (typeof SKIN_NAMES !== 'undefined') Object.assign(SKIN_NAMES, { lrl_1: '빨간 두건 LRL', lrl_2: '어둠의 마왕 LRL', lrl_3: '여름 바다의 LRL' });

  // 아이템 등록: kind 'skin', 칩마다 테마
  for (const [t, c] of Object.entries(CHIPS)) {
    ITEMS['sc_' + t] = { name: c.name, price: 1500, kind: 'skin', theme: t, icon: 'schip', color: c.color, desc: c.desc };
    ITEM_ORDER.push('sc_' + t);
  }
  // 포켓몬처럼 캐릭터마다 진화 방식이 다르다:
  //  - 스킨이 여러 개라 갈래가 생기는 캐릭터(LRL·발키리·홍련 등)와 럼버제인 → 데이터 칩으로만
  //  - 스킨이 하나뿐인 캐릭터 → 예전처럼 레벨로 (칩은 쓸 수 없다)
  const CHIP_EXTRA = new Set(['lumberjane']);
  const chipEvolver = (key) => !!FORMS[key] && (FORMS[key].forms.length > 1 || CHIP_EXTRA.has(key));
  const formOf = (m, theme) => { const f = FORMS[m.key]; if (!f || !chipEvolver(m.key)) return 0; const i = f.forms.findIndex((_, k) => THEME[m.key + '_' + (k + 1)] === theme); return i < 0 ? 0 : i + 1; };
  window.SKIN_CHIP_THEME = THEME;
  window.chipEvolver = chipEvolver;
  window.skinChipFor = (artKey) => THEME[artKey] && chipEvolver(artKey.replace(/_\d+$/, '')) ? 'sc_' + THEME[artKey] : null;

  // 레벨(랭크) 진화는 모든 캐릭터가 한다. 다만 진화를 거부하면 그 레벨에서는 다시 묻지 않는다 (다음 레벨업 때 다시 묻는다)
  const baseCanEvolve = Mon.prototype.canEvolve;
  Mon.prototype.canEvolve = function () { return this.evoRefuse !== this.level && baseCanEvolve.call(this); };
  // 진화하기 전에 진화할지 묻는다. 거부해도 랭크 승급(능력치)은 그대로 오른다
  window.runPromotions = async function () {
    for (const m of [...Game.pendingPromote]) {
      Game.pendingPromote.delete(m);
      if (!Game.party.includes(m) && !Game.box.includes(m)) continue;
      while (m.canPromote() || m.canEvolve()) {
        if (m.canEvolve()) {
          const nx = m.key + '_' + ((m.form || 0) + 1), sn = typeof SKIN_NAMES !== 'undefined' && SKIN_NAMES[nx];
          lazyImg('full', nx);
          const c = await ask('어라...? ' + J(m.name, '의') + ' 모습이 바뀌려 한다!' + (sn ? ' (「' + sn + '」)' : '') + ' 진화시킬까?', ['진화한다', '그만둔다']);
          if (c !== 0) { m.evoRefuse = m.level; await say(J(m.name, '은') + ' 지금 모습 그대로 남았다.'); if (!m.canPromote()) break; }
        }
        await UI.push(new PromotionScreen(m));
      }
    }
  };

  // 칩 사용: 그 테마의 모습이 있고 지금 모습과 다르면 바뀐다. 전투 중에는 못 쓴다
  const baseCan = Game.canUseItem.bind(Game), baseApply = Game.applyItem.bind(Game);
  Game.canUseItem = function (id, m) {
    const it = ITEMS[id];
    if (it && it.kind === 'skin') { if (typeof Battle !== 'undefined' && Scene instanceof Battle) return false; const k = formOf(m, it.theme); return k > 0 && k !== (m.form || 0); }
    return baseCan(id, m);
  };
  Game.applyItem = function (id, m) {
    const it = ITEMS[id];
    if (it && it.kind === 'skin') {
      const k = formOf(m, it.theme); m.form = k;
      const nm = (typeof SKIN_NAMES !== 'undefined' && SKIN_NAMES[m.artKey]) || '새로운 모습';
      return J(m.name, '의') + ' 데이터가 다시 쓰였다! 「' + nm + '」의 모습이 되었다!';
    }
    return baseApply(id, m);
  };
  // 칩을 쓸 때는 반짝이는 연출과 함께 바뀐 그림을 보여 준다
  const baseUseField = Game.useItemField.bind(Game);
  Game.useItemField = async function (id, m) {
    const it = ITEMS[id];
    if (!it || it.kind !== 'skin') return baseUseField(id, m);
    if (!this.canUseItem(id, m)) {
      Audio2.bump();
      await say(formOf(m, it.theme) ? J(m.name, '은') + ' 이미 그 모습이다.' : J(m.name, '에게는') + ' 이 칩에 맞는 모습이 없다.');
      return;
    }
    this.bag[id]--;
    Audio2.sfx('shine', 0.8); FX.doFlash('#ffffff', 0.5);
    await say(this.applyItem(id, m));
  };

  // 도감: 잡은 모습을 비트로 기록한다 (1 = 기본, 2 = 1번 모습, 4 = 2번 모습 ...). 예전 세이브의 1은 기본만 잡은 것
  Game.markForm = function (k, form) { this.dex.seen[k] = 1; this.dex.caught[k] = (this.dex.caught[k] | 0) | (1 << (form || 0)); };
  const baseCaught = Game.markCaught.bind(Game);
  Game.markCaught = function (k) {
    baseCaught(k);
    const foe = typeof Battle !== 'undefined' && Scene instanceof Battle && Scene.foe && Scene.foe.key === k ? Scene.foe : null;
    this.markForm(k, foe ? foe.form || 0 : 0);
  };
  // 야생: 잡은 모습 다음 단계로 나온다. 단계가 높을수록 훨씬 드물다 (1단계 ×0.25, 2단계 ×0.06 ...)
  const STAGE_MUL = 0.25;
  const nextStage = (key) => {
    const f = FORMS[key]; if (!f) return 0;
    const bits = Game.dex.caught[key] | 0;
    for (let k = 0; k <= f.forms.length; k++) if (!(bits & (1 << k))) return k;
    return 0; // 모든 모습을 잡았으면 다시 기본 모습으로
  };
  // 아주 드물게(조우 0.3%) 아직 잡지 않은 전설 바이오로이드가 수풀에서 나타난다 (램파리온은 라비아타의 선물이라 제외)
  const WILD_LEGENDS = ['phoenix', 'hongryun', 'blacklilith', 'eternity'], LEGEND_RATE = 0.003;
  async function legendEncounter(world, table) {
    const pool = WILD_LEGENDS.filter(k => SPECIES[k] && !Game.dex.caught[k]);
    if (!pool.length) return false;
    const key = pool[Math.floor(Math.random() * pool.length)], lv = Math.max(table.lv[1] + 8, 18);
    world.locked = true;
    try {
      Audio2.stopBgm(300); FX.doFlash('#ffffff', 0.6);
      await say('...!! 수풀 너머에서 강렬한 링크 반응이 느껴진다!');
      await startBattle({ kind: 'wild', foes: [new Mon(key, lv, { trainer: true })], bg: world.def.bg, bgm: 'legend', legend: true, expMul: table.expMul || 1 });
    } finally { world.locked = false; world.encCool = 1.2; }
    return true;
  }
  World.wildBattle = async function (table) {
    if (Math.random() < LEGEND_RATE && await legendEncounter(this, table)) return;
    const list = table.list.map(([k, w]) => { const s = nextStage(k); return [k, w * Math.pow(STAGE_MUL, s), s]; });
    let total = list.reduce((s, x) => s + x[1], 0), r = Math.random() * total, pick = list[0];
    for (const x of list) { if ((r -= x[1]) < 0) { pick = x; break; } }
    const lv = randi(table.lv[0], table.lv[1]), m = new Mon(pick[0], lv);
    if (pick[2]) m.form = pick[2];
    this.locked = true;
    try { await startBattle({ kind: 'wild', foes: [m], bg: this.def.bg, expMul: table.expMul || 1 }); }
    finally { this.locked = false; this.encCool = 1.2; }
  };

  // 관장 첫 승리 보상: 관장 테마의 칩 (챔피언 오메가는 4종)
  const GYM_CHIPS = { gamma: ['arm'], beta: ['night'], delta: ['stage'], zeta: ['wave'], epsilon: ['rest'], alpha: ['bride'], omega: ['tale', 'snow', 'serve', 'bunny'] };
  window.giveGymChips = async function (id) {
    const list = GYM_CHIPS[id]; if (!list) return;
    for (const t of list) Game.addItem('sc_' + t, 1);
    Audio2.sfx('item_get', 0.8);
    await say('사령관은 ' + J(list.map(t => CHIPS[t].name).join(', '), '을') + ' 받았다!');
  };
  // 야생 드롭: 스킨이 있는 야생 유닛을 쓰러뜨리면 그 테마의 칩을 떨어뜨릴 때가 있다
  //  - 스킨 모습으로 나온 유닛: 그 모습의 칩 25%
  //  - 기본 모습: 그 유닛 스킨 테마 중 하나 8%
  const baseGiveExp = Battle.prototype.giveExp;
  Battle.prototype.giveExp = async function (foe, caught) {
    await baseGiveExp.call(this, foe, caught);
    if (caught || this.kind !== 'wild' || !foe || !FORMS[foe.key]) return;
    const themes = FORMS[foe.key].forms.map((_, k) => THEME[foe.key + '_' + (k + 1)]).filter(Boolean);
    if (!themes.length) return;
    const cur = foe.form && THEME[foe.artKey];
    const t = cur && Math.random() < 0.25 ? cur : !cur && Math.random() < 0.08 ? themes[Math.floor(Math.random() * themes.length)] : null;
    if (!t) return;
    Game.addItem('sc_' + t, 1);
    Audio2.sfx('item_get', 0.6);
    await say(J(foe.name, '이') + ' 떨어뜨린 ' + J(CHIPS[t].name, '을') + ' 주웠다!', { auto: 1200 });
  };

  // 상점: 오르카 보급소는 LRL 칩 3종, 항구 보급소는 10종 모두
  window.SKIN_CHIP_STOCK = (mapId) => mapId === 'shop1' ? ['sc_tale', 'sc_night', 'sc_wave'] : mapId === 'shop2' ? Object.keys(CHIPS).map(t => 'sc_' + t) : [];

  // 1번 폐도로에서 LRL이 자주 나온다
  const r1 = ENCOUNTERS.route1 && ENCOUNTERS.route1.list.find(x => x[0] === 'lrl');
  if (r1) r1[1] = 14; else if (ENCOUNTERS.route1) ENCOUNTERS.route1.list.push(['lrl', 14]);
})();
