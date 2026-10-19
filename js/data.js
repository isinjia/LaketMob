// =====================================================================
//  라켓몬스터 - 게임 데이터 (타입 / 기술 / 유닛 / 아이템)
// =====================================================================

// ---------- 타입 ----------
const TYPES = {
  light: { name: '경장', color: '#4fc3f7', dark: '#0b5d82' },
  heavy: { name: '중장', color: '#ffb74d', dark: '#8a4b00' },
  air:   { name: '기동', color: '#8bdc7a', dark: '#2f6b23' },
  phys:  { name: '물리', color: '#c3ccd6', dark: '#4b5563' },
  fire:  { name: '화염', color: '#ff7a45', dark: '#8f2a07' },
  ice:   { name: '냉기', color: '#7fe3f0', dark: '#16707c' },
  elec:  { name: '전기', color: '#ffe14d', dark: '#7d6a00' },
};
const TYPE_ORDER = ['light', 'heavy', 'air', 'phys', 'fire', 'ice', 'elec'];
// 특성: 병종(경장/중장/기동)에 따른 패시브 + 공통 '분전'(HP 1/3 이하에서 자기 타입 기술 위력 1.3배)
const TRAITS = {
  light: { name: '약점 포착', desc: '치명타 확률이 2배가 된다.' },
  heavy: { name: '중장갑', desc: '상성이 불리한 공격의 피해를 25% 줄인다.' },
  air:   { name: '회피 기동', desc: '상대 기술의 명중률을 10% 낮춘다.' },
  rally: { name: '분전', desc: 'HP가 1/3 이하일 때 자기 타입 기술의 위력이 1.3배가 된다.' },
};
function traitOf(m) { return ['light', 'heavy', 'air'].find(t => m.types.includes(t)) || null; }

// 공격 타입 -> 방어 타입 배율
const EFF = {
  light: { air: 2, heavy: 0.5 },
  heavy: { light: 2, air: 0.5 },
  air:   { heavy: 2, light: 0.5 },
  // 물리는 모든 병종에 중립. 불리한 자속을 대신할 기본 공격으로 쓴다.
  phys:  {},
  fire:  { ice: 2, fire: 0.5 },
  ice:   { elec: 2, ice: 0.5 },
  elec:  { fire: 2, elec: 0.5 },
};
function typeEff(atkType, defTypes) {
  let m = 1;
  for (const t of defTypes) { const r = EFF[atkType] && EFF[atkType][t]; if (r) m *= r; }
  return m;
}

// 자원 보유량 때문에 패배 비용이 불어나지 않는다. 첫 배지 전에는 무료 재도전.
function defeatCost(money, badges) {
  const n = clamp(Math.floor(badges), 0, 7);
  return Math.min(Math.max(0, Math.floor(money)), n === 0 ? 0 : 200 + n * 100);
}

// ---------- 상태이상 ----------
const STATUS = {
  burn:   { name: '화상', short: '화상', color: '#ff7043' },
  para:   { name: '감전', short: '감전', color: '#ffd54f' },
  freeze: { name: '동결', short: '동결', color: '#80deea' },
  corrode:{ name: '침식', short: '침식', color: '#ba68c8' },
};

// ---------- 랭크 (진화 대용: 승급) ----------
const RANKS = ['B', 'A', 'S', 'SS'];
const RANK_MULT = { B: 1.0, A: 1.12, S: 1.25, SS: 1.4 };
const RANK_COLOR = { B: '#7fb2ff', A: '#b97dff', S: '#ffc94a', SS: '#ff6b9a' };
const PROMOTE_LV = { B: 16, A: 30, S: 44 }; // 이 레벨에 도달하면 다음 랭크로 승급
const EVOLVE_LV = [16, 30, 44, 52, 58]; // 스킨 진화 레벨 (스킨 1번째, 2번째, ...)

