// =====================================================================
//  스킨 데이터 칩: 레벨이 아니라 칩으로 모습(스킨)이 바뀐다 (이브이의 진화의 돌처럼)
//  - 칩마다 테마가 있고, 그 테마의 스킨을 가진 유닛에게 쓰면 그 모습으로 바뀐다 (어느 모습에서든)
//  - LRL은 칩에 따라 빨간 두건 · 마왕 · 수영복으로 갈라진다
//  - 랭크 승급(B→A→S)은 그대로 레벨로 오른다
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
  const formOf = (m, theme) => { const f = FORMS[m.key]; if (!f) return 0; const i = f.forms.findIndex((_, k) => THEME[m.key + '_' + (k + 1)] === theme); return i < 0 ? 0 : i + 1; };
  window.SKIN_CHIP_THEME = THEME;
  window.skinChipFor = (artKey) => THEME[artKey] ? 'sc_' + THEME[artKey] : null;

  // 레벨로 모습이 바뀌던 진화는 끈다 (랭크 승급만 레벨로)
  Mon.prototype.canEvolve = function () { return false; };

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
  World.wildBattle = async function (table) {
    const list = table.list.map(([k, w]) => { const s = nextStage(k); return [k, w * Math.pow(STAGE_MUL, s), s]; });
    let total = list.reduce((s, x) => s + x[1], 0), r = Math.random() * total, pick = list[0];
    for (const x of list) { if ((r -= x[1]) < 0) { pick = x; break; } }
    const lv = randi(table.lv[0], table.lv[1]), m = new Mon(pick[0], lv);
    if (pick[2]) m.form = pick[2];
    this.locked = true;
    try { await startBattle({ kind: 'wild', foes: [m], bg: this.def.bg, expMul: table.expMul || 1 }); }
    finally { this.locked = false; this.encCool = 1.2; }
  };

  // 상점: 오르카 보급소는 LRL 칩 3종, 항구 보급소는 10종 모두
  window.SKIN_CHIP_STOCK = (mapId) => mapId === 'shop1' ? ['sc_tale', 'sc_night', 'sc_wave'] : mapId === 'shop2' ? Object.keys(CHIPS).map(t => 'sc_' + t) : [];

  // 1번 폐도로에서 LRL이 자주 나온다
  const r1 = ENCOUNTERS.route1 && ENCOUNTERS.route1.list.find(x => x[0] === 'lrl');
  if (r1) r1[1] = 14; else if (ENCOUNTERS.route1) ENCOUNTERS.route1.list.push(['lrl', 14]);
})();
