// =====================================================================
//  라켓몬스터 - 퀘스트 시스템 (와우식 표시)
//  메인 퀘스트: 노란 ! (받을 수 있음) / 노란 ? (보고 가능)
//  서브 퀘스트: 은색 ! / 은색 ?   ·   진행 중(보고 불가): 회색 ?
//  league.js 다음에 로드된다. 상태는 Game.quests 에 저장된다.
// =====================================================================
(function () {
  const sp = (name, portrait) => ({ speaker: name, portrait });
  const F = k => !!Game.flags[k];
  const badge = id => Game.badges.includes(id);
  const caught = k => !!Game.dex.caught[k];
  const caughtN = () => Object.keys(Game.dex.caught).length;
  const L = k => 'lemon' + k;
  async function lines(o, arr) { for (const l of arr) await say(l, o); }

  // ---------------------------------------------------------------
  //  전설 승격 · 전설 배치
  // ---------------------------------------------------------------
  for (const k of ['phoenix', 'hongryun']) if (SPECIES[k]) { SPECIES[k].legend = true; SPECIES[k].catch = 8; }
  ENCOUNTERS.nest.list = ENCOUNTERS.nest.list.filter(([k]) => k !== 'phoenix' && k !== 'hongryun');
  if (SPECIES.phoenix) SPECIES.phoenix.desc = '설원의 화산 분화구에서 몇 번이고 되살아난다는 불사조. 꺼지지 않는 날개는 길 잃은 자를 인도한다고 전해진다.';
  if (SPECIES.hongryun) SPECIES.hongryun.desc = '엘프의 숲 깊은 곳, 붉은 연꽃이 피는 날에만 모습을 드러내는 전설의 검객. 그 검은 불꽃의 꽃잎을 남긴다.';
  // 기존 전설은 클리어만으로 나타나지 않고, 사이드 스토리를 따라가야 모습을 드러낸다
  for (const o of MAPS.coast.objects) if (o.t === 'legend' && o.id === 'eternity') Object.assign(o, { cond: 'lgq_eternity', bg: 'lighttower' });
  for (const o of MAPS.nest.objects) if (o.t === 'legend' && o.id === 'blacklilith') Object.assign(o, { cond: 'lgq_blacklilith', bg: 'nest' });
  MAPS.forest.objects.push({ t: 'legend', id: 'hongryun', x: 9, y: 5, species: 'hongryun', level: 30, cond: 'lgq_hongryun', bg: 'forest',
    lines: ['(붉은 꽃잎이 바람도 없이 흩날린다...)', '홍련: ...검을 든 자의 눈이군. 그대의 링크, 이 칼끝으로 시험해 보겠다.'] });
  MAPS.snowfield.objects.push({ t: 'legend', id: 'phoenix', x: 26, y: 13, species: 'phoenix', level: 36, cond: 'lgq_phoenix', bg: 'sky',
    lines: ['(눈보라 한가운데에서 불꽃이 날개를 펼쳤다!)', '피닉스: 후후, 이렇게 추운 곳까지 나를 찾아오다니. 꺼지지 않는 불꽃이 무엇인지 보여 줄게!'] });
  MAPS.coast.objects.forEach(o => { if (o.t === 'legend' && o.id === 'eternity') o.lines = ['(등대 꼭대기의 빛이 하늘에서 내려와 사람의 모습이 된다...)', '이터니티: 영원히 반복되는 밤 끝에서... 드디어 만났네요, 사령관.']; });
  MAPS.nest.objects.forEach(o => { if (o.t === 'legend' && o.id === 'blacklilith') o.lines = ['(어둠 속에서 붉은 눈이 번뜩인다)', '블랙 릴리스: 주인님에게 다가오는 건 전부 적이야. ...어라? 주인님 본인이네? 그럼 시험해 볼까!'] });

  // 전설 조우: 맵별 배경·대사를 쓰고, 이기거나 영입하면 met_ 플래그
  Scripts.legend = async function (e) {
    const s = SPECIES[e.o.species];
    Audio2.voice(s.key, 'start');
    FX.doFlash('#ff6b9a', 0.5);
    await say('...!! 강렬한 링크 반응이 느껴진다!');
    if (e.o.lines) for (const l of e.o.lines) await say(l);
    else await say(J(s.name, '이') + ' 사령관을 가만히 바라보고 있다...');
    const res = await startBattle({ kind: 'wild', foes: [new Mon(s.key, e.o.level, { trainer: true })], bg: e.o.bg || (World.id === 'coast' ? 'lighttower' : 'nest'), bgm: 'legend', legend: true });
    if (res === 'caught' || res === 'win') Game.flags['met_' + e.o.id] = 1;
    if (res === 'caught') Game.flags['legend_' + e.o.id] = 1;
    if (res === 'win') await say(J(s.name, '은') + ' 빛과 함께 잠시 모습을 감추었다... 다시 찾아오면 만날 수 있을 것 같다.');
    Quests.tick();
  };
  const metLegend = id => F('met_' + id) || F('legend_' + id);

  // ---------------------------------------------------------------
  //  퀘스트 정의
  //  step: { goal, check(), prog()?, at:[map,id]?, talk(o)?, onStart()? }
  //   - at 이 있으면 check 가 참일 때 그 NPC 머리 위에 ? 가 뜨고, 말을 걸면 다음 단계로
  //   - at 이 없으면 check 가 참이 되는 순간 자동으로 다음 단계로
  // ---------------------------------------------------------------
  const QUESTS = [];
  const Q = q => { QUESTS.push(q); return q; };
  const mainQ = q => Q(Object.assign({ type: 'main' }, q));
  const sideQ = q => Q(Object.assign({ type: 'side' }, q));

  // ===== 메인: 레몬 하트 배지 7개와 숨겨진 음모 =====
  mainQ({ id: 'm1', title: '깨어난 사령관', auto: () => F('introDone'),
    summary: '긴 동면에서 깨어났다. 라비아타가 첫 번째 부대원을 고르라고 한다.',
    steps: [{ goal: '연구소 테이블에서 첫 부대원 고르기', check: () => F('gotStarter'), at: ['lab', 'labiata'],
      talk: async o => lines(o, ['첫 부대원과 인사는 나누셨나요? 후훗, 벌써 사이가 좋아 보여요.', '캠프 광장의 콘스탄챠가 주인님을 찾고 있었어요. 그 "공고문" 이야기 같던데요...?']) }],
    reward: { items: { kit: 2 } } });
  mainQ({ id: 'm2', title: '공고문과 첫 번째 관장', giver: ['base', 'constantia'], prev: 'm1',
    offer: ['사령관님! 게시판 공고문 보셨죠? "관장을 이기는 자에게 하룻밤을 허락한다"...', '...표정이 너무 진지하세요. 아무튼 첫 관장은 1번 폐도로의 감마 씨예요. 정면 승부를 좋아한대요!'],
    summary: '레모네이드 관장 협회의 공고문. 첫 번째 관장 감마는 1번 폐도로의 체육관에 있다.',
    steps: [{ goal: '1번 폐도로 감마 체육관에서 레모네이드 감마 이기기', check: () => F('beat_gamma'), at: ['gym_gamma', 'gamma'],
      talk: async o => lines(o, ['하하하! 아직도 여기 있었나, 사령관?', '다음은 엘프의 숲의 베타다. 그 녀석, 숨기는 게 많으니 조심하게. ...간식도 말이야!']) }],
    reward: { money: 600, items: { core: 5 } } });
  mainQ({ id: 'm3', title: '숲의 해커', giver: ['gym_gamma', 'gamma'], prev: 'm2',
    offer: ['베타 녀석은 엘프의 숲 동쪽 체육관에 틀어박혀 있다. 해킹이 특기지.', '자네 전투 기록을 몰래 보고 있을지도 모르겠군. 하하하!'],
    summary: '두 번째 관장 베타는 엘프의 숲 동쪽 체육관에 있다. 배지가 붉게 깜빡였던 것이 마음에 걸린다.',
    steps: [{ goal: '엘프의 숲 베타 체육관에서 레모네이드 베타 이기기', check: () => F('beat_beta'), at: ['gym_beta', 'beta'],
      talk: async o => lines(o, ['주, 주인님... 그 신호 말인데요. 남쪽 항구 마을 쪽으로도 흘러가고 있었어요.', '델타 언니한테 가 보세요. ...감마 언니 이야기는 하지 마시고요.']) }],
    reward: { money: 900, items: { kit2: 2 } } });
  mainQ({ id: 'm4', title: '수상한 신호', giver: ['gym_beta', 'beta'], prev: 'm3',
    offer: ['배지에서 나간 신호가 남부 항구 마을 쪽을 지나갔어요.', '델타 언니 체육관이 그쪽이에요. 무대에 함부로 오르면 혼나요...'],
    summary: '배지에서 정체불명의 신호가 송신되고 있다. 세 번째 관장 델타는 남부 항구 마을에 있다.',
    steps: [{ goal: '남부 항구 마을 델타 체육관에서 레모네이드 델타 이기기', check: () => F('beat_delta'), at: ['gym_delta', 'delta'],
      talk: async o => lines(o, ['또 왔어? ...흥, 정보나 주지. 해안의 제타가 요즘 연구소에 틀어박혀서 수상해.', '배지 두 개가 동시에 깜빡였다며? 그 녀석이라면 뭔가 알 거야.']) }],
    reward: { money: 1200, items: { core2: 3 } } });
  mainQ({ id: 'm5', title: '깜빡이는 배지', giver: ['gym_delta', 'delta'], prev: 'm4',
    offer: ['폐허 해안 동쪽에 제타 연구소 겸 체육관이 있어. 관측이니 효율이니 하는 녀석이야.', '배지 일은 거기서 캐물어 봐. 내 드레스 값은 네가 내고.'],
    summary: '배지 두 개가 동시에 붉게 깜빡였다. 네 번째 관장 제타는 폐허 해안의 연구소에 있다.',
    steps: [{ goal: '폐허 해안 제타 체육관에서 레모네이드 제타 이기기', check: () => F('beat_zeta'), at: ['gym_zeta', 'zeta'],
      talk: async o => lines(o, ['...보고서를 봤군요. 그건 관측 기록일 뿐이에요.', '더 알고 싶다면 엡실론에게 가 보세요. 위성으로 모든 걸 보고 있으니까요. 깨어 있다면요.']) }],
    reward: { money: 800, items: { kit2: 3 } } });
  mainQ({ id: 'm6', title: '관측 대상 S-01', giver: ['gym_zeta', 'zeta'], prev: 'm5',
    offer: ['동굴을 지나면 폐공장 지대예요. 엡실론의 체육관이 있죠.', '"그분"이 누구냐고요? ...관측 대상은 질문하지 않는 법이에요.'],
    summary: '제타의 책상에 철충 문양 보고서가 있었다. 다섯 번째 관장 엡실론은 폐공장 지대에 있다.',
    steps: [{ goal: '폐공장 지대 엡실론 체육관에서 레모네이드 엡실론 이기기', check: () => F('beat_epsilon'), at: ['gym_epsilon', 'epsilon'],
      talk: async o => lines(o, ['...또 왔어? 위성 얘기라면 이미 했잖아.', '알파 언니는 설원 고지대에 있어. 협회장이니까 공고문 일도 알겠지. ...잘 자.']) }],
    reward: { money: 1500, items: { revive: 2 } } });
  mainQ({ id: 'm7', title: '위성이 본 것', giver: ['gym_epsilon', 'epsilon'], prev: 'm6',
    offer: ['리조트 지하로 철충 신호가 오가. 사령관 배지랑 같은 주파수로.', '...알파 언니한테 물어봐. 설원 고지대 북쪽 체육관. 나는 귀찮아.'],
    summary: '엡실론의 위성이 리조트 지하의 철충 신호를 잡았다. 여섯 번째 관장 알파는 설원 고지대에 있다.',
    steps: [{ goal: '설원 고지대 알파 체육관에서 레모네이드 알파 이기기', check: () => F('beat_alpha'), at: ['gym_alpha', 'alpha'],
      talk: async o => lines(o, ['주인님, 들으셨죠? 공고문의 서명은 위조예요.', '마지막 배지는 리조트의 오메가가 갖고 있어요. 그 아이는 아무것도 몰라요... 아마도요.']) }],
    reward: { money: 2000, items: { kit3: 1 } } });
  mainQ({ id: 'm8', title: '위조된 공고문', giver: ['gym_alpha', 'alpha'], prev: 'm7',
    offer: ['송신 대상은 리조트 지하예요. 마지막 배지... 챔피언 홀의 오메가가 열쇠일 거예요.', '드라큐리나와 세크메트도 리조트에서 기다린대요. 후후, 든든하네요.'],
    summary: '배지에는 링크 공명 송신기가 숨어 있었다. 챔피언 오메가는 레모네이드 리조트의 챔피언 홀에 있다.',
    steps: [{ goal: '레모네이드 리조트 챔피언 홀에서 오메가 이기기', check: () => F('beat_omega'), at: ['gym_omega', 'omega'],
      talk: async o => lines(o, ['...아직 안 갔어요, 인간님? 지하 해치가 열렸다니까요.']) }],
    reward: { money: 3000, items: { kit3: 2 } } });
  mainQ({ id: 'm9', title: '리조트 지하의 둥지', giver: ['gym_omega', 'omega'], prev: 'm8',
    offer: ['리조트 동쪽 해치 아래예요. 일곱 배지의 신호가 전부 그쪽으로 모이고 있어요.', '제 리그에서 이런 짓을 한 년은... 인간님이 대신 혼내 주세요.'],
    summary: '일곱 번째 배지와 함께 리조트 지하 해치가 열렸다. 가장 깊은 곳에 흑막이 있다.',
    steps: [
      { goal: '리조트 지하 둥지의 흑막 쓰러뜨리기', check: () => F('cleared') },
      { goal: '오르카 캠프 연구소의 라비아타에게 보고하기', at: ['lab', 'labiata'],
        talk: async o => lines(o, ['주인님... 무사히 돌아오셨군요.', '배지의 진실도, 제타의 일도 들었어요. ...정말 고생 많으셨어요.', '이제부터는 주인님이 하고 싶은 일을 하세요. 전설의 아이들을 찾아가 보는 것도 좋겠네요.']) }],
    reward: { money: 5000, items: { core3: 1 } } });

  // ===== 서브: 오르카 캠프 =====
  sideQ({ id: 's_poi', title: '오르카호 수리 부품', giver: ['base', 'poi'], area: '오르카 캠프', avail: () => F('gotStarter'),
    offer: ['사령관님! 오르카호 수리하는데 손재주 좋은 아이가 필요해요!', '1번 폐도로에 그렘린이라는 정비병이 돌아다닌대요. 영입해서 보여 주실래요? 나사 몇 개는 남겠지만요!'],
    summary: '포이가 오르카호 수리를 도와줄 정비병을 찾고 있다.',
    steps: [{ goal: '그렘린 영입하기 (1번 폐도로)', check: () => caught('gremlin'), at: ['base', 'poi'],
      talk: async o => lines(o, ['와아, 진짜 그렘린이다! ...벌써 제 공구함을 뜯고 있어요!', '이건 수리하다 남은 부품으로 만든 키트예요. 받아 주세요!']) }],
    reward: { money: 500, items: { kit2: 2 } } });
  sideQ({ id: 's_rhea', title: '승급의 비밀', giver: ['base', 'rhea'], area: '오르카 캠프', avail: () => F('gotStarter'),
    offer: ['사령관님, 바이오로이드는 레벨 16이 되면 A랭크로 승급해요. 능력치가 쑥 오르죠.', '실제로 승급한 아이를 보고 싶어요. 연구 자료로요! 데려와 주실 수 있나요?'],
    summary: '레아가 승급한 바이오로이드를 연구하고 싶어 한다.',
    steps: [{ goal: '부대에 A랭크 이상 유닛 두기', check: () => Game.party.some(m => RANKS.indexOf(m.rank) >= RANKS.indexOf('A')), at: ['base', 'rhea'],
      talk: async o => lines(o, ['링크 출력이 B랭크 때와는 전혀 달라요! 이 데이터로 논문을 세 편은 쓰겠어요.', '감사의 의미로 정상화 칩을 드릴게요. 상태이상에 걸리면 써 주세요.']) }],
    reward: { money: 1000, items: { chip: 3 } } });
  sideQ({ id: 's_audrey', title: '도감 화보 촬영', giver: ['base', 'audrey'], area: '오르카 캠프', avail: () => Game.badges.length >= 1,
    offer: ['어머, 사령관님. 저 요즘 바이오로이드 화보집을 기획 중이에요.', '모델이 최소 열 명은 필요해요. 도감에 열 명 이상 영입해 오시면... 특별 보수를 드릴게요.'],
    summary: '오드리가 화보집 모델을 모으고 있다. 도감 영입 수를 늘리자.',
    steps: [{ goal: '도감 영입 수 10명 달성', check: () => caughtN() >= 10, prog: () => Math.min(10, caughtN()) + ' / 10', at: ['base', 'audrey'],
      talk: async o => lines(o, ['완벽해요! 이 정도면 화보집이 아니라 화보 전집이에요.', '보수예요. 고급 링크 코어로 더 많은 모델을... 아니, 동료를 만나세요.']) }],
    reward: { items: { core2: 5 } } });
  sideQ({ id: 's_letter', title: '항구로 보내는 편지', giver: ['center1', 'center1_snow'], area: '오르카 수복실', avail: () => F('gotStarter'),
    offer: ['사령관님, 부탁이 있어요. 항구 마을 수복실의 테티스 언니에게 이 편지를 전해 주실 수 있나요?', '...내용은 비밀이에요! 절대 읽으시면 안 돼요!'],
    summary: '스노우 페더가 항구 수복실의 테티스에게 편지를 전해 달라고 했다.',
    steps: [
      { goal: '남부 항구 마을 수복실의 테티스에게 편지 전하기', at: ['center2', 'center2_snow'],
        talk: async o => lines(o, ['스노우 페더가 보낸 편지요? ...후후, 그 아이도 참.', '"언니, 사령관님은 생각보다 훨씬 다정한 분이에요"... 어머, 읽어 버렸네요.', '답장을 써 둘게요. 돌아가는 길에 전해 주세요.']) },
      { goal: '오르카 수복실의 스노우 페더에게 답장 전하기', at: ['center1', 'center1_snow'],
        talk: async o => lines(o, ['답장이다! ...사, 사령관님 앞에서는 안 읽을 거예요!', '고마워요. 이건 제가 아끼던 긴급 재기동 장치예요.']) }],
    reward: { items: { revive: 2 } } });
  sideQ({ id: 's_vanilla', title: '보급소 단골 손님', giver: ['shop1', 'shop1_clerk'], area: '오르카 보급소', avail: () => Game.badges.length >= 2,
    offer: ['주인님, 보급소 재고 정리를 하다가 정상화 칩이 부족한 걸 알았어요.', '혹시 남는 칩 두 개만 가져다주실 수 있나요? 대신 좋은 걸로 바꿔 드릴게요.'],
    summary: '바닐라가 보급소 재고용 정상화 칩을 구하고 있다.',
    steps: [{ goal: '정상화 칩 2개 가져가기', check: () => (Game.bag.chip || 0) >= 2, prog: () => Math.min(2, Game.bag.chip || 0) + ' / 2', at: ['shop1', 'shop1_clerk'], take: { chip: 2 },
      talk: async o => lines(o, ['정확히 두 개네요. 역시 주인님은 꼼꼼하세요.', '약속대로 완전 수복 키트예요. 아껴 쓰세요.']) }],
    reward: { items: { kit3: 2 } } });

  // ===== 서브: 남부 항구 마을 =====
  sideQ({ id: 's_merlin', title: '숲의 이상 현상', giver: ['harbor', 'merlin'], area: '남부 항구 마을', avail: () => badge('beta'),
    offer: ['오호, 사령관. 요즘 폭주한 바이오로이드가 늘었다는 보고가 있어.', '레모네이드의 제어 신호가 원인인지 확인해야 해. 폭주체를 열다섯 기만 진정시켜 주게. 데이터는 내가 알아서 모으지!'],
    summary: '멀린이 폭주 바이오로이드 증가 원인을 조사하고 있다. 전투에서 상대를 쓰러뜨리자.',
    steps: [{ goal: '상대 유닛 15기 쓰러뜨리기', check: s => (Game.stats.knockouts || 0) - (s.base || 0) >= 15, prog: s => Math.min(15, (Game.stats.knockouts || 0) - (s.base || 0)) + ' / 15',
      onStart: s => { s.base = Game.stats.knockouts || 0; }, at: ['harbor', 'merlin'],
      talk: async o => lines(o, ['역시! 폭주체들의 링크 파형에 배지와 같은 주파수가 섞여 있어.', '이건... 아니, 과학자는 확신 없이 말하지 않는 법이지. 수고비다. 에너지 셀이야!']) }],
    reward: { money: 800, items: { cell: 3 } } });
  sideQ({ id: 's_tomoe', title: '수련의 상대', giver: ['harbor', 'tomoe'], area: '남부 항구 마을', avail: () => badge('delta'),
    offer: ['사령관 님, 저는 더 강한 상대와 겨루고 싶습니다.', '폐허 해안의 레이븐 님과 케시크 님은 실력자라고 들었습니다. 두 분을 이기신 이야기를 들려주십시오!'],
    summary: '토모가 폐허 해안의 강자들과의 승부 이야기를 듣고 싶어 한다.',
    steps: [{ goal: '폐허 해안의 레이븐과 케시크 이기기', check: () => F('beat_raven') && F('beat_kheshig'), prog: () => (F('beat_raven') + F('beat_kheshig')) + ' / 2', at: ['harbor', 'tomoe'],
      talk: async o => lines(o, ['저격과 돌격을 모두 꺾으셨다니...! 역시 감마 님이 인정하신 분입니다.', '이건 제 수련용 키트입니다. ...그리고 사령관 님, 혹시 "붉은 연꽃의 검객" 이야기를 아십니까?']) }],
    reward: { money: 1500, items: { kit2: 3 } } });
  sideQ({ id: 's_shirayuri', title: '알파 님께 드릴 선물', giver: ['harbor', 'shirayuri'], area: '남부 항구 마을', avail: () => badge('beta'),
    offer: ['사령관님. 알파 님께서 요즘 구미호 이야기에 빠지셨습니다.', '엘프의 숲에 산다는 미호를 영입하신다면... 알파 님께 자랑하셔도 좋습니다.'],
    summary: '시라유리가 엘프의 숲에 사는 구미호 미호를 보고 싶어 한다.',
    steps: [{ goal: '미호 영입하기 (엘프의 숲, 드물게 출현)', check: () => caught('miho'), at: ['harbor', 'shirayuri'],
      talk: async o => lines(o, ['정말 미호를...! 그 여우불은 사진으로 보는 것보다 훨씬 아름답군요.', '알파 님께 드릴 사진을 찍어도 될까요? ...감사의 표시입니다.']) }],
    reward: { money: 1200, items: { kit3: 1, core2: 2 } } });
  sideQ({ id: 's_johanna', title: '런웨이의 새 얼굴', giver: ['harbor', 'johanna'], area: '남부 항구 마을', avail: () => badge('delta'),
    offer: ['델타 님의 다음 쇼에 설 모델을 찾고 있어요. 하늘을 나는 아이면 좋겠어요.', '흐레스벨그처럼 시원한 아이를 영입해 오시면 무대에 세워 드릴게요!'],
    summary: '요안나가 델타의 패션쇼에 설 비행형 모델을 찾고 있다.',
    steps: [{ goal: '흐레스벨그 영입하기 (폐허 해안)', check: () => caught('hraesvelgr'), at: ['harbor', 'johanna'],
      talk: async o => lines(o, ['이 날개! 이 기세! 델타 님도 분명 마음에 들어 하실 거예요.', '출연료는 사령관님께 드릴게요. 모델 본인은... 바람처럼 사라졌네요.']) }],
    reward: { money: 2500 } });

  // ===== 서브: 해안 · 리조트 =====
  sideQ({ id: 's_sekhmet', title: '이 어미의 시험', giver: ['resort', 'r_sekhmet'], area: '레모네이드 리조트', avail: () => F('dokJoined'),
    offer: ['폐하. 이 어미가 독점단 입단 시험을 준비했습니다.', '"괴물들의 어머니" 에키드나를 영입해 오시면... 이 어미가 폐하를 더 아껴 드리겠습니다.'],
    summary: '세크메트가 "어머니" 동지인 에키드나를 만나고 싶어 한다.',
    steps: [{ goal: '에키드나 영입하기 (설원 고지대)', check: () => caught('echidna'), at: ['resort', 'r_sekhmet'],
      talk: async o => lines(o, ['오오... 같은 어미의 눈빛이군요. 이 어미는 감동했습니다.', '폐하, 시험 합격입니다. 이 도시락과... 이 키트를 받으시옵소서.']) }],
    reward: { money: 2000, items: { kit3: 2 } } });

  // ===== 전설 사이드 스토리 =====
  sideQ({ id: 'l_hongryun', legend: true, title: '[전설] 붉은 연꽃의 검', giver: ['harbor', 'tomoe'], area: '남부 항구 마을', prev: 's_tomoe',
    offer: ['사령관 님. 엘프의 숲 깊은 곳에 붉은 연꽃이 피는 날, 전설의 검객이 나타난다고 합니다.', '숲의 수호자 하이엘븐 님이라면 무언가 아실 겁니다. 부디... 그 검을 보고 와 주십시오.'],
    summary: '토모가 들려준 전설. 엘프의 숲에 붉은 연꽃의 검객 "홍련"이 나타난다고 한다.',
    steps: [
      { goal: '엘프의 숲의 하이엘븐에게 전설에 대해 묻기', at: ['forest', 'highelven'],
        talk: async o => lines(o, ['홍련 말인가요? ...숲의 북서쪽, 큰 나무들 사이 공터에 붉은 꽃잎이 흩날리는 날이 있어요.', '그녀는 검을 든 자의 링크에만 응답해요. 오늘이라면... 꽃잎이 보일지도 몰라요.']),
        done: () => { Game.flags.lgq_hongryun = 1; } },
      { goal: '엘프의 숲 북서쪽 공터에서 홍련 만나기', check: () => metLegend('hongryun') },
      { goal: '남부 항구 마을의 토모에게 이야기 전하기', at: ['harbor', 'tomoe'],
        talk: async o => lines(o, ['정말로 홍련 님과 칼을 맞대셨습니까...!', '불꽃의 꽃잎을 남기는 검... 저도 언젠가 그 경지에 오르겠습니다. 감사합니다, 사령관 님!']) }],
    reward: { money: 3000, items: { kit3: 2, core2: 3 } } });
  sideQ({ id: 'l_phoenix', legend: true, title: '[전설] 꺼지지 않는 불꽃', giver: ['center1', 'center1_snow'], area: '오르카 수복실', avail: () => badge('epsilon'),
    offer: ['사령관님, 제 이름처럼 눈 덮인 고향 이야기를 들려드릴게요.', '설원 고지대에는 눈보라 속에서도 꺼지지 않는 불꽃의 새가 산대요. 길 잃은 사람을 인도해 준다고요.', '...저도 어릴 적 그 불빛을 본 적이 있어요. 정말 있는지 확인해 주시겠어요?'],
    summary: '스노우 페더가 설원의 불사조 전설을 이야기했다. 눈보라 속의 불꽃을 찾아보자.',
    steps: [
      { goal: '설원 고지대에 가기', check: () => F('visit_snowfield') },
      { goal: '알파 체육관의 시라유리에게 불꽃의 새에 대해 묻기', at: ['gym_alpha', 'shirayuri'],
        talk: async o => lines(o, ['불사조 말씀이십니까. 알파 님께서도 그 불빛을 보신 적이 있다고 하셨습니다.', '체육관 동쪽 눈밭, 바람이 멈추는 자리에서... 불꽃이 내려앉는다고 합니다.']),
        done: () => { Game.flags.lgq_phoenix = 1; } },
      { goal: '설원 고지대 동쪽 눈밭에서 불꽃의 새 찾기', check: () => metLegend('phoenix') },
      { goal: '오르카 수복실의 스노우 페더에게 알리기', at: ['center1', 'center1_snow'],
        talk: async o => lines(o, ['정말 있었구나... 꺼지지 않는 불꽃.', '그날 저를 인도해 준 것도 분명 그 아이였을 거예요. 고마워요, 사령관님.']) }],
    reward: { money: 3500, items: { kit3: 2, revive: 2 } } });
  sideQ({ id: 'l_eternity', legend: true, title: '[전설] 등대의 끝없는 빛', giver: ['coast', 'calista'], area: '폐허 해안', avail: () => F('cleared'),
    offer: ['사령관님, 해안 경비대로서 보고드릴 게 있습니다.', '흑막이 쓰러진 뒤로, 매일 밤 폐등대 꼭대기에 빛이 켜집니다. 전력이 끊긴 지 오래인데도요.', '저격수 레이븐이 그 빛을 가까이서 봤다고 합니다. 이야기를 들어 보시겠습니까?'],
    summary: '칼리스타가 매일 밤 켜지는 폐등대의 빛을 조사해 달라고 했다.',
    steps: [
      { goal: '폐허 해안의 레이븐에게 목격담 듣기', at: ['coast', 'raven'],
        talk: async o => lines(o, ['...그 빛, 스코프로 봤어. 사람이었어. 날개 같은 빛을 두른.', '"영원"이라는 단어를 중얼거리고 있었지. 등대 앞에 가 봐. 지금쯤 내려와 있을 거야.']),
        done: () => { Game.flags.lgq_eternity = 1; } },
      { goal: '폐등대 앞에서 빛의 정체 확인하기', check: () => metLegend('eternity') },
      { goal: '폐허 해안의 칼리스타에게 보고하기', at: ['coast', 'calista'],
        talk: async o => lines(o, ['이터니티... 삼안 산업의 전략 병기가 등대를 지키고 있었다니.', '해안 경비대 기록에 남겨 두겠습니다. 협조에 감사드립니다, 사령관님.']) }],
    reward: { money: 5000, items: { kit3: 3 } } });
  sideQ({ id: 'l_blacklilith', legend: true, title: '[전설] 삼안의 경호원', giver: ['lab', 'labiata'], area: '라비아타 연구소', avail: () => F('cleared'),
    offer: ['주인님, 둥지를 정리하다가 오래된 삼안 산업 기록을 찾았어요.', '"블랙 릴리스 — 경호 대상 외 전원 적대". 둥지 가장 깊은 곳에서 그 아이의 반응이 잡혀요.', '리조트의 세크메트 씨가 둥지 구조를 잘 안대요. 먼저 물어보세요.'],
    summary: '라비아타가 둥지 깊은 곳에서 블랙 릴리스의 반응을 찾았다.',
    steps: [
      { goal: '레모네이드 리조트의 세크메트에게 둥지 구조 묻기', at: ['resort', 'r_sekhmet'],
        talk: async o => lines(o, ['폐하, 그 아이는 둥지 북서쪽 끝 방에 있습니다.', '...폐하를 보면 경호 대상으로 인식할 것입니다. 이 어미처럼요. 조심하시옵소서.']),
        done: () => { Game.flags.lgq_blacklilith = 1; } },
      { goal: '둥지 북서쪽 끝에서 블랙 릴리스 만나기', check: () => metLegend('blacklilith') },
      { goal: '라비아타에게 보고하기', at: ['lab', 'labiata'],
        talk: async o => lines(o, ['블랙 릴리스가 주인님을 경호 대상으로 인정했다고요?', '...후훗, 이제 주인님 곁에는 지켜 주는 아이가 정말 많아졌네요.']) }],
    reward: { money: 5000, items: { kit3: 3 } } });
  sideQ({ id: 'l_master', legend: true, title: '[전설] 다섯 개의 전설', giver: ['base', 'rhea'], area: '오르카 캠프', avail: () => F('cleared'),
    offer: ['사령관님, 전설의 바이오로이드 연구를 시작했어요!', '홍련, 피닉스, 이터니티, 블랙 릴리스... 그리고 하나 더. 모두 만나고 오시면 연구가 완성돼요.', '마지막 하나는... 사령관님의 링크 그 자체일지도 모르겠네요. 후후.'],
    summary: '레아가 전설의 바이오로이드 연구를 하고 있다. 네 명의 전설을 모두 만나자.',
    steps: [{ goal: '전설의 바이오로이드 4명 만나기', check: () => ['hongryun', 'phoenix', 'eternity', 'blacklilith'].every(metLegend),
      prog: () => ['hongryun', 'phoenix', 'eternity', 'blacklilith'].filter(metLegend).length + ' / 4', at: ['base', 'rhea'],
      talk: async o => lines(o, ['네 명 모두...! 사령관님은 정말 전설 그 자체예요.', '연구 결과, 다섯 번째 전설은 "모두와 링크한 인간"이라고 결론 내렸어요.', '이건 연구 보수예요. 마스터 링크 코어! 어떤 아이와도 링크할 수 있어요.']) }],
    reward: { money: 10000, items: { core3: 1, kit3: 3 } } });

  // ---------------------------------------------------------------
  //  엔진
  // ---------------------------------------------------------------
  const byId = {}; QUESTS.forEach(q => byId[q.id] = q);
  const COL = { main: '#ffd23a', side: '#dfe7f0', grey: '#8d949c', mainDark: '#7a5200', sideDark: '#3b4654' };
  const Quests = {
    list: QUESTS, byId, COL, notes: [], queue: [],
    // 자동 완료 대기 중인 퀘스트를 하나씩 끝낸다 (World.update 에서 필드가 한가할 때 호출)
    async flush() {
      if (this.flushing || !this.queue.length) return;
      this.flushing = true; World.locked = true;
      try { while (this.queue.length) { const q = this.queue.shift(); if (this.active(q.id)) await this.advance(q); } }
      finally { World.locked = false; this.flushing = false; }
    },
    state(id) { if (!Game.quests) Game.quests = {}; return Game.quests[id]; },
    active(id) { const s = this.state(id); return s && s.s === 'active'; },
    done(id) { const s = this.state(id); return s && s.s === 'done'; },
    step(q) { const s = this.state(q.id); return s && s.s === 'active' ? q.steps[s.step] || null : null; },
    // 저장된 퀘스트 상태를 현재 정의에 맞게 정리 (모르는 퀘스트·범위 밖 단계·잘못된 값)
    sanitize(raw) {
      const out = {};
      if (!raw || typeof raw !== 'object') return out;
      for (const [id, v] of Object.entries(raw)) {
        const q = byId[id]; if (!q || !v || typeof v !== 'object') continue;
        if (v.s === 'done') { out[id] = { s: 'done', step: q.steps.length }; continue; }
        if (v.s !== 'active') continue;
        const step = Number.isInteger(v.step) ? v.step : 0;
        const s = out[id] = Object.assign({}, v, { s: 'active', step: clamp(step, 0, q.steps.length - 1) });
        // 단계 시작 때 기록하는 값(토벌 수 기준점 등)이 없거나 깨졌으면 지금 기준으로 다시 잡는다
        const st = q.steps[s.step];
        if (st.onStart && (!Number.isFinite(s.base) || s.base > (Game.stats.knockouts || 0))) st.onStart(s);
      }
      return out;
    },
    available(q) {
      if (this.state(q.id)) return false;
      if (q.prev && !this.done(q.prev)) return false;
      if (q.auto) return false;
      return !q.avail || q.avail();
    },
    stepReady(q) { const st = this.step(q); if (!st) return false; return !st.check || !!st.check(this.state(q.id)); },
    // 마커: 이 엔티티(현재 맵의 id)에 뜰 표시
    markerFor(map, id) {
      let best = null;
      const rank = m => (m.ch === '?' && m.col !== 'grey' ? 30 : m.ch === '!' ? 20 : 10) + (m.type === 'main' ? 1 : 0);
      const put = m => { if (!best || rank(m) > rank(best)) best = m; };
      for (const q of QUESTS) {
        const st = this.step(q);
        if (st && st.at && st.at[0] === map && st.at[1] === id) put({ ch: '?', col: this.stepReady(q) ? q.type : 'grey', type: q.type });
        if (q.giver && q.giver[0] === map && q.giver[1] === id && this.available(q)) put({ ch: '!', col: q.type, type: q.type });
      }
      return best;
    },
    // 다른 맵(건물 안 등)에 대한 마커: 문 위에 작게
    // 그 맵의 NPC가 지금 나와 있는지 (cond 플래그 조건)
    present(map, id) {
      const o = MAPS[map] && MAPS[map].objects.find(x => x.id === id && (x.t === 'npc' || x.t === 'trainer'));
      if (!o) return false;
      if (o.cond) { const neg = o.cond[0] === '!', f = !!Game.flags[o.cond.replace('!', '')]; if (neg ? f : !f) return false; }
      return true;
    },
    markerForMap(map) {
      let best = null, bestR = 0;
      for (const q of QUESTS) {
        const st = this.step(q);
        let m = null;
        if (st && st.at && st.at[0] === map && this.stepReady(q) && this.present(...st.at)) m = { ch: '?', col: q.type };
        else if (q.giver && q.giver[0] === map && this.available(q) && this.present(...q.giver)) m = { ch: '!', col: q.type };
        if (!m) continue;
        const r = (m.ch === '?' ? 20 : 10) + (q.type === 'main' ? 1 : 0);
        if (r > bestR) { best = m; bestR = r; }
      }
      return best;
    },
    start(q, silent) {
      if (!Game.quests) Game.quests = {};
      const s = Game.quests[q.id] = { s: 'active', step: 0 };
      if (q.steps[0].onStart) q.steps[0].onStart(s);
      if (!silent) { this.note('퀘스트 수락', q); Audio2.sfx('question', 0.6); }
    },
    advance(q) {
      const s = this.state(q.id), st = q.steps[s.step];
      if (st.take) for (const [k, n] of Object.entries(st.take)) Game.bag[k] = Math.max(0, (Game.bag[k] || 0) - n);
      if (st.done) st.done();
      s.step++;
      if (s.step >= q.steps.length) return this.finish(q);
      const nx = q.steps[s.step];
      if (nx.onStart) nx.onStart(s);
      this.note('목표 갱신', q);
    },
    async finish(q, silent) {
      const s = this.state(q.id); s.s = 'done'; s.step = q.steps.length;
      const r = q.reward || {};
      if (r.money) Game.money += r.money;
      for (const [k, n] of Object.entries(r.items || {})) Game.addItem(k, n);
      if (silent) return;
      this.note('퀘스트 완료!', q);
      Audio2.jingle([659, 784, 988, 1319], 0.1, 'square', 0.06); Audio2.sfx('item_get', 0.7);
      const parts = []; if (r.money) parts.push(r.money.toLocaleString() + 'P');
      for (const [k, n] of Object.entries(r.items || {})) parts.push(ITEMS[k].name + ' ×' + n);
      if (parts.length) await say('퀘스트 「' + q.title + '」 완료! 보상: ' + parts.join(', '));
    },
    note(head, q) { this.notes.push({ head, q, t: 0 }); },
    // 자동 단계 진행 · 메인 자동 수락 · 이전 세이브 따라잡기
    tick() {
      if (!Game.quests || typeof Game.quests !== 'object') Game.quests = {};
      const mains = QUESTS.filter(q => q.type === 'main');
      // 이미 다음 메인의 목표를 달성했다면 앞 메인은 완료 처리 (이전 세이브 따라잡기)
      let caught = 0, money = 0; const items = {};
      for (let i = 0; i < mains.length - 1; i++) {
        const q = mains[i], nx = mains[i + 1];
        if (this.done(q.id)) continue;
        const nxDone = nx.steps[0].check && nx.steps[0].check();
        if (nxDone && (!q.steps[q.steps.length - 1].check || q.steps[q.steps.length - 1].check())) { if (!this.state(q.id)) Game.quests[q.id] = { s: 'active', step: 0 }; this.finish(q, true); caught++; money += (q.reward && q.reward.money) || 0; for (const [k, n] of Object.entries((q.reward && q.reward.items) || {})) items[k] = (items[k] || 0) + n; }
      }
      if (caught) {
        const parts = [money.toLocaleString() + 'P'].concat(Object.entries(items).map(([k, n]) => ITEMS[k].name + ' ×' + n));
        this.note('진행도 반영', { type: 'main', title: '지나온 메인 퀘스트 ' + caught + '개 완료 · 보상: ' + parts.join(', ') });
      }
      for (const q of QUESTS) {
        const s = this.state(q.id);
        // 메인: 자동 시작 조건, 또는 받기 전에 목표를 이미 달성했으면 자동 수락
        if (!s && q.type === 'main' && (!q.prev || this.done(q.prev))) {
          if (q.auto ? q.auto() : (q.steps[0].check && q.steps[0].check())) this.start(q, !q.auto);
        }
        let guard = 0;
        while (this.active(q.id) && guard++ < 5) {
          const st = this.step(q);
          if (!st || st.at || !st.check || !st.check(this.state(q.id))) break;
          // 마지막 단계가 자동 완료라면 보상 대화가 다른 대화와 겹치지 않게, 필드가 한가할 때 처리한다
          if (this.state(q.id).step === q.steps.length - 1) { if (!this.queue.includes(q)) this.queue.push(q); break; }
          this.advance(q);
        }
      }
    },
    speakerOf(e) {
      const o = e.o;
      if (e.kind === 'trainer') { const T = TRAINERS[o.id]; return sp(T.name, T.portrait); }
      return sp(o.name, o.sprite);
    },
    // NPC와 대화. 보고했거나 퀘스트를 새로 받았으면 true (그 외에는 NPC 본래 대화·기능으로 이어진다)
    async talk(e) {
      const id = e.o.id, map = World.id, o = this.speakerOf(e);
      let did = false;
      // 1) 보고
      for (const q of QUESTS) {
        const st = this.step(q);
        if (!st || !st.at || st.at[0] !== map || st.at[1] !== id) continue;
        if (!this.stepReady(q)) continue;
        did = true;
        Audio2.voice(e.o.sprite || (TRAINERS[id] && TRAINERS[id].voice), 'talk', 0.8);
        if (st.talk) await st.talk(o);
        await this.advance(q);
      }
      // 2) 진행 중 (보고 불가): 짧은 안내만 하고 NPC 본래 대화로 넘긴다
      if (!did) for (const q of QUESTS) {
        const st = this.step(q);
        if (!st || !st.at || st.at[0] !== map || st.at[1] !== id || this.stepReady(q)) continue;
        await say('(「' + q.title + '」 진행 중: ' + st.goal + (st.prog ? ' · ' + st.prog(this.state(q.id)) : '') + ')', o);
        break;
      }
      // 3) 새 퀘스트 제안 (거절하면 본래 대화로)
      for (const q of QUESTS) {
        if (!q.giver || q.giver[0] !== map || q.giver[1] !== id || !this.available(q)) continue;
        Audio2.voice(e.o.sprite || (TRAINERS[id] && TRAINERS[id].voice), 'talk', 0.8);
        for (const l of q.offer || []) await say(l, o);
        const c = await ask((q.type === 'main' ? '[메인] ' : q.legend ? '[전설] ' : '[서브] ') + '「' + q.title.replace('[전설] ', '') + '」 퀘스트를 수락할까요?', ['수락한다', '나중에'], o);
        if (c === 0) { this.start(q); await say('퀘스트를 수락했다! 목표: ' + q.steps[0].goal); did = true; }
        else break; // 거절하면 나머지 제안은 다음에
      }
      this.tick();
      return did;
    },

    // ---------------- 그리기 ----------------
    drawGlyph(m, x, y, s = 1) {
      const t = Tick.time, b = Math.sin(t * 3.2) * 3;
      const col = m.col === 'grey' ? COL.grey : COL[m.col], dark = m.col === 'main' ? COL.mainDark : m.col === 'grey' ? '#2a2e33' : COL.sideDark;
      ctx.save(); ctx.translate(x, y + b); ctx.scale(s, s);
      if (m.col !== 'grey') { const g = ctx.createRadialGradient(0, -6, 2, 0, -6, 26); g.addColorStop(0, m.col === 'main' ? 'rgba(255,210,58,0.55)' : 'rgba(220,235,255,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(-28, -34, 56, 56); }
      ctx.font = font(44, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#101418'; ctx.strokeText(m.ch, 0, 10);
      ctx.lineWidth = 3; ctx.strokeStyle = m.col === 'main' ? '#fff3b0' : m.col === 'grey' ? '#5a6068' : '#ffffff'; ctx.strokeText(m.ch, 0, 10);
      const lg = ctx.createLinearGradient(0, -24, 0, 10); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, col); lg.addColorStop(1, dark);
      ctx.fillStyle = lg; ctx.fillText(m.ch, 0, 10);
      ctx.restore();
    },
    drawEntMarker(e) {
      if (!(e.kind === 'npc' || e.kind === 'trainer') || !e.o.id) return;
      const m = this.markerFor(World.id, e.o.id); if (!m) return;
      this.drawGlyph(m, e.px + 24, e.py - 40 - (e.o.boss ? 12 : 0));
    },
    drawDoorMarker(b) {
      if (!b.to) return;
      const m = this.markerForMap(b.to[0]); if (!m) return;
      this.drawGlyph(m, b.door * TILE + 24, (b.y + b.h) * TILE - 30, 0.75);
    },
    trackList() {
      const act = QUESTS.filter(q => this.active(q.id));
      act.sort((a, b) => (a.type === 'main' ? 0 : 1) - (b.type === 'main' ? 0 : 1) || (this.stepReady(b) - this.stepReady(a)));
      return act;
    },
    goalText(q) {
      const st = this.step(q), s = this.state(q.id); if (!st) return '';
      if (st.at && this.stepReady(q)) {
        const nm = this.npcName(st.at); return (st.check ? '완료! ' : '') + nm + '에게 가기 (' + ((MAPS[st.at[0]] && MAPS[st.at[0]].name) || '') + ')';
      }
      return st.goal + (st.prog ? '  ' + st.prog(s) : '');
    },
    npcName([map, id]) {
      if (TRAINERS[id]) return TRAINERS[id].name;
      const o = MAPS[map] && MAPS[map].objects.find(x => x.id === id); return (o && o.name) || id;
    },
    drawTracker() {
      if (Settings.questTracker === false) return;
      const act = this.trackList().slice(0, 3); if (!act.length) return;
      const w = 330, x = W - w - 14; let y = 14;
      ctx.save();
      for (const q of act) {
        const goal = this.goalText(q), gl = wrapText(goal, w - 40, 13, 600).slice(0, 2), h = 30 + gl.length * 17;
        ctx.globalAlpha = 0.86; ctx.fillStyle = 'rgba(6,12,24,0.72)'; chamfer(x, y, w, h, 8); ctx.fill(); ctx.globalAlpha = 1;
        const col = q.type === 'main' ? COL.main : COL.side;
        ctx.fillStyle = col; ctx.fillRect(x, y, 3, h);
        const ready = this.stepReady(q) && this.step(q).at;
        txt('?', x + 16, y + 21, { size: 18, weight: 900, align: 'center', color: ready ? col : COL.grey, stroke: 3, strokeColor: '#101418', shadow: false });
        txt(q.title, x + 30, y + 20, { size: 15, weight: 800, color: col, shadow: false });
        gl.forEach((l, i) => txt(l, x + 30, y + 38 + i * 17, { size: 13, weight: 600, color: '#d4e4f0', shadow: false }));
        y += h + 6;
      }
      ctx.restore();
    },
    drawNotes() {
      const n = this.notes[0]; if (!n) return;
      n.t += FRAME_DT;
      // 긴 알림(진행도 반영 등)은 여러 줄로 감싸고 더 오래 보여 준다. 오른쪽 위 추적 HUD를 피해 왼쪽 가운데에 둔다
      if (!n.lines) n.lines = wrapText(n.q.title, 560, 18, 800).slice(0, 4);
      const life = 2.6 + (n.lines.length - 1) * 1.2;
      if (n.t > life) { this.notes.shift(); return; }
      const a = n.t < 0.25 ? n.t / 0.25 : n.t > life - 0.4 ? (life - n.t) / 0.4 : 1;
      const col = n.q.type === 'main' ? COL.main : COL.side;
      ctx.save(); ctx.globalAlpha = a;
      // 지역 이름 배너(왼쪽 위, y 22~74)와 겹치지 않도록 그 아래에 둔다
      const cx = (W - 350) / 2 + 10, y = 140 - (1 - Math.min(1, n.t / 0.25)) * 20;
      // 건물 이름표 위에 겹쳐도 읽히도록 반투명 띠를 깐다
      const bh = 46 + n.lines.length * 24, bw = 600;
      ctx.fillStyle = 'rgba(4,10,22,0.72)'; chamfer(cx - bw / 2, y - 36, bw, bh, 10); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(cx - bw / 2, y - 36, 4, bh);
      txt(n.head, cx, y, { size: 30, weight: 900, align: 'center', color: col, family: TITLE_FONT, stroke: 6, strokeColor: 'rgba(0,0,0,0.75)', shadow: false });
      n.lines.forEach((l, i) => txt(l, cx, y + 30 + i * 24, { size: 18, weight: 800, align: 'center', color: '#fff', stroke: 4, strokeColor: 'rgba(0,0,0,0.75)', shadow: false }));
      ctx.restore();
    },
  };
  window.Quests = Quests;
  window.QUESTS = QUESTS;

  // ---------------------------------------------------------------
  //  퀘스트 일지 화면
  // ---------------------------------------------------------------
  class QuestLogScreen {
    constructor() {
      Quests.tick();
      const act = Quests.trackList(), avail = QUESTS.filter(q => Quests.available(q) && q.giver), done = QUESTS.filter(q => Quests.done(q.id));
      this.rows = [...act.map(q => ({ q, k: 'act' })), ...avail.map(q => ({ q, k: 'avail' })), ...done.map(q => ({ q, k: 'done' }))];
      this.nav = new ListNav(Math.max(1, this.rows.length), { visible: 10 });
    }
    update(dt) { const r = this.nav.update(dt); if (r === 'b' || (r === 'a' && !this.rows.length)) { Audio2.cancel(); UI.close(this); } }
    draw() {
      screenBG('퀘스트 일지', '노랑: 메인 · 은색: 서브 · 회색 ?: 진행 중');
      panel(20, 72, 380, 520); panel(412, 72, 528, 520);
      if (!this.rows.length) { txt('진행 중인 퀘스트가 없다.', 210, 320, { size: 18, align: 'center', color: UI_COL.sub }); helpLine('X: 돌아가기'); return; }
      this.nav.beginDraw();
      const top = this.nav.scroll || 0, vis = 10;
      for (let i = top; i < Math.min(this.rows.length, top + vis); i++) {
        const { q, k } = this.rows[i], y = 88 + (i - top) * 50, on = i === this.nav.i;
        this.nav.rect(i, 30, y, 360, 46);
        if (on) { chamfer(30, y, 360, 46, 8); ctx.fillStyle = UI_COL.sel; ctx.fill(); }
        const ready = k === 'act' && Quests.stepReady(q) && Quests.step(q).at;
        const col = k === 'done' ? '#6f7b86' : k === 'act' && !ready ? COL.grey : q.type === 'main' ? COL.main : COL.side;
        const ch = k === 'avail' ? '!' : k === 'done' ? '✓' : '?';
        txt(ch, 50, y + 31, { size: 22, weight: 900, align: 'center', color: col, stroke: 3, strokeColor: '#101418', shadow: false });
        txt(q.title, 70, y + 22, { size: 17, weight: 800, color: k === 'done' ? '#8a96a2' : '#fff' });
        txt((k === 'act' ? '진행 중' : k === 'avail' ? '받을 수 있음' : '완료') + ' · ' + (q.type === 'main' ? '메인' : q.legend ? '전설' : '서브'), 70, y + 40, { size: 12, color: col });
      }
      if (this.rows.length > vis) txt((this.nav.i + 1) + ' / ' + this.rows.length, 380, 584, { size: 13, align: 'right', color: UI_COL.sub });
      // 상세
      const { q, k } = this.rows[this.nav.i], s = Quests.state(q.id), col = q.type === 'main' ? COL.main : COL.side;
      txt(q.title, 436, 112, { size: 24, weight: 900, color: col });
      txt((q.type === 'main' ? '메인 퀘스트' : q.legend ? '전설 사이드 스토리' : '서브 퀘스트') + (q.giver ? ' · 의뢰: ' + Quests.npcName(q.giver) + ' (' + MAPS[q.giver[0]].name + ')' : ''), 436, 138, { size: 13, color: UI_COL.sub });
      let y = 172;
      wrapText(q.summary || '', 480, 16, 500).forEach(l => { txt(l, 436, y, { size: 16, weight: 500, color: '#cfe6f5' }); y += 24; });
      y += 14; txt('목표', 436, y, { size: 15, weight: 800, color: UI_COL.accent }); y += 26;
      const cur = s ? s.step : -1;
      q.steps.forEach((st, i) => {
        if (k !== 'done' && i > cur && k !== 'avail') return;
        if (k === 'avail' && i > 0) return;
        const doneStep = k === 'done' || i < cur;
        const label = (doneStep ? '✓ ' : '• ') + st.goal + (!doneStep && st.prog && s ? '  (' + st.prog(s) + ')' : '');
        wrapText(label, 480, 15, 600).forEach(l => { txt(l, 446, y, { size: 15, color: doneStep ? '#7d8a96' : '#fff' }); y += 22; });
      });
      if (k === 'act' && Quests.stepReady(q) && Quests.step(q).at) { y += 4; txt('→ ' + Quests.goalText(q), 446, y, { size: 14, weight: 700, color: col }); y += 22; }
      const r = q.reward || {}, parts = [];
      if (r.money) parts.push(r.money.toLocaleString() + 'P');
      for (const [it, n] of Object.entries(r.items || {})) parts.push(ITEMS[it].name + ' ×' + n);
      if (parts.length) { txt('보상', 436, 548, { size: 15, weight: 800, color: UI_COL.accent }); txt(parts.join(' · '), 486, 548, { size: 14, color: '#fff' }); }
      helpLine('▲▼ 선택   X: 돌아가기');
    }
  }
  window.QuestLogScreen = QuestLogScreen;
})();