// ---------- 기술 ----------
// cat: 'atk' 공격 / 'st' 변화.  fx: 연출 키
// eff: {burn/para/freeze/corrode: 확률} / self:{atk,def,spd,acc} / foe:{...} / heal / drain / recoil / hits / prio / crit
const MOVES = {
  // 물리
  shot:     { name: '사격', type: 'phys', cat: 'atk', pow: 40, acc: 100, pp: 35, fx: 'bullet', desc: '기본 화기로 적을 사격한다.' },
  tackle:   { name: '근접 타격', type: 'phys', cat: 'atk', pow: 40, acc: 100, pp: 35, fx: 'smash', desc: '거리를 좁혀 무기와 주먹으로 후려친다.' },
  burst:    { name: '연속 사격', type: 'phys', cat: 'atk', pow: 18, acc: 95, pp: 20, hits: [2, 5], fx: 'bullets', desc: '2~5회 연속으로 사격한다.' },
  strike:   { name: '개머리판 강타', type: 'phys', cat: 'atk', pow: 70, acc: 100, pp: 20, fx: 'smash', desc: '총의 개머리판으로 후려친다.' },
  snipe:    { name: '저격', type: 'phys', cat: 'atk', pow: 90, acc: 90, pp: 10, crit: 2, fx: 'snipe', desc: '약점을 노려 저격한다. 치명타가 나기 쉽다.' },
  overload: { name: '오버로드', type: 'phys', cat: 'atk', pow: 120, acc: 100, pp: 5, recoil: 0.33, fx: 'smash', desc: '출력을 한계까지 올려 공격한다. 반동을 받는다.' },
  aimed:    { name: '정조준', type: 'phys', cat: 'st', acc: 0, pp: 20, self: { atk: 2 }, fx: 'buff', desc: '조준을 가다듬어 공격이 크게 오른다.' },
  guard:    { name: '방어 태세', type: 'phys', cat: 'st', acc: 0, pp: 20, self: { def: 2 }, fx: 'shield', desc: '방어 태세를 갖춰 방어가 크게 오른다.' },
  repair:   { name: '응급 수복', type: 'phys', cat: 'st', acc: 0, pp: 10, heal: 0.5, fx: 'heal', desc: '나노머신으로 HP를 최대치의 절반 회복한다.' },
  taunt:    { name: '위협 사격', type: 'phys', cat: 'st', acc: 100, pp: 30, foe: { atk: -1 }, fx: 'debuff', desc: '위협 사격으로 상대의 공격을 떨어뜨린다.' },
  smoke:    { name: '연막탄', type: 'phys', cat: 'st', acc: 100, pp: 20, foe: { acc: -1 }, fx: 'smoke', desc: '연막을 펼쳐 상대의 명중률을 떨어뜨린다.' },
  command:  { name: '전술 지휘', type: 'phys', cat: 'st', acc: 0, pp: 15, self: { atk: 1, spd: 1 }, fx: 'buff', desc: '전장을 지휘해 공격과 속도가 오른다.' },
  coverfire:{ name: '엄호 사격', type: 'phys', cat: 'atk', pow: 55, acc: 100, pp: 15, self: { def: 1 }, fx: 'bullet', desc: '엄폐 지점을 확보하며 사격한다. 자신의 방어가 오른다.' },
  // 경장
  quick:    { name: '기습', type: 'light', cat: 'atk', pow: 40, acc: 100, pp: 30, prio: 1, fx: 'slash', desc: '반드시 먼저 공격하는 기습.' },
  blade:    { name: '근접 베기', type: 'light', cat: 'atk', pow: 65, acc: 100, pp: 20, fx: 'slash', desc: '근접 무기로 베어낸다.' },
  rush:     { name: '돌격', type: 'light', cat: 'atk', pow: 85, acc: 95, pp: 15, fx: 'dash', desc: '전력으로 돌격해 들이친다.' },
  flash:    { name: '섬광 연격', type: 'light', cat: 'atk', pow: 110, acc: 85, pp: 5, fx: 'slash3', desc: '눈에 보이지 않는 속도로 연속 공격한다.' },
  steelwill:{ name: '강철의 의지', type: 'light', cat: 'atk', pow: 90, acc: 100, pp: 10, self: { def: 1 }, fx: 'slash3', desc: '스틸라인의 긍지. 공격 후 방어가 오른다.' },
  execute:  { name: '처형', type: 'light', cat: 'atk', pow: 130, acc: 95, pp: 5, crit: 2, fx: 'slash3', desc: '블랙 리리스의 일격. 치명타가 나기 쉽다.' },
  expose:   { name: '약점 노출', type: 'light', cat: 'atk', pow: 55, acc: 100, pp: 15, eff: { foeDef: 0.3 }, fx: 'snipe', desc: '장갑의 이음새를 노린다. 30% 확률로 상대의 방어를 떨어뜨린다.' },
  // 중장
  shell:    { name: '포격', type: 'heavy', cat: 'atk', pow: 60, acc: 95, pp: 25, fx: 'shell', desc: '포탄을 쏘아 공격한다.' },
  barrage:  { name: '일제 포격', type: 'heavy', cat: 'atk', pow: 90, acc: 90, pp: 10, fx: 'barrage', desc: '모든 포문을 열어 일제히 포격한다.' },
  railgun:  { name: '레일건', type: 'heavy', cat: 'atk', pow: 120, acc: 80, pp: 5, fx: 'beam', desc: '전자기 가속포. 강력하지만 빗나가기 쉽다.' },
  fortify:  { name: '요새화', type: 'heavy', cat: 'st', acc: 0, pp: 10, self: { def: 1 }, heal: 0.25, fx: 'shield', desc: '진지를 구축한다. 방어가 오르고 HP를 조금 회복.' },
  // 기동
  dive:     { name: '급강하', type: 'air', cat: 'atk', pow: 60, acc: 100, pp: 25, fx: 'dive', desc: '상공에서 내리꽂듯 공격한다.' },
  strafe:   { name: '기총 소사', type: 'air', cat: 'atk', pow: 80, acc: 95, pp: 15, fx: 'bullets', desc: '저공 비행하며 기총을 퍼붓는다.' },
  bomb:     { name: '공중 폭격', type: 'air', cat: 'atk', pow: 100, acc: 90, pp: 10, fx: 'bombs', desc: '하늘에서 폭탄을 쏟아붓는다.' },
  afterburn:{ name: '애프터버너', type: 'air', cat: 'st', acc: 0, pp: 20, self: { spd: 2 }, fx: 'buff', desc: '추진기를 점화해 속도가 크게 오른다.' },
  bloodlink:{ name: '혈광 흡수', type: 'air', cat: 'atk', pow: 65, acc: 95, pp: 10, drain: 0.4, fx: 'beam', desc: '붉은 빛으로 링크 에너지를 흡수한다. 준 피해의 40%만큼 자신을 회복한다.' },
  // 화염
  flamer:   { name: '화염 방사', type: 'fire', cat: 'atk', pow: 50, acc: 100, pp: 25, eff: { burn: 0.1 }, fx: 'flame', desc: '화염을 내뿜는다. 화상을 입힐 때가 있다.' },
  incend:   { name: '소이탄', type: 'fire', cat: 'atk', pow: 75, acc: 95, pp: 15, eff: { burn: 0.2 }, fx: 'fireball', desc: '소이탄을 발사한다. 화상을 입힐 때가 있다.' },
  napalm:   { name: '네이팜 폭격', type: 'fire', cat: 'atk', pow: 105, acc: 85, pp: 5, eff: { burn: 0.3 }, fx: 'napalm', desc: '일대를 불바다로 만든다.' },
  foxfire:  { name: '여우불', type: 'fire', cat: 'atk', pow: 80, acc: 100, pp: 10, eff: { burn: 0.3 }, fx: 'fireball', desc: '요염한 푸른 여우불. 화상을 입히기 쉽다.' },
  crimson:  { name: '홍련', type: 'fire', cat: 'atk', pow: 95, acc: 100, pp: 10, eff: { burn: 0.2 }, fx: 'napalm', desc: '붉은 연꽃처럼 피어나는 업화.' },
  // 냉기
  coldshot: { name: '냉각탄', type: 'ice', cat: 'atk', pow: 50, acc: 100, pp: 25, eff: { freeze: 0.1 }, fx: 'ice', desc: '냉각탄을 쏜다. 동결시킬 때가 있다.' },
  cryo:     { name: '극저온 레이저', type: 'ice', cat: 'atk', pow: 75, acc: 100, pp: 15, eff: { freeze: 0.1 }, fx: 'icebeam', desc: '극저온의 레이저를 발사한다.' },
  absolute: { name: '절대영도', type: 'ice', cat: 'atk', pow: 105, acc: 85, pp: 5, eff: { freeze: 0.2 }, fx: 'blizzard', desc: '모든 것을 얼려버리는 냉기.' },
  // 전기
  shock:    { name: '전격', type: 'elec', cat: 'atk', pow: 50, acc: 100, pp: 25, eff: { para: 0.1 }, fx: 'spark', desc: '전격을 가한다. 감전시킬 때가 있다.' },
  plasma:   { name: '플라즈마 캐논', type: 'elec', cat: 'atk', pow: 80, acc: 100, pp: 15, eff: { para: 0.1 }, fx: 'plasma', desc: '플라즈마 탄을 발사한다.' },
  thunder:  { name: '뇌격', type: 'elec', cat: 'atk', pow: 110, acc: 75, pp: 5, eff: { para: 0.3 }, fx: 'thunder', desc: '거대한 번개를 떨어뜨린다.' },
  emp:      { name: 'EMP', type: 'elec', cat: 'st', acc: 90, pp: 15, status: 'para', fx: 'spark', desc: '전자기 펄스로 상대를 감전시킨다.' },
  eternal:  { name: '영원의 섬광', type: 'elec', cat: 'atk', pow: 125, acc: 90, pp: 5, eff: { para: 0.2 }, fx: 'thunder', desc: '이터니티가 다루는 끝없는 빛의 창.' },
  // 레모네이드 전용
  order:    { name: '절대 명령', type: 'elec', cat: 'atk', pow: 90, acc: 100, pp: 5, eff: { para: 0.2 }, fx: 'thunder', desc: '레모네이드 오메가의 절대 명령. 강렬한 전자기 충격이 몰아친다.' },
  // 램파리온 전용 (용자 로봇)
  knuckle:  { name: '브로큰 너클', type: 'light', cat: 'atk', pow: 75, acc: 100, pp: 15, fx: 'dash', desc: '회전하는 주먹을 로켓처럼 쏘아 보내 꿰뚫는다. 주먹은 날아서 돌아온다.' },
  protect:  { name: '프로텍트 월', type: 'light', cat: 'st', acc: 0, pp: 10, self: { def: 2 }, heal: 0.2, fx: 'shield', desc: '왼팔에 방어장을 펼쳐 공격을 받아낸다. 방어가 크게 오르고 HP를 조금 회복.' },
  drillknee:{ name: '드릴 니', type: 'light', cat: 'atk', pow: 85, acc: 95, pp: 10, crit: 2, fx: 'smash', desc: '무릎의 드릴로 장갑을 뚫는다. 치명타가 나기 쉽다.' },
  bravefuse:{ name: '용자 합체', type: 'fire', cat: 'st', acc: 0, pp: 5, self: { atk: 1, def: 1, spd: 1 }, fx: 'buff', desc: '사자의 심장에 링크를 잇는 최종 합체. 공격·방어·속도가 모두 오른다.' },
  shining:  { name: '샤이닝 핸드', type: 'fire', cat: 'atk', pow: 110, acc: 95, pp: 5, eff: { burn: 0.3 }, fx: 'shininghand', desc: '하얗게 빛나는 오른손으로 돌진해 상대를 움켜쥐고, 빛으로 감싸 폭발시킨다. 화상을 입히기 쉽다.' },
  heavenhell:{ name: '헤븐 앤 헬', type: 'light', cat: 'atk', pow: 150, acc: 95, pp: 3, recoil: 0.2, fx: 'thunder', desc: '파괴와 수호의 힘을 두 손에 모아 하나로 짓눌러 부순다. 램파리온 최강의 필살기. 반동을 받는다.' },
};

