// =====================================================================
//  라켓몬스터 리그: 레모네이드 관장 7자매 · 사령관 독점단 · 레몬 하트 배지의 비밀
//  maps.js / game.js 다음에 로드되어 맵·트레이너·스크립트를 리그 스토리로 바꾼다.
// =====================================================================
(function () {
  // ---------------------------------------------------------------
  //  레몬 하트 배지
  // ---------------------------------------------------------------
  BADGES.length = 0;
  [['gamma', '감마', '#ff6b6b'], ['beta', '베타', '#7fd8ff'], ['delta', '델타', '#ff9a3d'], ['zeta', '제타', '#ffe14d'],
   ['epsilon', '엡실론', '#8ff0c0'], ['alpha', '알파', '#ff7ad0'], ['omega', '오메가', '#c08aff']]
    .forEach(([id, n, color]) => BADGES.push({ id, name: '레몬 하트 배지 · ' + n, color }));

  // ---------------------------------------------------------------
  //  트레이너
  // ---------------------------------------------------------------
  const L = (k) => 'lemon' + k;
  Object.assign(TRAINERS, {
    // 1. 감마 체육관 (1번 폐도로)
    merlin: { name: '멀린', title: '감마 체육관 참모', portrait: 'merlin', team: [['hyena', 8], ['gremlin', 9]], prize: 520,
      intro: '히힛, 아서 등장! 감마 대장님한테 가려면 PECS의 대악당 겸 오르카의 귀염둥이, 천재 멀린부터 넘어야지!', lose: '어라라? 천재의 계산이 틀렸다고? ...히힛, 좋아, 인정! 역시 아서야.', after: '감마 대장님은 정면 승부를 좋아해. 아서도 꼼수 쓰지 말고 제대로 치고 받아 봐!', rematch: ['또 왔어, 아서? 천재 멀린이 새 작전을 짜 뒀지!', '싸움이라고? 그럼 내가 빠질 수 없지!', '히힛... 또 졌네. 그래도 재밌었어, 아서!'] },
    gamma: { name: '레모네이드 감마', title: '감마 체육관 관장', portrait: L('gamma'), team: [['brownie', 5], ['sylphid', 6], [L('gamma'), 8]], prize: 2000, boss: true, badge: 'gamma', bgm: 'boss', voice: L('gamma'),
      intro: '', lose: '', after: '하하하! 언제든 다시 오게, 오르카의 사령관. 이 몸이 상대해 주지!' },
    // 2. 베타 체육관 (엘프의 숲)
    shepherd: { name: '잉글리쉬 셰퍼드', title: '베타 체육관 부관', portrait: 'shepherd', team: [['pixie', 13], ['nymph', 13]], prize: 900,
      intro: '여! 반가워 사령관. 난 잉글리쉬 셰퍼드, 레모네이드 베타의 부관이야. 베타 만나려면 나부터 이기고 가.', lose: '쓰읍.. 생각보다 하는데? 에이, 졌다 졌어.', after: '베타는 겁이 많아서 말이야. 너무 몰아붙이진 마, 사령관.', rematch: ['또 왔네, 사령관? 좋아, 한 판 더 붙자.', '이번엔 안 봐준다?', '쓰읍.. 또 졌네. 너 진짜 세다.'] },
    beta: { name: '레모네이드 베타', title: '베타 체육관 관장', portrait: L('beta'), team: [['undine', 14], ['nymph', 14], [L('beta'), 16]], prize: 2600, boss: true, badge: 'beta', bgm: 'boss', voice: L('beta'),
      intro: '', lose: '', after: '주, 주인님... 다음에도 또 와 주실 거죠...?' },
    // 3. 델타 체육관 (항구 마을)
    delta: { name: '레모네이드 델타', title: '델타 체육관 관장', portrait: L('delta'), team: [['miho', 17], ['talonfeather', 17], ['lindwurm', 18], [L('delta'), 19]], prize: 3200, boss: true, badge: 'delta', bgm: 'boss', voice: L('delta'),
      intro: '', lose: '', after: '유세떨기는. 다음엔 내 마리오네트가 널 무대 밖으로 끌어낼 거야.' },
    // 4. 제타 체육관 (폐허 해안)
    hestia: { name: '헤스티아', title: '제타 연구소 부관', portrait: 'hestia', team: [['gigantes', 21], ['valkyrie', 21]], prize: 1600,
      intro: '다시 만났군요, 오르카의 사령관. 어머니의 연구소에 들어오시려면 먼저 제 평가를 통과하셔야 합니다.', lose: '...솔직한 평가를 말씀드리면, 훌륭했습니다. 착각하지 말아주시기를. 칭찬이 아니라 관측 결과입니다.', after: '어머니는 상금을 깎으실 겁니다. 비효율적이라시면서요... 저는 그 점이 마음에 들지 않습니다.', rematch: ['또 오셨군요, 오르카의 사령관. 재평가를 원하십니까?', '이번에는 전력으로 상대하겠습니다.', '...역시 당신이군요. 인정하겠습니다.'] },
    zeta: { name: '레모네이드 제타', title: '제타 체육관 관장', portrait: L('zeta'), team: [['gigantes', 21], ['goltarion', 22], ['valkyrie', 22], [L('zeta'), 24]], prize: 1200, boss: true, badge: 'zeta', bgm: 'boss', voice: 'mpzeta',
      intro: '', lose: '', after: '관측은 계속돼요. 당신은 여전히 흥미로운 표본이군요.' },
    // 5. 엡실론 체육관 (폐공장 지대)
    // 원작에서 엡실론의 부관인 이레이나(오비탈 와쳐 II). 사령관을 '마왕 오빠'라 부르는 용사 게이머
    ireina: { name: '이레이나', title: '엡실론 체육관 관원', portrait: 'ireina', team: [['hraesvelgr', 25], ['roc', 25]], prize: 1800,
      intro: '또 도전하러 온 거야…? 엡실론 언니는 지금 자는 중이야… 깨우고 싶으면 이레이나부터 공략해 봐, 마왕 오빠…!', lose: '으으… 게임 오버… 마왕 오빠, 생각보다 레벨 높잖아… 흥, 다음엔 공략법 연구해 올 거야…!', after: '엡실론 언니 앞에서 물 얘기는 금지야… 화나면 세이브 데이터 날아가니까… 진짜로.', rematch: ['마왕 오빠, 또 왔어…? 좋아, 몇 번이고 받아줄게… 이레이나는 숨지도 도망치지도 않으니까…!', '이번엔 공략 완벽해… 용사 이레이나의 진짜 실력, 보여 줄게!', '또 졌어… 흥! 치사해! …그래도 재밌었어. 한 판 더 해 줄 거지…?'] },
    epsilon: { name: '레모네이드 엡실론', title: '엡실론 체육관 관장', portrait: L('epsilon'), team: [['talonfeather', 26], ['roc', 26], ['hraesvelgr', 27], [L('epsilon'), 28]], prize: 3800, boss: true, badge: 'epsilon', bgm: 'boss', voice: L('epsilon'),
      intro: '', lose: '', after: '...사령관, 한 판 더? 아니 게임 말이야, 게임.' },
    // 6. 알파 체육관 (설원 고지대)
    shirayuri: { name: '시라유리', title: '알파 체육관 시녀', portrait: 'shirayuri', team: [['phantom', 29], ['blackhound', 29]], prize: 2100,
      intro: '알파 님께서는 아무나 만나 주지 않으십니다. 실력으로 증명하세요.', lose: '...알파 님께서 기뻐하시겠네요.', after: '알파 님의 미소는... 늘 무언가를 숨기고 계세요. 제 수첩에도 아직 적지 못한 비밀이에요.', rematch: ['사령관님, 다시 오셨군요. 수첩에 적어 둔 대책을 시험해 봐도 될까요?', '이번엔 실수 없이 가겠습니다. ...토모 양도 없으니까요.', '...졌네요. 이 결과도 수첩에 적어 둘게요. 하아.'] },
    alpha: { name: '레모네이드 알파', title: '알파 체육관 관장 · 관장 협회장', portrait: L('alpha'), team: [['phoenix', 30], ['miho', 30], ['bloodypanther', 27], [L('alpha'), 32]], prize: 4400, boss: true, badge: 'alpha', bgm: 'boss', voice: L('alpha'),
      intro: '', lose: '', after: '우후후... 사령관님, 조심하세요. 이제부터는 저도 모르는 일이 벌어질 테니까요.' },
    // 7. 챔피언 오메가 (레모네이드 리조트)
    omega: { name: '레모네이드 오메가', title: '레모네이드 리그 챔피언', portrait: L('omega'), team: [['tyrant', 31], ['fafnir', 31], ['leona', 33], ['valkyrie', 32], [L('omega'), 36]], prize: 9999, boss: true, badge: 'omega', bgm: 'final',
      intro: '', lose: '', after: '...한 번 더요? 사양할게요, 인간님. 오늘은 술이나 마실 거니까요.' },
    yumi: { name: '커넥터 유미', title: '챔피언 홀 비서', portrait: 'bs', team: [['phantom', 32], ['valkyrie', 32]], prize: 2400,
      intro: '앗, 사령관님! 오메가 님을 만나시려면 비서인 저를 먼저 거치셔야 해요. 쬐~끔 힘들어도 일은 일이니까요!', lose: '꺅... 졌네요. 헤헷, 그래도 나름 보람 있는 승부였답니다?', after: '오메가 님 앞에서는 조심하세요. 저는... 이제 퇴근하고 싶어요. 하암.', rematch: ['절 찾으셨어요? 오늘 야근이라 쬐~끔 예민하답니다?', '헤헷, 제가 안 가면 누가 가겠어요!', '하암... 졌어요. 퇴근하고 맥주나 마셔야겠어요.'] },
    // 사령관 독점단
    dok1: { name: '사령관 독점단 브라우니', title: '사령관 독점단 (마스코트)', portrait: 'brownie', team: [['brownie', 6], ['brownie', 7], ['brownie', 7]], prize: 300,
      intro: '', lose: '', after: '브, 브라우니는 아직 포기 안 했지 말입니다!', rematch: ['거기 서십쇼, 사령관님! 브라우니 부대, 재출격하지 말입니다!', '이번엔 진짜 안 지지 말입니다!', '또 졌지 말입니다아아~!'] },
    dok2: { name: '드라큐리나', title: '사령관 독점단', portrait: 'draculina', team: [['bloodypanther', 17], ['impet', 17], ['phantom', 18]], prize: 1500,
      intro: '', lose: '', after: '흥! 이 드라큐리나 님은 아직 끝나지 않았어!', rematch: ['거기 너! 이 드라큐리나 님이 다시 상대해 주지. 영광으로 알라고!', '이번엔 무대 준비도 완벽해!', '흥! 오늘은 봐준 거야! ...토마토 주스 사 와.'] },
    dok3: { name: '세크메트', title: '사령관 독점단', portrait: 'sekhmet', team: [['echidna', 25], ['efreeti', 25], ['rampart', 26]], prize: 2000,
      intro: '', lose: '', after: '폐하, 이 어미는 폐하가 걱정될 뿐입니다...', rematch: ['폐하, 이 어미가 다시 시험을 준비했습니다. 받아 주시겠습니까?', '이번에는 봐 드리지 않겠습니다, 폐하.', '역시 폐하... 이 어미는 기쁩니다.'] },
    // 흑막
    mpzeta: { name: '융합체 제타', title: '???', portrait: 'mpzeta', team: [], prize: 0, boss: true, bgm: 'final', voice: 'mpzeta',
      intro: '', lose: '', after: '' },
  });
  // 원작 표기
  if (TRAINERS.draculina) TRAINERS.draculina.name = '드라큐리나';

  // ---------------------------------------------------------------
  //  체육관 실내 (원작 기지 시설 방)
  // ---------------------------------------------------------------
  Object.assign(ROOMS, {
    gym_gamma:   { img: 'rein3_0', fl: 350, wall: ['#3e3640', '#6c6070'], rug: ['#6e2f35', '#ff8a6a'], floor: ['#c9c6c8'], props: {}, extra: [['iron1_5', 2, 1, 1], ['iron1_5', 10, 1, 1]] },
    gym_beta:    { img: 'dis2_0', fl: 350, wall: ['#2c5f57', '#4a9a8c'], rug: ['#2f5f78', '#7fd8ff'], floor: ['#d7dcdb'], props: {}, extra: [['andr1_11', 2, 1, 2], ['andr2_42', 10, 1, 1]] },
    gym_delta:   { img: 'cafe5_0', fl: 268, wall: ['#8f877a', '#ece7de'], rug: ['#8a3a4a', '#ffb0c8'], floor: ['#eeece8'], floorTint: 'rgba(140,60,90,0.10)', props: {}, extra: [['cafe2_2', 2, 1, 2], ['cafe4_3', 10, 1, 1]] },
    gym_zeta:    { img: 'nutr_0', fl: 400, wall: ['#3d5c55', '#7aa89a'], rug: ['#355a3a', '#b8ff7a'], floor: ['#cfe0dc'], props: {}, extra: [['andr1_1', 1, 1, 2], ['andr1_0', 10, 1, 2]] },
    gym_epsilon: { img: 'power_0', fl: 400, wall: ['#46506e', '#8a94b8'], rug: ['#2a3460', '#8ff0c0'], floor: ['#c6cad8'], props: {}, extra: [['andr1_13', 1, 1, 3], ['mk4_1', 10, 1, 1]] },
    gym_alpha:   { img: 'iron1_0', fl: 375, sw: 600, wall: ['#7c4d5a', '#d79aa8'], rug: ['#8a2f5a', '#ffb0d8'], floor: ['#e8d4d8'], props: {}, extra: [['cafe5_2', 2, 1, 2], ['mk4_2', 10, 1, 2]] },
    gym_omega:   { img: 'mk0_0', fl: 300, sh: 455, wall: ['#2e4d52', '#6a9aa0'], rug: ['#4a2a6a', '#c08aff'], floor: ['#c8d4d6'], props: {}, extra: [['andr2_0', 1, 1, 3], ['andr2_1', 9, 1, 3]] },
  });
  function makeGym(id, name, leader, staff, back, bgm) {
    const g = interior(13, 11, 6);
    g.rect(5, 3, 3, 7, 'c');
    MAPS[id] = {
      name, theme: 'indoor', bgm: bgm || 'center', bg: 'base', rows: g.rows(), indoor: 1,
      objects: [
        { t: 'exit', x: 6, y: 10, to: back },
        { t: 'trainer', id: leader.id, sprite: leader.sprite, x: 6, y: 2, dir: 'down', sight: 2, boss: 1, stay: 1 },
        { t: 'trainer', id: staff.id, sprite: staff.sprite, x: 4, y: 6, dir: 'right', sight: 2 },
        { t: 'sign', x: 2, y: 8, text: name + '\n도전자 규정: 관장을 이기는 자에게 하룻밤을 허락한다.\n— 레모네이드 관장 협회' },
      ],
    };
  }
  makeGym('gym_gamma', '감마 체육관', { id: 'gamma', sprite: L('gamma') }, { id: 'merlin', sprite: 'merlin' }, ['route1', 5, 5, 'down']);
  makeGym('gym_beta', '베타 체육관', { id: 'beta', sprite: L('beta') }, { id: 'shepherd', sprite: 'shepherd' }, ['forest', 30, 12, 'down']);
  makeGym('gym_delta', '델타 체육관', { id: 'delta', sprite: L('delta') }, { id: 'none', sprite: '' }, ['harbor', 11, 5, 'down']);
  MAPS.gym_delta.objects = MAPS.gym_delta.objects.filter(o => o.id !== 'none'); // 델타는 부관 없이 혼자 무대를 지킨다
  makeGym('gym_zeta', '제타 체육관', { id: 'zeta', sprite: L('zeta') }, { id: 'hestia', sprite: 'hestia' }, ['coast', 35, 10, 'down']);
  makeGym('gym_epsilon', '엡실론 체육관', { id: 'epsilon', sprite: L('epsilon') }, { id: 'ireina', sprite: 'ireina' }, ['factory', 23, 6, 'down']);
  // 엡실론 체육관 관원이 펜리르에서 이레이나로 바뀌었다: 예전 세이브의 승리 기록을 이어 간다
  const loadBeforeIreina = Game.load;
  Game.load = function () { const ok = loadBeforeIreina.apply(this, arguments); if (ok && this.flags.beat_fenrir) this.flags.beat_ireina = 1; return ok; };
  // 체육관 관원을 원작 부관으로 바꿨다 (감마 토모→멀린, 베타 멀린→잉글리쉬 셰퍼드, 제타 아탈란테→헤스티아): 예전 승리 기록을 옮긴다
  const loadBeforeAdjutants = Game.load, resetBeforeAdjutants = Game.reset;
  Game.reset = function () { const r = resetBeforeAdjutants.apply(this, arguments); this.flags.staff2 = 1; this.flags.poiSwap = 1; return r; };
  // 엘프의 숲 트레이너가 포츈에서 포이로 바뀌었다 (캠프 NPC는 포츈): 예전 승리 기록을 옮긴다
  const loadBeforePoiSwap = Game.load;
  Game.load = function () { const ok = loadBeforePoiSwap.apply(this, arguments), f = this.flags; if (ok && !f.poiSwap) { if (f.beat_fortune) f.beat_poi = 1; f.poiSwap = 1; } return ok; };
  Game.load = function () {
    const ok = loadBeforeAdjutants.apply(this, arguments), f = this.flags;
    if (ok && !f.staff2) { const old = { t: f.beat_tomoe, m: f.beat_merlin, a: f.beat_atalanta }; delete f.beat_merlin; if (old.t) f.beat_merlin = 1; if (old.m) f.beat_shepherd = 1; if (old.a) f.beat_hestia = 1; f.staff2 = 1; }
    return ok;
  };
  makeGym('gym_alpha', '알파 체육관', { id: 'alpha', sprite: L('alpha') }, { id: 'shirayuri', sprite: 'shirayuri' }, ['snowfield', 8, 8, 'down']);
  makeGym('gym_omega', '챔피언 홀', { id: 'omega', sprite: L('omega') }, { id: 'yumi', sprite: 'bs' }, ['resort', 13, 9, 'down'], 'boss');

  // ---------------------------------------------------------------
  //  기존 맵 수정: 체육관 건물 · 길막이 · 독점단
  // ---------------------------------------------------------------
  const objs = (id) => MAPS[id].objects;
  const drop = (id, f) => { MAPS[id].objects = objs(id).filter(o => !f(o)); };
  const barrier = (x, y, w, h, flag) => ({ t: 'deco', kind: 'barrier', x, y, w, h, block: 1, cond: '!' + flag });
  // 1번 폐도로: 감마 체육관 + 숲 입구 바리케이드 + 독점단 1차
  objs('route1').push(
    { t: 'building', x: 3, y: 2, w: 5, h: 3, style: 'gym', art: 'school', label: '감마 체육관', door: 5, to: ['gym_gamma', 6, 9] },
    barrier(11, 2, 2, 1, 'beat_gamma'),
    { t: 'trainer', id: 'dok1', sprite: 'brownie', x: 8, y: 25, dir: 'left', sight: 1, zone: [6, 25, 2, 1], boss: 1 },
  );
  MAPS.route1.rows = MAPS.route1.rows.map((r, y) => (y >= 2 && y <= 4) ? r.slice(0, 3) + '.....' + r.slice(8) : r);
  // 엘프의 숲: 베타 체육관 (출구 앞 트레이너 → 건물)
  drop('forest', o => o.id === 'beta' || o.kind === 'log');
  objs('forest').push(
    { t: 'building', x: 28, y: 9, w: 5, h: 3, style: 'gym', art: 'gym_beta', label: '베타 체육관', door: 30, to: ['gym_beta', 6, 9] },
    barrier(34, 13, 1, 2, 'beat_beta'),
  );
  // 항구 마을: 델타 체육관 + 해안 바리케이드 + 독점단 2차
  objs('harbor').push(
    { t: 'building', x: 8, y: 2, w: 6, h: 3, style: 'gym', art: 'gym_delta', label: '델타 체육관', door: 11, to: ['gym_delta', 6, 9] },
    barrier(26, 10, 1, 2, 'beat_delta'),
    { t: 'trainer', id: 'dok2', sprite: 'draculina', x: 20, y: 9, dir: 'down', sight: 1, zone: [19, 10, 3, 2], boss: 1 },
  );
  // 폐허 해안: 제타 체육관, 동굴 → 폐공장
  drop('coast', o => o.id === 'zeta' || (o.t === 'warp' && o.to[0] === 'nest'));
  objs('coast').push(
    { t: 'building', x: 33, y: 7, w: 5, h: 3, style: 'gym', art: 'gym_zeta', label: '제타 체육관', door: 35, to: ['gym_zeta', 6, 9] },
    barrier(36, 4, 1, 1, 'beat_zeta'),
    { t: 'warp', x: 36, y: 3, w: 1, h: 1, to: ['factory', 16, 22, 'up'] },
    { t: 'deco', kind: 'sprite', art: 'stop', x: 8, y: 13, w: 1, h: 1, block: 1, k: 1.3 },
  );
  objs('coast').forEach(o => { if (o.t === 'sign' && o.x === 7) o.text = '폐허 해안\n동쪽 끝 동굴: 폐공장 지대로 이어지는 지하 통로'; if (o.t === 'obj' && o.kind === 'healpod') { o.x = 30; o.y = 10; } });
  // 둥지: 리조트 지하의 흑막 기지로
  drop('nest', o => ['draculina', 'sekhmet', 'omega'].includes(o.id));
  objs('nest').forEach(o => { if (o.t === 'exit') o.to = ['resort', 20, 15, 'down']; });
  objs('nest').push({ t: 'trainer', id: 'mpzeta', sprite: 'mpzeta', x: 14, y: 3, dir: 'down', sight: 3, boss: 1, zone: [13, 4, 4, 4] });
  MAPS.nest.name = '리조트 지하 · 철충 둥지';

  // ---------------------------------------------------------------
  //  새 맵: 폐공장 지대 / 설원 고지대 / 레모네이드 리조트
  // ---------------------------------------------------------------
  (function () {
    const g = new Grid(32, 24, '.');
    g.border('W', 1);
    g.v2(15, 0, 23, '=');                       // 남북 대로
    g.h2(3, 28, 12, '=');                       // 동서 도로
    g.rect(19, 2, 9, 5, 'M');                   // 체육관 앞마당
    g.blob(6, 6, 4, 3, '"', 31, '.'); g.blob(25, 17, 4, 3, '"', 32, '.'); g.blob(6, 18, 3, 3, '"', 33, '.');
    g.scatter('R', 0.04, '.', 34); g.scatter('x', 0.03, '.', 35);
    g.rect(17, 2, 2, 6, '.'); g.rect(19, 7, 9, 1, 'M'); g.set(17, 16, '.'); g.set(13, 14, '.'); g.rect(17, 5, 2, 1, '=');
    for (let x = 2; x < 12; x += 3) g.set(x, 10, 'W');
    MAPS.factory = {
      name: '폐공장 지대', theme: 'factory', bgm: 'coast', amb: 'hum', bg: 'coast', rows: g.rows(), enc: 'factory',
      objects: [
        { t: 'warp', x: 15, y: 23, w: 2, h: 1, to: ['coast', 36, 4, 'down'] },
        { t: 'warp', x: 15, y: 0, w: 2, h: 1, to: ['snowfield', 15, 24, 'up'] },
        barrier(15, 1, 2, 1, 'beat_epsilon'),
        { t: 'building', x: 20, y: 2, w: 6, h: 4, style: 'factory', art: 'gym_epsilon', label: '엡실론 체육관', door: 23, to: ['gym_epsilon', 6, 9] },
        { t: 'obj', kind: 'healpod', x: 13, y: 14, block: 1 },
        { t: 'trainer', id: 'dok3', sprite: 'sekhmet', x: 17, y: 16, dir: 'left', sight: 1, zone: [15, 16, 2, 1], boss: 1 },
        { t: 'sign', x: 13, y: 20, text: '폐공장 지대\n북쪽: 설원 고지대 / 동쪽 건물: 엡실론 체육관' },
        { t: 'item', id: 'f_kit2', x: 3, y: 3, item: 'kit2', n: 2 }, { t: 'item', id: 'f_core2', x: 28, y: 21, item: 'core2', n: 3 },
      ],
    };
  })();
  (function () {
    const g = new Grid(32, 26, '.');
    g.border('P', 2);
    g.v2(15, 0, 25, '_');
    g.h2(5, 15, 9, '_', 1);
    g.blob(24, 8, 4, 4, '"', 41, '.'); g.blob(7, 18, 4, 3, '"', 42, '.'); g.blob(24, 20, 3, 3, '"', 43, '.');
    g.blob(9, 14, 2, 2, '~', 44, '.');
    g.scatter('P', 0.05, '.', 45); g.scatter('r', 0.02, '.', 46);
    for (let x = 4; x <= 12; x++) for (let y = 3; y <= 9; y++) if (g.get(x, y) === 'P' || g.get(x, y) === 'r') g.set(x, y, '.');
    g.set(17, 12, '.'); g.set(27, 4, '.'); g.set(4, 22, '.');
    MAPS.snowfield = {
      name: '설원 고지대', theme: 'snow', bgm: 'forest', amb: 'wind', bg: 'forest', rows: g.rows(), enc: 'snowfield', ambient: 'snow',
      objects: [
        { t: 'warp', x: 15, y: 25, w: 2, h: 1, to: ['factory', 15, 1, 'down'] },
        { t: 'warp', x: 15, y: 0, w: 2, h: 1, to: ['resort', 13, 18, 'up'] },
        barrier(15, 2, 2, 1, 'beat_alpha'),
        { t: 'building', x: 5, y: 4, w: 6, h: 4, style: 'gym', art: 'gym_alpha', label: '알파 체육관', door: 8, to: ['gym_alpha', 6, 9] },
        { t: 'obj', kind: 'healpod', x: 17, y: 12, block: 1 },
        { t: 'sign', x: 14, y: 22, text: '설원 고지대\n북쪽: 레모네이드 리조트 (관장 배지 6개 이상)' },
        { t: 'item', id: 's_revive', x: 27, y: 4, item: 'revive', n: 2 }, { t: 'item', id: 's_cell', x: 4, y: 22, item: 'cell', n: 2 },
      ],
    };
  })();
  (function () {
    const g = new Grid(28, 20, '.');
    g.border('T', 2);
    g.v2(13, 9, 19, '_', 2);
    g.rect(8, 9, 12, 4, ':');
    g.rect(3, 12, 4, 4, '~'); g.rect(21, 12, 4, 4, '~');
    g.scatter(',', 0.12, '.', 51);
    MAPS.resort = {
      name: '레모네이드 리조트', theme: 'resort', bgm: 'town', amb: 'sea', bg: 'base', rows: g.rows(),
      objects: [
        { t: 'warp', x: 13, y: 19, w: 2, h: 1, to: ['snowfield', 15, 1, 'down'] },
        { t: 'building', x: 9, y: 3, w: 10, h: 5, style: 'champion', label: '챔피언 홀', door: 13, to: ['gym_omega', 6, 9] },
        { t: 'deco', kind: 'lamp', x: 8, y: 8, w: 1, h: 1, block: 1 }, { t: 'deco', kind: 'lamp', x: 19, y: 8, w: 1, h: 1, block: 1 },
        { t: 'deco', kind: 'sprite', art: 'palm1', x: 3, y: 10, w: 1, h: 1, block: 1, k: 2.6 }, { t: 'deco', kind: 'sprite', art: 'palm2', x: 7, y: 15, w: 1, h: 1, block: 1, k: 2.2 },
        { t: 'deco', kind: 'sprite', art: 'palm1', x: 24, y: 10, w: 1, h: 1, block: 1, k: 2.6 }, { t: 'deco', kind: 'sprite', art: 'palm2', x: 18, y: 16, w: 1, h: 1, block: 1, k: 2.2 },
        { t: 'deco', kind: 'sprite', art: 'cherry', x: 4, y: 5, w: 2, h: 1, block: 1, k: 1.6 }, { t: 'deco', kind: 'sprite', art: 'cherry', x: 21, y: 5, w: 2, h: 1, block: 1, k: 1.6 },
        { t: 'deco', kind: 'sprite', art: 'bench', x: 10, y: 13, w: 1, h: 1, block: 1, k: 1.4 }, { t: 'deco', kind: 'sprite', art: 'bench', x: 17, y: 13, w: 1, h: 1, block: 1, k: 1.4 },
        { t: 'deco', kind: 'hatch', x: 20, y: 14, w: 1, h: 1, block: 1, cond: '!resortRed' },
        { t: 'warp', x: 20, y: 14, w: 1, h: 1, to: ['nest', 14, 29, 'up'] },
        { t: 'center', x: 0, y: 0 },
        { t: 'obj', kind: 'healpod', x: 6, y: 9, block: 1 },
        { t: 'npc', id: 'r_draculina', sprite: 'draculina', x: 11, y: 14, dir: 'down', name: '드라큐리나', talk: 'resortDok', cond: 'dokJoined' },
        { t: 'npc', id: 'r_sekhmet', sprite: 'sekhmet', x: 16, y: 14, dir: 'down', name: '세크메트', talk: 'resortDok', cond: 'dokJoined' },
      ],
    };
    MAPS.resort.objects = MAPS.resort.objects.filter(o => o.t !== 'center');
  })();
  Object.assign(ENCOUNTERS, {
    factory: { rate: 0.11, lv: [22, 27], list: [['gigantes', 12], ['goltarion', 12], ['rampart', 12], ['bulgasari', 10], ['valkyrie', 10], ['cheona', 10], ['efreeti', 10], ['blackhound', 8], ['tyrant', 3]] },
    snowfield: { rate: 0.11, lv: [27, 31], list: [['hraesvelgr', 12], ['echidna', 12], ['phantom', 12], ['alice', 10], ['perrault', 10], ['undine', 10], ['roc', 10], ['leona', 3], ['fafnir', 3]] },
  });
  ENCOUNTERS.route1.lv = [3, 6]; ENCOUNTERS.forest.lv = [8, 13]; ENCOUNTERS.coast.lv = [16, 21]; ENCOUNTERS.nest.lv = [33, 38];
  ENCOUNTERS.route1.expMul = 1.5;
  ENCOUNTERS.forest.expMul = 1.15;

  // ---------------------------------------------------------------
  //  연출 도우미
  // ---------------------------------------------------------------
  class NightScene {
    constructor(who) { this.who = who; this.t = 0; this.fillScreen = true; } // 타이틀처럼 화면 전체를 쓴다 (titlelayout.js)
    update(dt) { this.t += dt; }
    draw() {
      ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H);
      const a = Math.min(1, this.t / 1.2), tall = H > W;
      // 세로 화면: 달을 위쪽 가운데로, 가로: 기존처럼 오른쪽 위
      const mx = tall ? W / 2 + 70 : W / 2 + 180, my = tall ? H * 0.2 : 150;
      ctx.save(); ctx.globalAlpha = a;
      // 달과 창문
      const g = ctx.createRadialGradient(mx, my, 10, mx, my, 140); g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f6efd2'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, 7); ctx.fill();
      ctx.fillStyle = '#05060c'; ctx.beginPath(); ctx.arc(mx + 14, my - 8, 30, 0, 7); ctx.fill();
      for (let k = 0; k < 70; k++) { ctx.fillStyle = 'rgba(200,220,255,' + (0.2 + 0.4 * hash2(k, 7)) + ')'; ctx.fillRect(hash2(k, 1) * W, hash2(k, 2) * H * 0.6, 2, 2); }
      // 하트
      const hb = 1 + 0.08 * Math.sin(this.t * 4);
      ctx.translate(tall ? W / 2 - 130 : W / 2 - 160, my + 110); ctx.scale(hb, hb); ctx.fillStyle = 'rgba(255,110,160,0.85)';
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.bezierCurveTo(-30, -6, -18, -30, 0, -14); ctx.bezierCurveTo(18, -30, 30, -6, 0, 18); ctx.fill();
      ctx.restore();
      txt('— 그날 밤 —', mx, my + 90, { size: 30, weight: 900, align: 'center', color: '#ffd6e6', family: TITLE_FONT });
      // 세로 대화창은 인물 그림을 그리지 않으므로, 장면이 관장 일러스트를 대화창 위에 직접 그린다
      if (tall && this.who) drawFit(IMG.full[this.who] || lazyImg('full', this.who), W / 2 - 300, H * 0.34, 600, H * 0.36, { anchor: 'bottom', alpha: a });
    }
  }
  const sp = (name, portrait) => ({ speaker: name, portrait });
  async function lines(o, arr) { for (const l of arr) await say(l, o); }
  // 관장 격파 → 배지 → 밤 → 아침 (+ 음모 복선)
  async function gymWin(e, after, night, morning, clue) {
    const T = TRAINERS[e.o.id], o = sp(T.name, T.portrait);
    await lines(o, after);
    if (T.badge && !Game.badges.includes(T.badge)) {
      Game.badges.push(T.badge);
      await UI.push(new BadgeScreen(BADGES.find(b => b.id === T.badge)));
    }
    // 밤
    World.locked = true;
    await Trans.fade(1, 700);
    Audio2.stopBgm(600);
    const back = Scene, ns = new NightScene(T.portrait);
    Scene = ns;
    await Trans.fade(0, 600);
    await lines(o, night);
    await say('...');
    Audio2.sfx('shine', 0.5);
    await Trans.fade(1, 900);
    Scene = back;
    Game.healAll();
    Audio2.bgm(World.bgmKey(), { fadeIn: 800 });
    await Trans.fade(0, 700);
    await say('— 다음 날 아침 —');
    await lines(o, morning);
    if (clue) await clue();
    World.locked = false;
    Game.save();
  }
  // 배지가 붉게 깜빡이는 복선
  async function badgeBlink(text) {
    Audio2.sfx('warning', 0.35);
    FX.doFlash('#ff2a4a', 0.25);
    await say(text);
  }
  // 독점단 등장 구호
  async function dokMotto(withBrownie) {
    const D = sp('드라큐리나', 'draculina'), S = sp('세크메트', 'sekhmet'), B = sp('브라우니', 'brownie');
    Audio2.bgm('trainer', { fadeIn: 100 });
    await say('잠깐!!', D);
    await say('우리가 누구냐고 묻는다면!', D);
    await say('대답해 드리는 것이 이 어미의 도리입니다!', S);
    await say('세상의 커플 성립을 막기 위해!', D);
    await say('폐하의 독점을 지키기 위해!', S);
    await say('사랑과 질투의 악역! 사령관 독점단!', D);
    if (withBrownie) await say('...브, 브라우니도 있지 말입니다!', B);
  }
  // 하늘로 날아가며 퇴장
  async function blastOff(e, text) {
    Audio2.sfx('explosion', 0.6); FX.doShake(8, 0.3);
    if (text) await say(text, sp(TRAINERS[e.o.id].name, TRAINERS[e.o.id].portrait));
    Audio2.sfx('whoosh', 0.8);
    const y0 = e.py;
    await new Promise(res => { let t = 0; Tick.add(dt => { t += dt; e.py = y0 - t * t * 900; e.alpha = Math.max(0, 1 - t * 0.9); if (t > 1.1) { res(); return false; } }); });
    Audio2.sfx('shine', 0.7);
    e.hidden = true; e.py = y0;
  }

  // ---------------------------------------------------------------
  //  스크립트
  // ---------------------------------------------------------------
  Object.assign(Scripts, {
    // ----- 1. 감마 -----
    async pre_gamma() {
      const o = sp('레모네이드 감마', L('gamma')); Audio2.voice(L('gamma'), 'start');
      await lines(o, ['하하하! 자네가 그 오르카의 사령관이군!', '공고문을 보고 왔다라... 크크, 눈빛이 아주 이글이글하군.', '좋다! 이 몸을 이기면 약속대로 오늘 밤은 자네 것이다. 대신 지면... 우리 꼬맹이들 기저귀 갈기 한 달이다!', '육아는 전투다! 그리고 전투는 정면 승부지! 전력으로 상대해 주마!']);
    },
    async post_gamma(e) {
      await gymWin(e, ['하하하! 졌다, 졌어! 이렇게 기분 좋게 진 건 무적의 용 이후 처음이군!', '신세를 졌다, 사령관. 약속은 약속이지. 레몬 하트 배지다!'],
        ['...사령관. 불은 자네가 끄게.', '이 눈 상처 말인가? 크크, 영광의 상처라고.', '...그러니까 너무 빤히 보지 말게. 이 몸도 이런 건... 서툴단 말이다.'],
        ['하하하! 좋은 아침이다, 사령관! 아침 단련 같이 하겠나?', '...왜 다리를 떠나? 단련이 부족하군!'],
        async () => { await badgeBlink('(...가방 속 레몬 하트 배지가 잠깐 붉게 깜빡인 것 같다. 기분 탓일까?)'); });
    },
    // ----- 2. 베타 -----
    async pre_beta() {
      const o = sp('레모네이드 베타', L('beta')); Audio2.voice(L('beta'), 'start');
      await lines(o, ['아, 아... 주인님이시군요. 오실 줄 알았어요. 저는 비밀이 많거든요.', '주인님의 감마 체육관 전투 기록... 전부 해킹해서 봤어요. 알파 언니한테는 비밀이에요...', '그, 그러니까... 이기시면... 그, 공고문대로... 으으...', '저는 폭식의 레모네이드가 아니에요! ...이 과자는 전략 물자예요!']);
    },
    async post_beta(e) {
      await gymWin(e, ['져, 졌어요... 그래도 괜찮아요. 주인님 데이터를 잔뜩 얻었으니까요.', '레몬 하트 배지예요... 소, 소중히 해 주세요.'],
        ['주, 주인님... 불 끄기 전에, 이 야식 같이 드실래요?', '...뱃살 보지 마세요. 보면 해킹할 거예요.', '...주인님은 따뜻하네요.'],
        ['주인님, 좋은 아침이에요... 아침밥은 제가 세 그릇 준비했어요. 제 거만요.'],
        async () => {
          await say('그런데 주인님... 어젯밤 배지에서 이상한 신호가 나갔어요. 제 서버가 아닌 곳으로요.', sp('레모네이드 베타', L('beta')));
          await say('아직 목적지는 몰라요. 송신 기록은 따로 복사해 둘게요. 다음 배지 신호와 비교하면 추적할 수 있어요.', sp('레모네이드 베타', L('beta')));
          Game.flags.clue_beta = 1;
        });
    },
    // ----- 3. 델타 -----
    async pre_delta() {
      const o = sp('레모네이드 델타', L('delta')); Audio2.voice(L('delta'), 'start');
      await lines(o, ['네가 그 마지막 인간이야? 감마에 베타까지 넘어갔다더니... 별것 없게 생겼네.', '특히 감마 다음 순서라는 게 제일 거슬려. 그 근육 덩어리 다음이라고?', '짖지 마. 거슬리니까. 내 마리오네트들이 무대에서 끌어내 줄게.']);
    },
    async post_delta(e) {
      await gymWin(e, ['...지금 뭐라고? 내가 졌다고? 다시 한번 지껄여봐!', '...칫. 약속은 약속이야. 배지 가져가.'],
        ['오늘 밤을 위해 드레스를 새로 지었어. 문리버 최신작이야. ...보라고.', '감마보다 예쁘다고 말해. 지금 바로.', '...흥. 그 말, 평생 기억해 둘 거야.'],
        ['일어났어? 어젯밤 감상평은 문서로 제출해. 감마 것보다 길게.'],
        async () => { await badgeBlink('(배지 두 개가 동시에 붉게 깜빡였다. 이번엔 분명히 봤다.)'); Game.flags.clue_delta = 1; });
    },
    // ----- 4. 제타 -----
    async pre_zeta() {
      const o = sp('레모네이드 제타', L('zeta')); Audio2.voice('mpzeta', 'start');
      await lines(o, ['왔군요, 마지막 인간. 관측 대상 S-01.', '모든 실험은 관측에서부터 시작되죠. 당신의 링크 반응은 아주 흥미로운 데이터예요.', '공고문이요? ...아, 그 조항. 효율적이군요. 전투 직후에 링크 공명이 최대치가 되니까요.', '시작하죠. 단, 상금은 기대하지 마세요. 예산 낭비는 비효율적이라고 생각해요.']);
    },
    async post_zeta(e) {
      await gymWin(e, ['...예측 범위 밖의 결과군요. 기록해 두겠어요.', '배지예요. 상금은... 1200P. 그 이상은 비효율적이에요.'],
        ['이것도 실험의 일부예요. 긴장할 필요 없어요.', '...심박수 상승. 흥미롭군요. 당신 것인지, 제 것인지.', '기록 종료. ...아니, 조금만 더 관측하죠.'],
        ['...일어났군요. 데이터는 충분히 모였어요. 이제 돌아가셔도 좋아요.'],
        async () => {
          await say('(제타가 나간 뒤, 책상 위에 철충 문양이 새겨진 보고서가 남아 있다. "링크 공명 수집률 4/7 — 그분께 보고 예정")');
          await badgeBlink('(...그분? 철충 문양? 무슨 뜻일까.)');
          await say('(보고서를 촬영해 베타에게 보냈다. 돌아온 답장: "제타의 서버는 미끼예요. 진짜 수신처는 위성으로 찾아야 해요. 엡실론 언니에게 가 주세요.")');
          Game.flags.clue_zeta = 1;
        });
    },
    // ----- 5. 엡실론 -----
    async pre_epsilon() {
      const o = sp('레모네이드 엡실론', L('epsilon')); Audio2.voice(L('epsilon'), 'start');
      await lines(o, ['......', '...사령관, 나 안 잔다? 진짜 안 잤어.', '하암... 배틀? 귀찮은데... 이기면 하룻밤이라며? 그럼 침대는 이미 깔려 있으니까 편하겠네.', '빨리 끝내자. 게임 하던 거 세이브 안 했단 말이야.']);
    },
    async post_epsilon(e) {
      await gymWin(e, ['...졌네. 뭐, 한 판 더 할 기운도 없어. 배지 가져가.'],
        ['...사령관, 나랑 놀아줄 수 있지? 게임 말고. ...아니 게임도.', '샤워? ...물은 싫어. 그냥 이대로.', '...따뜻하다. 오늘은 잘 잘 것 같아.'],
        ['...좋은 아침. 나 원래 아침엔 안 일어나는데, 오늘은 특별히.'],
        async () => {
          const o = sp('레모네이드 엡실론', L('epsilon'));
          await say('...근데 사령관. 내 위성에 이상한 게 잡혔어.', o);
          await say('제타 언니 연구소에서 리조트 지하로 철충 신호가 계속 오가. 그리고... 그 신호가 사령관 배지랑 똑같은 주파수야.', o);
          await say('리조트 지하는 신호 없이는 열리지 않아. 배지를 버리면 제타가 증거부터 없앨 거야.', o);
          await say('베타한테 좌표 보냈어. 알파 언니에게 가. 배지를 차폐할 수 있는 사람은 언니뿐이야. ...위성은 켜 둘게.', o);
          Game.flags.clue_epsilon = 1;
        });
    },
    // ----- 6. 알파 -----
    async pre_alpha() {
      const o = sp('레모네이드 알파', L('alpha')); Audio2.voice(L('alpha'), 'start');
      await lines(o, ['어서 오세요, 사령관님. 후후, 소문보다 훨씬 매력적이시네요.', '동생들을 차례로 꺾으셨다죠? 베타야, 그렇게 좋았니? ...후후, 농담이에요.', '협회장으로서 마지막 관문을 지켜야 하지만... 솔직히 기대돼요. 케스토스 히마스 전개. 전장을 장악하겠어요.']);
    },
    async post_alpha(e) {
      const A = sp('레모네이드 알파', L('alpha'));
      await lines(A, ['먼저 급한 이야기부터 해요. 저는 그 공고문에 서명한 적이 없어요. 배지는 링크 공명을 빼돌리는 송신기예요.',
        '베타의 기록과 엡실론의 좌표를 받았어요. 지금 여섯 배지는 이 차폐함에 넣겠어요. 더는 데이터를 보내지 못해요.',
        '마지막 배지의 인증 신호가 있어야 지하가 열려요. 오메가전의 신호가 나갈 때 베타가 접속을 붙잡고, 제가 역송신 통로를 만들죠.',
        '위험을 알고 들어가는 작전이에요. 이제부터는 우리가 제타를 관측할 차례예요.']);
      Game.flags.counterlink = 1;
      await gymWin(e, ['후후... 제 배지예요. 준비가 끝나면 리조트로 가요.', '그 전에 쉬어 가세요. 지친 부대로 작전에 나설 수는 없잖아요.'],
        ['차폐함은 잠갔고, 리조트 감시는 엡실론에게 맡겼어요. 오늘 밤의 기록은 우리만 간직해요.', '우후후... 어쩌면 사령관님이야말로 진정한 저희의 주인님일지도 모르겠네요.'],
        ['좋은 아침이에요, 사령관님. 출발 전에 기다리던 손님들을 만나 보세요.'],
        async () => {
          const A = sp('레모네이드 알파', L('alpha')), D = sp('드라큐리나', 'draculina'), S = sp('세크메트', 'sekhmet');
          await say('차폐함 안의 배지는 조용해요. 베타도 역추적 준비를 마쳤대요.', A);
          Audio2.exclaim();
          await say('그러니까 말했잖아!!', D);
          await say('...제대로 설명하기 전에 날아가 버리긴 했지만!', D);
          await say('폐하. 처음에는 질투였지만, 항구에서 배지가 멋대로 송신하는 것을 보고 의심했습니다.', S);
          await say('그래서 폐하가 배지를 더 모으지 못하게... 매번 길을 막았던 것입니다.', S);
          await say('...질투도 쪼끔 있었지만! 쪼끔!', D);
          await say('송신 대상은 리조트 지하예요. 마지막 배지를 얻으면 작전 개시예요. 두 분은 해치 뒤쪽을 지켜 주세요.', A);
          await say('이 드라큐리나 님과 세크메트도 따라가 주지! 리조트에서 기다리겠어!', D);
          Game.flags.dokJoined = 1;
        });
    },
    // ----- 7. 챔피언 오메가 -----
    async pre_omega() {
      const o = sp('레모네이드 오메가', L('omega')); Audio2.stopBgm(600); Audio2.voice(L('omega'), 'start');
      await lines(o, ['반가워요, 인간님. 언니들이 하나같이 당신 얘기만 하더군요.', '감마 언니는 단련, 베타는 해킹, 델타는 드레스, 제타는 데이터, 엡실론은... 잠꼬대.', '알파에게 작전은 들었어요. 하지만 마지막 인증은 챔피언전의 진짜 링크 공명으로만 열린다면서요?', '가짜 승부로는 문도 안 열린다는 거죠. 챔피언 오메가예요. 제 리그를 지킬 실력인지 확인해 드리죠.']);
    },
    async post_omega(e) {
      const o = sp('레모네이드 오메가', L('omega'));
      await lines(o, ['...제가 졌다고요? 하... 오늘은 술이에요. 술.', '감마 언니~! 저 좀 격려해 주세요~ ...아, 언니 여기 없지.', '...약속은 지켜요. 마지막 배지예요. 가져가세요.']);
      if (!Game.badges.includes('omega')) { Game.badges.push('omega'); await UI.push(new BadgeScreen(BADGES.find(b => b.id === 'omega'))); }
      // 일곱 번째 배지 → 송신 완료
      World.locked = true;
      Audio2.stopBgm(300); Audio2.sfx('warning', 0.8); FX.doShake(14, 0.8); FX.doFlash('#ff2a4a', 0.8);
      await say('(가방 속 배지 일곱 개가 동시에 붉게 타오른다!)');
      await say('접속 잡았어요! 챔피언전의 공명이 마지막 인증이었어요. 차폐함의 여섯 배지는 기록 대신 위장 신호만 보내고 있어요!', sp('레모네이드 베타', L('beta')));
      await say('뭐, 뭐예요 이거?! 리조트 조명이...!', o);
      Game.flags.resortRed = 1;
      await say('...인간님. 알파 말이 맞았던 건가요. 지하 해치가 열렸어요. 저 아래에서 철충 냄새가 나요.', o);
      await say('앞장서세요, 인간님. ...제 리그에서 이런 짓을 한 년은 제가 직접 끝장낼 거니까요.', o);
      World.locked = false;
      Game.save();
    },
    // ----- 흑막: 융합체 제타 -----
    async pre_mpzeta() {
      // 업데이트 전 알파를 통과한 저장 데이터도 결말 작전과 첫 지휘를 받을 수 있다.
      if (!Game.flags.counterlink) {
        await say('사령관님, 베타의 기록으로 배지를 차폐했어요. 엡실론이 좌표를 잡고 있어요. 제 역송신 신호에 맞춰 지휘해 주세요.', sp('레모네이드 알파', L('alpha')));
        Game.flags.counterlink = 1;
      }
      await say('중계핵 접속 유지 중이에요. 복제는 저장된 명령만 따라요. 지금 내리는 새 지휘는 베낄 수 없어요!', sp('레모네이드 베타', L('beta')));
      await say('(동료들이 역송신 통로를 확보했다. 지휘 게이지가 가득 찼다! 기술 선택에서 M/Tab 또는 지휘 버튼으로 발동할 수 있다.)');
      // 부대 전체(쓰러진 유닛 포함)에서 레벨과 랭크를 함께 따져 가장 강한 셋을 복제한다.
      // 순서를 바꾸거나 강한 유닛을 일부러 쓰러뜨려도 복제를 약하게 만들 수 없다
      // 부대가 셋보다 적어도 격납고까지 뒤져 셋을 채운다 (소수 정예로 들어가 복제를 줄일 수 없다)
      const power = m => m.level + RANKS.indexOf(m.rank) * 3;
      const picks = [...Game.party, ...Game.box].sort((a, b) => power(b) - power(a)).slice(0, 3);
      // 그래도 모자라면 철충화된 바이오로이드로 채운다 (최강 유닛 레벨 기준)
      const topLv = picks.length ? picks[0].level : 40;
      for (const k of ['valkyrie', 'leona', 'tyrant']) if (picks.length < 3) picks.push(new Mon(k, topLv, { trainer: true }));
      TRAINERS.mpzeta.copyOf = picks;
      // 난이도: 복제는 내 레벨을 따르되 상한이 있다 (쉬움 -3·상한 38·랭크 못 베낌 / 보통 -1·상한 42 / 어려움 ±0·상한 48, 흑막 본체 37/40/44).
      // 상한 덕분에 그보다 더 육성하면 그만큼 확실히 유리해진다
      const D = Settings.difficulty, cap = [38, 42, 48][D] || 42, minus = [3, 1, 0][D], core = [37, 40, 44][D] || 40;
      // 세 복제 모두 "가장 강한 유닛의 레벨"로 맞춘다 (약한 유닛을 데려가거나 격납고에 채워도 복제가 약해지지 않는다)
      const copyLv = clamp(Math.min(Math.max(...picks.map(m => m.level)) - minus, cap), 1, 100);
      TRAINERS.mpzeta.team = picks.map(m => [m.key, copyLv]).concat([['mpzeta', core]]);
      const Z = sp('융합체 제타', 'mpzeta'); Audio2.stopBgm(600); Audio2.voice('mpzeta', 'start');
      await lines(Z, ['관측 완료. 인증률 7/7.', '어서 와라, 사령관. 관장전과 함께 보낸 밤의 링크 공명... 챔피언전의 마지막 인증까지 이 둥지에 도착했다.', '공고문은 내가 붙였다. 알파의 서명으로. 너는 아주 효율적인 표본이었지.', '\'그분\'은 이 지하의 철충 중계핵이다. 내 연구망을 통해 인간의 링크까지 지배할 것이다!', '시험해 보지. 네 링크로 복제한 너의 부대를 상대로.']);
    },
    async post_mpzeta(e) {
      const Z = sp('융합체 제타', 'mpzeta');
      await lines(Z, ['...이해할 수 없다. 데이터는 완벽했다.', '복제된 부대와 원본의 차이는... 무엇이지?']);
      await say('(링크는 데이터가 아니다. 함께 보낸 시간이다... 라고 사령관은 말없이 생각했다.)');
      Audio2.sfx('explosion_big', 0.8); FX.doShake(16, 0.9); FX.doFlash('#fff', 1);
      await say('중계핵의 방어가 무너졌어. 엡실론, 출구 좌표 고정해! 베타, 지금 연결 끊어!', sp('레모네이드 알파', L('alpha')));
      await say('(베타가 인증 통로를 역으로 닫았다. 독점단이 퇴로를 지키는 동안 엡실론의 위성이 중계핵을 봉쇄했다. 융합체의 붉은 빛이 꺼져 간다.)');
      await lines(sp('레모네이드 제타', L('zeta')), ['......접속이 끊겼어요. 중계핵의 목소리도 들리지 않아요.', '처음 연구망을 연 건 제 선택이었어요. 철충을 통제할 수 있다고 믿었죠. 공고문을 위조하고 여러분을 이용한 것도 제 책임이에요.', '알파에게 연구 기록을 모두 넘기겠어요. 폭주한 아이들을 되돌리는 일부터... 제가 하겠습니다.']);
      Game.flags.cleared = 1; Game.addItem('core3', 1);
      Game.save();
      await runEnding();
    },
    // ----- 사령관 독점단 -----
    async pre_dok1() {
      const B = sp('브라우니', 'brownie');
      await say('거기 서십쇼, 사령관님! 여기서부턴 못 지나가지 말입니다!', B);
      await say('...원래는 드라큐리나 님이랑 세크메트 님이 오셔야 하는데, 오늘은 브라우니만 왔지 말입니다!', B);
      await say('사랑과 질투의 악역! 사령관 독점단! ...의 마스코트임다! 브라우니 부대, 출격하지 말입니다!', B);
    },
    async post_dok1(e) { await blastOff(e, '브라우니는 또 졌지 말입니다아아~! 오늘 밤도 사령관님은 관장한테 가 버리지 말임다아~!'); },
    async pre_dok2() {
      const D = sp('수상한 관광객', 'draculina');
      await say('어머~ 거기 멋진 인간? 이 마을은 처음이야? 이 드라큐리나... 아니, 지나가던 관광객이 안내해 줄게!', D);
      await say('(선글라스에 밀짚모자를 썼지만, 저 망토는 아무리 봐도 드라큐리나다.)');
      await say('잠깐, 그 배지 좀 보여 봐. 방금 아무도 만지지 않았는데 빨간 불이 켜졌잖아. ...왜 내 손을 피하는데!', D);
      await dokMotto(true);
      await say('아핫! 절망에 빠져라! 델타한테 가기 전에 여기서 끝이다!', sp('드라큐리나', 'draculina'));
    },
    async post_dok2(e) { await blastOff(e, '또 졌어어어~! 토마토 주스라도 사 줘야 기분이 풀린다고오~!'); },
    async pre_dok3() {
      const S = sp('세크메트', 'sekhmet');
      await say('폐하. 이 어미가 도시락을 싸 왔습니다. 그리고 일과표도 검사하겠습니다.', S);
      await say('...관장 방문 일정이 너무 많군요. 이 어미는 허락할 수 없습니다.', S);
      await say('그 배지를 잠시 이 금속 도시락통에 넣어 보시지요. 닫으니 붉은 불빛도 멎는군요. 누군가 폐하의 신호를 엿듣고 있습니다.', S);
      await dokMotto(false);
      await say('시들어라. 죽음의 파도! ...폐하는 빼고!', S);
    },
    async post_dok3(e) { await blastOff(e, '폐하아아~! 도시락은 꼭 드셔야 합니다아아~!'); },
    async resortDok(e) {
      const D = sp('드라큐리나', 'draculina'), S = sp('세크메트', 'sekhmet');
      if (!Game.flags.resortRed) { await say('챔피언 홀에 오메가가 있어. 이기면... 그, 그 다음은 각오해 둬! 이 드라큐리나 님도 지켜볼 거니까!', D); return; }
      if (!Game.flags.cleared) { await say('폐하, 해치 아래가 흑막의 둥지입니다. 이 어미가 뒤를 지키겠습니다.', S); return; }
      await say('...끝났구나. 그럼 이제 다음 공고문은 우리가 붙인다! "사령관 독점단 입단 시험: 하룻밤"!', D);
      await say('폐하, 이 어미의 시험은 계란 요리부터입니다.', S);
    },
    // ----- 지역 진입 -----
    async enter_factory() {
      if (Game.flags.factoryIntro) return; Game.flags.factoryIntro = 1;
      await say('녹슨 기계음이 울리는 폐공장 지대에 도착했다. 엡실론 체육관은 동쪽 건물이다.');
    },
    async enter_snowfield() {
      if (Game.flags.snowIntro) return; Game.flags.snowIntro = 1;
      await say('하얀 눈이 끝없이 이어진다. 이 너머에 레모네이드 리조트가 있다고 한다.');
    },
    async enter_resort() {
      if (Game.flags.resortIntro) return; Game.flags.resortIntro = 1;
      await say('핑크빛 조명이 반짝이는 레모네이드 리조트. 중앙의 챔피언 홀에서 오메가가 기다린다.');
    },
    async enter_nest() {
      if (Game.flags.nestIntro) return; Game.flags.nestIntro = 1;
      Audio2.sfx('warning', 0.5);
      await say('...화려한 리조트 바로 밑에, 철충의 붉은 빛이 맥동하는 둥지가 숨어 있었다.');
      await say('가장 깊은 곳에서 일곱 배지의 신호가 모이고 있다.');
    },
    async enter_harbor() {
      if (Game.flags.harborIntro) return; Game.flags.harborIntro = 1;
      await say('새로운 마을에 도착했다! 북쪽 건물이 델타 체육관이다. 수복실에서 부대를 회복하고 보급소에서 장비를 갖추자.');
    },
    // ----- NPC 대사 갱신 -----
    async constantia(e) {
      Audio2.voice('constantia', 'talk', 0.8);
      const o = sp('콘스탄챠', 'constantia'), n = Game.badges.length;
      if (!Game.flags.gotStarter) { await say('주인님, 깨어나셨군요! 라비아타 언니가 연구소(왼쪽 위 건물)에서 기다리고 있어요.', o); return; }
      if (n === 0) { await say('1번 폐도로 북쪽에 감마 체육관이 있어요. 그... 공고문 보셨죠? 주인님 표정이 너무 진지하세요.', o); await say('부대가 지치면 오른쪽 위 수복실의 다프네 씨에게 가 보세요.', o); return; }
      if (!Game.flags.cleared) { await say('배지가 ' + n + '개나... 주인님, 요즘 잠은 주무세요? 눈 밑이 퀭하세요. 따뜻한 차라도 내올까요?', o); return; }
      await say('주인님 덕분에 평화가 돌아왔어요. ...그리고 리조트 식탁 인원이 매일 늘고 있다는 소문이에요.', o);
      await say('전설의 바이오로이드 소문, 들으셨어요? 라비아타 언니와 해안의 칼리스타 씨가 단서를 갖고 있대요. 레아 씨도 전설을 연구 중이고요!', o);
    },
    async labiata(e) {
      const o = sp('라비아타', 'labiata'), n = Game.badges.length;
      Audio2.voice('labiata', 'talk');
      if (!Game.flags.gotStarter) { await say('테이블 위의 링크 코어 세 개 중 하나를 골라 주세요. ...목적은 묻지 않을게요.', o); return; }
      if (!Game.flags.cleared) {
        await say('레몬 하트 배지 ' + n + '개... 후훗, 열심이시네요, 사령관님.', o);
        await say('참, 폭주한 아이들은 체력을 깎은 뒤 링크 코어를 던지면 부대로 영입할 수 있어요. 도감도 잊지 마시고요.', o);
        if (n >= 3) await say('...그런데 요즘 사령관님 배지에서 이상한 신호가 잡혀요. 너무 걱정 마세요, 제가 있으니까요. 그래도 조심하시고요.', o);
        return;
      }
      const caught = DEX_LIST.filter(s => Game.dex.caught[s.key]).length, total = DEX_LIST.length;
      await say('보고서 잘 받았어요. ...일곱 장이나요. 후훗.', o);
      await say('그래서 도감은요? ... ' + caught + ' / ' + total + '명이군요!', o);
      if (caught >= total) { await say('모든 바이오로이드와 링크하셨어요! 사령관님은 진정한 라켓몬 마스터예요!', o); Audio2.jingle([523, 659, 784, 1047], 0.15); }
    },
  });

})();