// ---------- 유닛 (도감) ----------
// base: [HP, 공격, 방어, 속도]
const SPECIES_LIST = [
  // 스타터
  { key: 'leprechaun', name: '레프리콘', types: ['light'], base: [52, 64, 46, 64], rank: 'B', catch: 45, exp: 64, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'shot'], [1, 'command'], [5, 'quick'], [7, 'taunt'], [9, 'burst'], [13, 'blade'], [22, 'rush'], [27, 'aimed'], [33, 'snipe'], [39, 'flash']],
    desc: '브라우니들을 이끄는 소대장. 작은 체구지만 지휘 능력이 뛰어나 아군의 사기를 끌어올린다.' },
  { key: 'gnome', name: '노움', types: ['light', 'fire'], base: [60, 64, 56, 44], rank: 'B', catch: 45, exp: 64, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'tackle'], [1, 'guard'], [5, 'flamer'], [9, 'shell'], [13, 'taunt'], [17, 'incend'], [22, 'fortify'], [27, 'barrage'], [33, 'napalm'], [39, 'railgun']],
    desc: '대구경 화기를 다루는 경장형 바이오로이드. 무뚝뚝해 보이지만 동료를 끝까지 지키는 든든한 포병.' },
  { key: 'harpy', name: '하르페이아', types: ['air', 'elec'], base: [48, 62, 44, 70], rank: 'SS', catch: 45, exp: 64, kind: 'bio', faction: '스카이나이츠',
    moves: [[1, 'shot'], [1, 'afterburn'], [5, 'shock'], [9, 'dive'], [13, 'smoke'], [17, 'strafe'], [22, 'plasma'], [27, 'emp'], [33, 'bomb'], [39, 'thunder']],
    desc: '스카이나이츠의 막내 파일럿. 하늘을 나는 것을 무엇보다 좋아하며 속도만큼은 누구에게도 지지 않는다.' },
  // 1번 도로 / 초반
  { key: 'brownie', name: '브라우니', types: ['light'], base: [40, 46, 36, 56], rank: 'B', catch: 230, exp: 40, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'shot'], [5, 'taunt'], [8, 'quick'], [11, 'burst'], [18, 'blade'], [25, 'rush']],
    desc: '어디에나 있는 양산형 보병. 수가 많고 겁도 많지만, 모이면 의외로 무섭다. "부, 분대장님!"' },
  { key: 'hyena', name: '하이에나', types: ['light'], base: [46, 58, 40, 62], rank: 'A', catch: 190, exp: 48, kind: 'bio', faction: '스틸라인',
    moves: [[1, 'tackle'], [8, 'quick'], [10, 'blade'], [13, 'taunt'], [19, 'rush'], [26, 'flash']],
    desc: '거친 말투의 근접 전투원. 한 번 문 상대는 놓지 않는 끈질김이 특기.' },
  { key: 'gremlin', name: '그렘린', types: ['light', 'elec'], base: [42, 54, 42, 60], rank: 'B', catch: 190, exp: 50, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'shot'], [4, 'shock'], [8, 'smoke'], [13, 'emp'], [18, 'plasma'], [26, 'thunder']],
    desc: '기계라면 뭐든 뜯어보는 정비병. 그녀가 지나간 자리엔 늘 나사 몇 개가 남는다.' },
  { key: 'nymph', name: '님프', types: ['light', 'ice'], base: [54, 44, 52, 50], rank: 'A', catch: 170, exp: 52, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'shot'], [1, 'repair'], [6, 'coldshot'], [9, 'smoke'], [12, 'guard'], [16, 'cryo'], [24, 'absolute']],
    desc: '부대의 회복을 담당하는 지원기. 다정하지만 냉기 탄환의 위력은 결코 만만치 않다.' },
  // 엘프의 숲
  { key: 'sylphid', name: '실피드', types: ['air'], base: [50, 60, 46, 76], rank: 'A', catch: 150, exp: 62, kind: 'bio', faction: '스카이나이츠',
    moves: [[1, 'dive'], [1, 'afterburn'], [9, 'burst'], [14, 'strafe'], [20, 'smoke'], [28, 'bomb']],
    desc: '바람을 타고 나는 경쾌한 정찰기. 성격도 바람처럼 자유분방하다.' },
  { key: 'pixie', name: '픽시', types: ['heavy', 'elec'], base: [44, 56, 42, 78], rank: 'A', catch: 160, exp: 60, kind: 'bio', faction: '스카이나이츠',
    moves: [[1, 'shock'], [1, 'quick'], [9, 'dive'], [14, 'emp'], [20, 'plasma'], [28, 'thunder']],
    desc: '장난을 좋아하는 꼬마 중장형 보호기. 찌릿한 전기 장난에 당한 동료가 한둘이 아니다.' },
  { key: 'undine', name: '운디네', types: ['air', 'ice'], base: [64, 56, 62, 38], rank: 'S', catch: 140, exp: 66, kind: 'bio', faction: '아쿠아 탱크',
    moves: [[1, 'coldshot'], [1, 'guard'], [9, 'shell'], [15, 'cryo'], [21, 'fortify'], [29, 'absolute']],
    desc: '수중전 특화 기동형. 물가에서는 누구보다 든든하다. 차가운 첫인상과 달리 정이 많다.' },
  { key: 'spriggan', name: '스프리건', types: ['heavy'], base: [66, 62, 66, 34], rank: 'A', catch: 140, exp: 66, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'tackle'], [1, 'guard'], [8, 'strike'], [14, 'shell'], [20, 'fortify'], [27, 'barrage'], [35, 'overload']],
    desc: '거대한 방패를 든 돌격병. 그녀 뒤에 서 있으면 포탄도 무섭지 않다.' },
  { key: 'impet', name: '임펫', types: ['air', 'fire'], base: [48, 66, 42, 68], rank: 'B', catch: 150, exp: 62, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'flamer'], [1, 'quick'], [9, 'blade'], [15, 'incend'], [21, 'rush'], [29, 'napalm']],
    desc: '작은 악마 같은 화염병. 불장난을 좋아해 늘 혼나지만 전장에선 누구보다 뜨겁다.' },
  { key: 'miho', name: '미호', types: ['light', 'fire'], base: [54, 72, 48, 74], rank: 'A', catch: 60, exp: 110, kind: 'bio', faction: '페어리 시리즈',
    moves: [[1, 'quick'], [1, 'flamer'], [12, 'blade'], [18, 'foxfire'], [26, 'rush'], [34, 'flash']],
    desc: '구미호를 모티브로 한 바이오로이드. 요염한 미소 뒤에 푸른 여우불을 감추고 있다.' },
  // 해안
  { key: 'bulgasari', name: '불가사리', types: ['heavy'], base: [78, 70, 82, 30], rank: 'S', catch: 120, exp: 90, kind: 'bio', faction: '둠 브링어',
    moves: [[1, 'tackle'], [1, 'guard'], [14, 'strike'], [18, 'shell'], [24, 'fortify'], [30, 'overload'], [36, 'barrage']],
    desc: '쇠를 먹는다는 전설의 괴수에서 이름을 딴 중장갑병. 웬만한 공격엔 꿈쩍도 하지 않는다.' },
  { key: 'talonfeather', name: '탈론페더', types: ['air', 'elec'], base: [56, 74, 50, 82], rank: 'S', catch: 110, exp: 92, kind: 'bio', faction: '스카이나이츠',
    moves: [[1, 'dive'], [1, 'shock'], [14, 'strafe'], [19, 'plasma'], [25, 'afterburn'], [32, 'thunder']],
    desc: '날카로운 발톱이라는 이름처럼 공격적인 요격기. 하늘에서 그녀의 눈을 피할 수는 없다.' },
  { key: 'hraesvelgr', name: '흐레스벨그', types: ['air', 'ice'], base: [60, 76, 56, 80], rank: 'S', catch: 60, exp: 120, kind: 'bio', faction: '스카이나이츠',
    moves: [[1, 'dive'], [1, 'coldshot'], [14, 'strafe'], [20, 'cryo'], [27, 'bomb'], [34, 'absolute']],
    desc: '스카이나이츠의 에이스. 시원시원한 성격의 리더로, 차가운 폭풍을 몰고 다닌다.' },
  { key: 'perrault', name: '페로', types: ['light', 'ice'], base: [56, 70, 52, 74], rank: 'S', catch: 110, exp: 92, kind: 'bio', faction: '퍼펫 시리즈',
    moves: [[1, 'quick'], [1, 'coldshot'], [14, 'blade'], [19, 'cryo'], [25, 'aimed'], [32, 'flash']],
    desc: '고양이 같은 변덕쟁이. 장화를 신고 전장을 경쾌하게 누빈다.' },
  { key: 'alice', name: '앨리스', types: ['air', 'ice'], base: [62, 80, 56, 76], rank: 'SS', catch: 55, exp: 125, kind: 'bio', faction: '바닐라 시리즈',
    moves: [[1, 'blade'], [1, 'coldshot'], [15, 'rush'], [21, 'cryo'], [28, 'aimed'], [35, 'absolute'], [40, 'flash']],
    desc: '우아한 메이드이자 냉혹한 전사. 사령관에게 향하는 애정은 누구보다 깊다.' },
  { key: 'gigantes', name: '기간테스', types: ['heavy', 'elec'], base: [82, 72, 86, 28], rank: 'S', catch: 100, exp: 100, kind: 'ags', faction: 'AGS',
    moves: [[1, 'tackle'], [1, 'shock'], [15, 'shell'], [20, 'plasma'], [26, 'fortify'], [33, 'railgun']],
    desc: '거대한 몸집의 공병형 AGS. 묵묵히 전선을 떠받치는 강철 거인.' },
  { key: 'daika', name: '다이카', types: ['air'], base: [58, 78, 50, 80], rank: 'A', catch: 100, exp: 96, kind: 'bio', faction: '앵거 오브 호드',
    moves: [[1, 'quick'], [1, 'blade'], [16, 'burst'], [21, 'rush'], [27, 'command'], [34, 'flash']],
    desc: '호드의 맹렬한 돌격병. 전투 중 웃음을 멈추지 않아 적에게 공포의 대상이 된다.' },
  { key: 'bloodypanther', name: '블러디 팬서', types: ['heavy'], base: [58, 84, 50, 86], rank: 'SS', catch: 55, exp: 125, kind: 'bio', faction: '앵거 오브 호드',
    moves: [[1, 'quick'], [1, 'blade'], [16, 'rush'], [22, 'aimed'], [29, 'snipe'], [36, 'flash']],
    desc: '피처럼 붉은 표범. 사냥감을 노리는 순간의 집중력은 누구도 따라올 수 없다.' },
  { key: 'cheona', name: '천아', types: ['light', 'fire'], base: [70, 78, 70, 46], rank: 'SS', catch: 55, exp: 125, kind: 'bio', faction: '천공의 별',
    moves: [[1, 'flamer'], [1, 'shell'], [16, 'incend'], [22, 'barrage'], [29, 'fortify'], [36, 'napalm']],
    desc: '하늘의 거위라는 이름을 가진 포병. 고고한 태도로 포화를 지휘한다.' },
  // 둥지 / 후반
  { key: 'phantom', name: '팬텀', types: ['light', 'ice'], base: [60, 86, 54, 96], rank: 'S', catch: 45, exp: 140, kind: 'bio', faction: '앵거 오브 호드',
    moves: [[1, 'quick'], [1, 'smoke'], [20, 'blade'], [25, 'cryo'], [31, 'flash'], [38, 'absolute']],
    desc: '그림자 속에서 나타나는 암살자. 소리 없이 다가와 소리 없이 사라진다.' },
  { key: 'valkyrie', name: '발키리', types: ['light', 'elec'], base: [72, 86, 66, 74], rank: 'S', catch: 45, exp: 140, kind: 'bio', faction: '스틸라인',
    moves: [[1, 'blade'], [1, 'shock'], [20, 'rush'], [25, 'plasma'], [31, 'command'], [38, 'thunder']],
    desc: '스틸라인의 정예 기병. 전장의 운명을 결정하는 창을 휘두른다.' },
  { key: 'tyrant', name: '타이런트', types: ['heavy', 'fire'], base: [92, 92, 92, 38], rank: 'SS', catch: 25, exp: 180, kind: 'ags', faction: 'AGS',
    moves: [[1, 'tackle'], [1, 'flamer'], [20, 'shell'], [25, 'incend'], [31, 'barrage'], [38, 'napalm'], [44, 'overload']],
    desc: '공룡형 중전차 AGS. 대지를 울리는 포효와 함께 모든 것을 짓밟는다.' },
  { key: 'rampart', name: '램파트', types: ['light'], base: [88, 60, 108, 30], rank: 'B', catch: 70, exp: 130, kind: 'ags', faction: 'AGS',
    moves: [[1, 'guard'], [1, 'shell'], [20, 'fortify'], [25, 'strike'], [31, 'barrage'], [38, 'repair']],
    desc: '방벽이라는 이름의 방어형 AGS. 동료를 감싸는 일이라면 누구보다 자신 있다.' },
  { key: 'goltarion', name: '골타리온', types: ['light', 'elec'], base: [82, 90, 86, 44], rank: 'S', catch: 45, exp: 150, kind: 'ags', faction: 'AGS',
    moves: [[1, 'shock'], [1, 'strike'], [20, 'plasma'], [26, 'barrage'], [32, 'railgun'], [39, 'thunder']],
    desc: '거대 보행 병기형 AGS. 등에 실린 전자포가 불을 뿜는다.' },
  { key: 'lindwurm', name: '린드부르므', types: ['air', 'fire'], base: [66, 88, 60, 90], rank: 'A', catch: 45, exp: 145, kind: 'bio', faction: '스카이나이츠',
    moves: [[1, 'dive'], [1, 'flamer'], [20, 'strafe'], [25, 'incend'], [31, 'bomb'], [38, 'napalm']],
    desc: '용의 이름을 가진 폭격기. 털털한 성격이지만 폭격의 정밀함은 최고 수준.' },
  { key: 'phoenix', name: '피닉스', types: ['air', 'fire'], base: [74, 86, 62, 86], rank: 'S', catch: 25, exp: 175, kind: 'bio', faction: '천공의 별',
    moves: [[1, 'flamer'], [1, 'afterburn'], [22, 'strafe'], [27, 'incend'], [33, 'repair'], [40, 'napalm']],
    desc: '불사조처럼 몇 번이고 되살아나는 비행대장. 그 날개는 꺼지지 않는 불꽃.' },
  { key: 'roc', name: '로크', types: ['air'], base: [72, 84, 66, 80], rank: 'SS', catch: 45, exp: 140, kind: 'ags', faction: 'AGS',
    moves: [[1, 'dive'], [1, 'shot'], [20, 'strafe'], [26, 'afterburn'], [32, 'bomb'], [38, 'overload']],
    desc: '거대한 새를 닮은 비행형 AGS. 날개를 펼치면 하늘이 그늘진다.' },
  { key: 'fafnir', name: '파프니르', types: ['light', 'fire'], base: [78, 94, 70, 78], rank: 'SS', catch: 25, exp: 180, kind: 'bio', faction: '용의 둥지',
    moves: [[1, 'flamer'], [1, 'dive'], [22, 'incend'], [27, 'bomb'], [33, 'aimed'], [40, 'napalm']],
    desc: '황금을 사랑하는 탐욕스러운 용. 보물을 지키는 그녀의 불길은 무엇보다 뜨겁다.' },
  { key: 'hongryun', name: '홍련', types: ['light', 'fire'], base: [70, 90, 62, 92], rank: 'SS', catch: 25, exp: 180, kind: 'bio', faction: '천공의 별',
    moves: [[1, 'quick'], [1, 'flamer'], [22, 'dive'], [27, 'crimson'], [33, 'afterburn'], [40, 'napalm']],
    desc: '붉은 연꽃의 이름을 가진 검객. 그녀의 검이 지나간 자리엔 불꽃이 피어난다.' },
  { key: 'echidna', name: '에키드나', types: ['heavy', 'ice'], base: [84, 80, 84, 52], rank: 'SS', catch: 45, exp: 145, kind: 'bio', faction: '용의 둥지',
    moves: [[1, 'coldshot'], [1, 'strike'], [20, 'cryo'], [26, 'barrage'], [32, 'fortify'], [39, 'absolute']],
    desc: '괴물들의 어머니라 불리는 바이오로이드. 차가운 눈빛 속에 깊은 모성을 품고 있다.' },
  { key: 'efreeti', name: '이프리트', types: ['heavy', 'fire'], base: [80, 88, 76, 50], rank: 'A', catch: 45, exp: 145, kind: 'bio', faction: '앵거 오브 호드',
    moves: [[1, 'flamer'], [1, 'tackle'], [20, 'incend'], [26, 'strike'], [32, 'barrage'], [39, 'napalm']],
    desc: '불의 정령. 화끈한 성격만큼이나 화끈한 화력을 자랑한다.' },
  { key: 'blackhound', name: '블랙 하운드', types: ['air'], base: [66, 88, 60, 88], rank: 'S', catch: 45, exp: 140, kind: 'bio', faction: '스틸라인',
    moves: [[1, 'quick'], [1, 'shot'], [20, 'blade'], [25, 'snipe'], [31, 'command'], [38, 'flash']],
    desc: '충직한 사냥개. 명령이 떨어지면 지옥 끝까지라도 쫓아간다.' },
  { key: 'leona', name: '레오나', types: ['light', 'ice'], base: [78, 94, 74, 86], rank: 'SS', catch: 15, exp: 190, kind: 'bio', faction: '스틸라인',
    moves: [[1, 'blade'], [1, 'coldshot'], [22, 'rush'], [27, 'steelwill'], [33, 'command'], [40, 'absolute']],
    desc: '스틸라인의 총사령관. 엄격하고 강인한 지도자로, 그녀가 서 있는 곳이 곧 최전선이다.' },
  // 전설
  { key: 'blacklilith', name: '블랙 리리스', types: ['light', 'ice'], base: [92, 124, 80, 112], rank: 'SS', catch: 5, exp: 250, kind: 'bio', faction: '삼안 산업', legend: true,
    moves: [[1, 'blade'], [1, 'smoke'], [30, 'cryo'], [35, 'flash'], [40, 'execute'], [45, 'absolute']],
    desc: '삼안 산업이 만든 최강의 경호원. 사령관 이외의 모든 것을 적으로 간주하는, 위험한 사랑의 소유자.' },
  { key: 'eternity', name: '이터니티', types: ['heavy', 'elec'], base: [96, 118, 86, 106], rank: 'SS', catch: 5, exp: 250, kind: 'bio', faction: '삼안 산업', legend: true,
    moves: [[1, 'dive'], [1, 'shock'], [30, 'plasma'], [35, 'bomb'], [40, 'eternal'], [45, 'thunder']],
    desc: '영원의 이름을 가진 전략 병기. 그 존재 자체가 전설로만 전해진다.' },

  // ---------- 레모네이드 자매 (보스 전용, 영입 불가) ----------
  { key: 'lemongamma', name: '레모네이드 감마', types: ['heavy', 'phys'], base: [80, 80, 74, 52], rank: 'SS', catch: 0, exp: 140, kind: 'boss', money: 0,
    moves: [[1, 'tackle'], [1, 'taunt'], [8, 'guard'], [15, 'shell'], [20, 'barrage'], [26, 'overload']],
    desc: '포세이돈 인더스트리 담당 레모네이드. 오른쪽 눈의 상처는 무적의 용과의 결투 흔적. 육아도 전투라고 믿는다.' },
  { key: 'lemonbeta', name: '레모네이드 베타', types: ['light', 'ice'], base: [72, 66, 72, 62], rank: 'SS', catch: 0, exp: 160, kind: 'boss', money: 0,
    moves: [[1, 'coldshot'], [1, 'quick'], [8, 'smoke'], [12, 'blade'], [16, 'cryo'], [20, 'absolute']],
    desc: '사이버 작전 담당 레모네이드. 비밀이 많고 해킹이 특기. 폭식의 레모네이드가 아니라고 본인은 주장한다.' },
  { key: 'lemondelta', name: '레모네이드 델타', types: ['air', 'fire'], base: [74, 82, 62, 80], rank: 'SS', catch: 0, exp: 170, kind: 'boss', money: 0,
    moves: [[1, 'dive'], [1, 'flamer'], [10, 'strafe'], [14, 'incend'], [18, 'bomb'], [22, 'crimson']],
    desc: '문리버 담당 레모네이드. 인형 부대 마리오네트를 지휘한다. 우아하지만 질투가 폭발하면 말투가 거칠어진다.' },
  { key: 'lemonzeta', name: '레모네이드 제타', types: ['light', 'elec'], base: [76, 80, 70, 82], rank: 'SS', catch: 0, exp: 180, kind: 'boss', money: 0,
    moves: [[1, 'quick'], [1, 'shock'], [12, 'emp'], [16, 'plasma'], [20, 'rush'], [24, 'thunder']],
    desc: '비스마르크 담당 레모네이드. 효율과 관측을 신봉하는 과학자. 상금 지급에 유난히 인색하다.' },
  { key: 'lemonepsilon', name: '레모네이드 엡실론', types: ['air', 'ice'], base: [76, 72, 76, 84], rank: 'SS', catch: 0, exp: 190, kind: 'boss', money: 0,
    moves: [[1, 'dive'], [1, 'coldshot'], [12, 'afterburn'], [18, 'cryo'], [22, 'strafe'], [28, 'absolute']],
    desc: '오비탈 와쳐 담당 레모네이드. 위성 너머로 세상을 보는 게임광. 회의 중에도 잔다. 물을 싫어한다.' },
  { key: 'lemonalpha', name: '레모네이드 알파', types: ['heavy', 'fire'], base: [82, 86, 70, 84], rank: 'SS', catch: 0, exp: 210, kind: 'boss', money: 0,
    moves: [[1, 'quick'], [1, 'blade'], [16, 'foxfire'], [22, 'aimed'], [28, 'crimson'], [32, 'flash']],
    desc: '레모네이드 시리즈 1호기. 우아한 미소 뒤에 무엇을 숨기고 있는지 아무도 모른다.' },
  { key: 'lemonomega', name: '레모네이드 오메가', types: ['heavy', 'elec'], base: [92, 82, 82, 70], rank: 'SS', catch: 0, exp: 240, kind: 'boss', money: 0,
    moves: [[1, 'plasma'], [1, 'shell'], [20, 'guard'], [26, 'thunder'], [30, 'order'], [34, 'railgun']],
    desc: '레모네이드 자매의 리더이자 챔피언. 오만하지만 의외로 정에 약하다.' },
  { key: 'mpzeta', name: '융합체 제타', types: ['heavy', 'fire'], base: [98, 92, 88, 76], rank: 'SS', catch: 0, exp: 300, kind: 'boss', money: 0,
    moves: [[1, 'shell'], [1, 'napalm'], [20, 'barrage'], [26, 'crimson'], [30, 'order'], [34, 'railgun']],
    desc: '철충 기술을 역설계하다 철충과 융합한 제타. "그분"을 위해 사령관의 링크를 관측해 왔다.' },
];
const SPECIES = {};
SPECIES_LIST.forEach((s, i) => { s.no = i + 1; SPECIES[s.key] = s; });
const DEX_LIST = SPECIES_LIST.filter(s => s.kind !== 'boss');
// 원작 표 밖에서 추가한 유닛. 기존 도감 번호를 바꾸지 않도록 roster.js 가 확장 로스터 뒤에 붙인다.
const EXTRA_SPECIES = [
  { key: 'rhode', name: '로데', types: ['heavy'], base: [64, 54, 64, 42], rank: 'A', catch: 45, exp: 64, kind: 'bio', faction: '펙스 콘소시엄',
    moves: [[1, 'shot'], [1, 'guard'], [5, 'shell'], [7, 'repair'], [9, 'taunt'], [13, 'coverfire'], [17, 'fortify'], [22, 'barrage'], [27, 'command'], [33, 'railgun'], [39, 'overload']],
    desc: '양어깨에 함포 의장을 짊어진 중장형 지원기. 포격으로 전선을 받치고 동료를 수복한다.' },
  { key: 'lamparion', name: '램파리온', types: ['light', 'fire'], base: [82, 90, 84, 58], rank: 'SS', catch: 5, exp: 250, kind: 'ags', faction: 'AGS', legend: true,
    moves: [[1, 'tackle'], [1, 'protect'], [1, 'knuckle'], [8, 'drillknee'], [16, 'shining'], [24, 'bravefuse'], [30, 'heavenhell']],
    desc: '램파트의 전투 데이터로 깨어난 사자형 용자 로봇. 정의를 외치며 싸우고, 두 손으로 하늘과 지옥을 하나로 짓누른다.' },
];

// ---------- 아이템 ----------
const ITEMS = {
  core:   { name: '링크 코어', price: 200, kind: 'ball', rate: 1, icon: 'core', desc: '폭주한 바이오로이드와 링크를 맺어 부대로 영입한다.' },
  core2:  { name: '고급 링크 코어', price: 600, kind: 'ball', rate: 1.6, icon: 'core2', desc: '출력이 강화된 링크 코어. 영입 성공률이 높다.' },
  core3:  { name: '마스터 코어', price: 0, kind: 'ball', rate: 255, icon: 'core3', desc: '반드시 링크에 성공하는 사령관 전용 코어.' },
  kit:    { name: '수복 키트', price: 200, kind: 'heal', heal: 30, icon: 'kit', desc: '유닛 1명의 HP를 30 회복한다.' },
  kit2:   { name: '고급 수복 키트', price: 600, kind: 'heal', heal: 90, icon: 'kit2', desc: '유닛 1명의 HP를 90 회복한다.' },
  kit3:   { name: '완전 수복 키트', price: 1200, kind: 'heal', heal: 9999, cure: true, icon: 'kit3', desc: 'HP를 모두 회복하고 상태이상도 치료한다.' },
  chip:   { name: '정상화 칩', price: 250, kind: 'cure', icon: 'chip', desc: '화상·감전·동결·침식을 치료한다.' },
  revive: { name: '긴급 재기동', price: 1500, kind: 'revive', icon: 'revive', desc: '전투불능 유닛을 HP 절반으로 재기동한다.' },
  cell:   { name: '에너지 셀', price: 700, kind: 'pp', icon: 'cell', desc: '유닛 1명의 모든 기술 에너지(EN)를 10 회복한다.' },
};
const ITEM_ORDER = ['core', 'core2', 'core3', 'kit', 'kit2', 'kit3', 'chip', 'revive', 'cell'];

// ---------- 공식 ----------
function expForLevel(lv) { return Math.floor(0.8 * lv * lv * lv); }
function calcStat(base, lv, iv, rank, isHp) {
  const r = RANK_MULT[rank] || 1;
  if (isHp) return Math.floor((Math.floor(2 * base * lv / 100) + Math.floor(iv * lv / 100) + lv + 10) * r * 1.35);
  return Math.floor((Math.floor(2 * base * lv / 100) + Math.floor(iv * lv / 100) + 5) * r);
}
const STAT_NAMES = ['HP', '공격', '방어', '속도'];
