// =====================================================================
//  라켓몬스터 - 맵 / 트레이너 / 이벤트 데이터
// =====================================================================
// 타일:  . 풀  , 꽃  " 수풀(조우)  _ 흙길  : 석재광장  = 아스팔트  - 차선도로  s 모래  ~ 물
//        T 나무  P 침엽수  b 덤불  r 바위  R 잔해  W 폐허벽  # 금속벽  M 금속바닥  c 카펫
//        k 카운터  x 상자  F 울타리  f 화단  N 둥지바닥  n 철충군락(조우)  X 철충첨탑  % 산성웅덩이
//        H 동굴입구  D 출입매트
const TILE_DEF = {
  '.': { walk: 1 }, ',': { walk: 1 }, '"': { walk: 1, enc: 1 }, '_': { walk: 1 }, ':': { walk: 1 }, '=': { walk: 1 }, '-': { walk: 1 },
  's': { walk: 1 }, '~': { walk: 0 }, 'T': { walk: 0, tall: 1 }, 'P': { walk: 0, tall: 1 }, 'b': { walk: 0 }, 'r': { walk: 0 }, 'R': { walk: 0 },
  'W': { walk: 0 }, '#': { walk: 0 }, 'M': { walk: 1 }, 'm': { walk: 1 }, 'c': { walk: 1 }, 'k': { walk: 0, counter: 1 }, 'x': { walk: 0 }, 'F': { walk: 0 },
  'f': { walk: 0 }, 'N': { walk: 1, enc: 0.35 }, 'n': { walk: 1, enc: 1 }, 'X': { walk: 0, tall: 1 }, '%': { walk: 0 }, 'H': { walk: 1 }, 'D': { walk: 1 },
};

// ---------- 그리드 빌더 ----------
function srand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
class Grid {
  constructor(w, h, fill = '.') { this.w = w; this.h = h; this.g = Array.from({ length: h }, () => Array(w).fill(fill)); }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; return this; }
  get(x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.g[y][x] : null; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  border(c, t = 2) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (x < t || y < t || x >= this.w - t || y >= this.h - t) this.set(x, y, c); return this; }
  h2(x1, x2, y, c, th = 2) { return this.rect(Math.min(x1, x2), y, Math.abs(x2 - x1) + 1, th, c); }
  v2(x, y1, y2, c, th = 2) { return this.rect(x, Math.min(y1, y2), th, Math.abs(y2 - y1) + 1, c); }
  blob(cx, cy, rx, ry, c, seed = 1, only) {
    const R = srand(seed);
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const d = ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2;
      if (d < 0.75 + R() * 0.45 && (!only || only.includes(this.get(x, y)))) this.set(x, y, c);
    }
    return this;
  }
  scatter(c, p, only = '.', seed = 7) { const R = srand(seed); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (only.includes(this.g[y][x]) && R() < p) this.g[y][x] = c; return this; }
  rows() { return this.g.map(r => r.join('')); }
}

// ---------- 트레이너 ----------
const TRAINERS = {
  emily: { name: '에밀리', title: '꼬마 전투원', portrait: 'emily', team: [['brownie', 3], ['nymph', 4]], prize: 360,
    intro: '사령관님이다! 제 브라우니 분대 실력 좀 보실래요?', lose: '우와앙, 역시 사령관님이에요!', after: '브라우니들은 수가 많아서 든든해요. 풀숲에도 잔뜩 있다구요!' },
  alvis: { name: '앨비스', title: '명랑한 정찰병', portrait: 'alvis', team: [['gremlin', 5], ['hyena', 6]], prize: 480,
    intro: '정찰 중에 사령관님을 발견! 훈련 상대가 되어 주세요!', lose: '하하, 완패예요! 상성을 잘 쓰시네요!', after: '전기 기술은 중장형한테 효과가 굉장해요. 상성표는 메뉴에서 볼 수 있어요!' },
  amy: { name: '에이미', title: '오르카 경비대', portrait: 'amy', team: [['nymph', 6], ['hyena', 6], ['brownie', 7]], prize: 560,
    intro: '이 앞은 엘프의 숲이에요. 그 실력으로 괜찮으시겠어요?', lose: '...인정할게요. 지나가셔도 좋아요.', after: '숲 안쪽에 철충 지휘 개체가 나타났다는 보고가 있어요. 조심하세요.' },
  darkelf: { name: '다크엘프', title: '숲의 사냥꾼', portrait: 'darkelf', team: [['undine', 9], ['impet', 10]], prize: 800,
    intro: '이 숲에 함부로 발을 들이다니. 실력을 보여 봐라.', lose: '흥... 제법이군.', after: '숲 한가운데 수복 포드가 있다. 지쳤다면 쉬어 가라.' },
  highelven: { name: '하이엘븐', title: '숲의 수호자', portrait: 'highelven', team: [['sylphid', 10], ['pixie', 11]], prize: 880,
    intro: '바람의 노래가 들리나요? 우리 아이들의 날갯짓이랍니다.', lose: '바람이 당신 편이었군요.', after: '기동형은 중장형에게 강하지만 경장형에게는 약해요.' },
  fortune: { name: '포츈', title: '행운의 여신', portrait: 'fortune', team: [['spriggan', 11], ['miho', 12]], prize: 960,
    intro: '오늘의 운세는... 사령관님과의 승부! 대길이려나?', lose: '어머, 오늘은 소길이었네.', after: '레모네이드 베타가 동쪽 출구를 막고 있어요. 베타는 냉기를 써요. 기동형이 약하니 화염형(임펫·미호)을 데려가세요!' },
  beta: { name: '레모네이드 베타', title: '레모네이드 자매', portrait: 'lemonbeta', team: [['impet', 12], ['spriggan', 12], ['lemonbeta', 14]], prize: 2400, boss: true, badge: 'forest', bgm: 'boss', voice: 'lemonbeta',
    intro: '마지막 인간이 제 발로 찾아오다니. 오메가 언니가 기뻐하겠네요.', lose: '말도 안 돼... 내 아이들이...!', after: '' },
  calista: { name: '칼리스타', title: '해안 경비대', portrait: 'calista', team: [['talonfeather', 16], ['bulgasari', 17]], prize: 1300,
    intro: '해안선은 우리가 지킨다! 사령관이라도 봐주지 않아!', lose: '크윽, 방어선이 뚫렸어!', after: '등대 쪽에 붉은 날개를 단 레모네이드가 있어. 엄청 강해.' },
  raven: { name: '레이븐', title: '까마귀 저격수', portrait: 'raven', team: [['perrault', 17], ['hraesvelgr', 18]], prize: 1400,
    intro: '조준 완료. 움직이지 마시죠.', lose: '...탄이 다 떨어졌군.', after: '냉기는 기동형에게 잘 들어. 하늘을 나는 녀석들을 상대할 땐 기억해 둬.' },
  kheshig: { name: '케시크', title: '호드 돌격대', portrait: 'kheshig', team: [['gigantes', 18], ['bloodypanther', 19]], prize: 1500,
    intro: '돌격! 돌격이다! 사령관님도 예외는 없어!', lose: '후퇴! 후퇴다아!', after: '체력을 깎고 상태이상을 걸면 링크 성공률이 확 올라간다고!' },
  mariagrace: { name: '마리아 그레이스', title: '호드의 기수', portrait: 'mariagrace', team: [['alice', 19], ['daika', 19], ['cheona', 20]], prize: 1800,
    intro: '사령관님, 이 앞은 지옥이에요. 각오는 되셨나요?', lose: '...좋아요. 당신이라면 해낼 수 있을지도.', after: '레모네이드 제타는 경장형이라 중장형이 강해요. 화염은 전기 기술로 받아치세요!' },
  zeta: { name: '레모네이드 제타', title: '레모네이드 자매', portrait: 'lemonzeta', team: [['bloodypanther', 19], ['hraesvelgr', 19], ['lemonzeta', 22]], prize: 3600, boss: true, badge: 'coast', bgm: 'boss', voice: 'lemonzeta',
    intro: '네가 베타를 쓰러뜨린 인간이야? 크하하, 재밌겠는데! 한번 놀아볼까!', lose: '크하하하! 좋아, 아주 좋아! 이렇게 즐거운 싸움은 처음이야!', after: '' },
  draculina: { name: '드라큐리나', title: '정신 지배된 바이오로이드', portrait: 'draculina', team: [['phantom', 24], ['efreeti', 25]], prize: 2000,
    intro: '오메가 님의... 명령... 침입자는... 제거한다...', lose: '사, 사령관님...? 저는 대체 무슨 짓을...', after: '오메가는 둥지 맨 안쪽에 있어요. 저 대신... 꼭 이겨 주세요.' },
  sekhmet: { name: '세크메트', title: '정신 지배된 바이오로이드', portrait: 'sekhmet', team: [['echidna', 24], ['roc', 25], ['goltarion', 25]], prize: 2000,
    intro: '크르르... 오메가 님을 위해...', lose: '...머리가 맑아졌어. 고마워, 사령관.', after: '이 앞에 수복 포드가 있어. 오메가는 중장형이라 기동형 공격이 잘 들어. 그녀의 전격은 냉기형이 막아 줄 거야!' },
  omega: { name: '레모네이드 오메가', title: '레모네이드 자매의 정점', portrait: 'lemonomega', team: [['tyrant', 27], ['lindwurm', 27], ['valkyrie', 28], ['lemonomega', 30]], prize: 9999, boss: true, badge: 'nest', bgm: 'final',
    intro: '자, 사령관님. 당신의 "링크"가 얼마나 강한지 보여 주세요.', lose: '...이것이 인간의 힘. 아니, 바이오로이드들과의 유대인가요.', after: '' },
};

// ---------- 출현 테이블 ----------
const ENCOUNTERS = {
  route1: { rate: 0.1, lv: [2, 3], list: [['brownie', 32], ['gremlin', 18], ['nymph', 16], ['sylphid', 10], ['spriggan', 8], ['hyena', 8], ['pixie', 6]] },
  forest: { rate: 0.11, lv: [7, 12], list: [['sylphid', 14], ['pixie', 14], ['undine', 14], ['spriggan', 14], ['impet', 14], ['hyena', 8], ['nymph', 6], ['miho', 5], ['bloodypanther', 3]] },
  coast: { rate: 0.11, lv: [12, 17], list: [['bulgasari', 12], ['talonfeather', 12], ['perrault', 12], ['gigantes', 10], ['daika', 10], ['hraesvelgr', 6], ['alice', 6], ['bloodypanther', 6], ['cheona', 6], ['blackhound', 6], ['rampart', 6], ['roc', 6]] },
  nest: { rate: 0.12, lv: [19, 25], list: [['phantom', 9], ['valkyrie', 9], ['rampart', 8], ['goltarion', 8], ['lindwurm', 8], ['roc', 8], ['echidna', 8], ['efreeti', 8], ['blackhound', 8], ['tyrant', 4], ['phoenix', 4], ['fafnir', 4], ['hongryun', 4], ['leona', 2]] },
};

// ---------- 맵 정의 ----------
const MAPS = {};

// ===== 오르카 캠프 =====
(function () {
  const g = new Grid(28, 20, '.');
  g.border('T', 2);
  g.rect(2, 17, 24, 2, '~');
  g.v2(13, 0, 16, '_');
  g.h2(4, 23, 7, '_', 1); g.v2(5, 6, 7, '_', 1); g.v2(21, 6, 7, '_', 1);
  g.rect(9, 8, 10, 5, ':');
  g.h2(4, 23, 14, '_', 1); g.v2(5, 13, 14, '_', 1); g.v2(22, 13, 14, '_', 1);
  g.rect(13, 15, 2, 3, 'M');
  g.set(9, 8, 'f'); g.set(18, 8, 'f'); g.set(9, 12, 'f'); g.set(18, 12, 'f');
  g.scatter(',', 0.09, '.', 11);
  g.set(2, 9, 'b'); g.set(25, 9, 'b'); g.set(2, 16, 'b'); g.set(25, 16, 'b'); g.set(16, 3, 'b'); g.set(10, 3, 'b');
  MAPS.base = {
    name: '오르카 캠프', theme: 'town', bgm: 'town', amb: 'sea', bg: 'base', rows: g.rows(),
    objects: [
      { t: 'building', x: 3, y: 2, w: 6, h: 4, style: 'lab', label: '연구소', door: 5, to: ['lab', 6, 7] },
      { t: 'building', x: 19, y: 2, w: 6, h: 4, style: 'center', label: '수복실', door: 21, to: ['center1', 7, 8] },
      { t: 'building', x: 3, y: 10, w: 5, h: 3, style: 'shop', label: '보급소', door: 5, to: ['shop1', 6, 6] },
      { t: 'building', x: 20, y: 10, w: 5, h: 3, style: 'house', label: '사령관실', door: 22, to: ['home', 5, 6] },
      { t: 'deco', kind: 'fountain', x: 13, y: 9, w: 2, h: 2, block: 1 },
      { t: 'deco', kind: 'orca', x: 3, y: 16, w: 9, h: 3, block: 1 },
      { t: 'deco', kind: 'lamp', x: 12, y: 6, w: 1, h: 1, block: 1 }, { t: 'deco', kind: 'lamp', x: 15, y: 6, w: 1, h: 1, block: 1 },
      { t: 'sign', x: 11, y: 4, text: '북쪽: 1번 폐도로 / 엘프의 숲\n— 오르카 캠프 관리소' },
      { t: 'sign', x: 16, y: 15, text: '오르카호 승강구\n현재 정비 중이라 출입할 수 없습니다.' },
      { t: 'warp', x: 13, y: 0, w: 2, h: 1, to: ['route1', 11, 38, 'up'] },
      { t: 'trigger', x: 13, y: 2, w: 2, h: 1, run: 'gate' },
      { t: 'npc', id: 'constantia', sprite: 'constantia', x: 12, y: 3, dir: 'down', name: '콘스탄챠', talk: 'constantia' },
      { t: 'npc', id: 'audrey', sprite: 'audrey', x: 17, y: 11, dir: 'left', name: '오드리', wander: 1,
        lines: ['링크 코어를 던지기 전에 상대의 체력을 깎아 두세요. 빨간색이 될 때까지 깎으면 성공률이 크게 올라요.', '상태이상(동결·감전 등)에 걸린 상대는 더 쉽게 링크할 수 있어요. 동결이 가장 효과적이에요!'] },
      { t: 'npc', id: 'poi', sprite: 'poi', x: 15, y: 15, dir: 'down', name: '포이', lines: ['오르카호는 지금 정비 중이에요. 다 고치면 다시 바다로 나갈 수 있을 거예요!', '그때까지 사령관님이 이 일대의 철충들을 정리해 주세요!'] },
      { t: 'npc', id: 'rhea', sprite: 'rhea', x: 6, y: 8, dir: 'down', name: '레아', wander: 1, lines: ['랭크가 B인 아이들도 레벨 16이 되면 A랭크로 승급해요. 그 뒤 30, 44에서도 승급하고요.', '승급하면 능력치가 쑥 오른답니다!'] },
    ],
  };
})();

// ===== 실내: 연구소 =====
function interior(w, h, door) {
  const g = new Grid(w, h, 'M');
  g.rect(0, 0, w, 2, '#'); g.rect(0, 0, 1, h, '#'); g.rect(w - 1, 0, 1, h, '#'); g.rect(0, h - 1, w, 1, '#');
  g.set(door, h - 1, 'D');
  return g;
}
(function () {
  const g = interior(13, 9, 6);
  g.rect(3, 4, 7, 1, 'k');
  g.rect(2, 6, 9, 2, 'c');
  MAPS.lab = {
    name: '라비아타 연구소', theme: 'indoor', bgm: 'lab', bg: 'base', rows: g.rows(), indoor: 1,
    objects: [
      { t: 'exit', x: 6, y: 8, to: ['base', 5, 6, 'down'] },
      { t: 'npc', id: 'labiata', sprite: 'labiata', x: 6, y: 2, dir: 'down', name: '라비아타', talk: 'labiata' },
      { t: 'starter', x: 4, y: 4, sp: 'leprechaun' }, { t: 'starter', x: 6, y: 4, sp: 'gnome' }, { t: 'starter', x: 8, y: 4, sp: 'harpy' },
      { t: 'deco', kind: 'shelf', x: 1, y: 1, w: 2, h: 1 }, { t: 'deco', kind: 'machine', x: 9, y: 1, w: 3, h: 1 }, { t: 'deco', kind: 'shelf', x: 3, y: 1, w: 2, h: 1 },
    ],
  };
})();
function makeCenter(id, name, back) {
  const g = interior(15, 10, 7);
  g.rect(4, 3, 7, 1, 'k');
  g.rect(5, 6, 5, 3, 'c');
  MAPS[id] = {
    name, theme: 'indoor', bgm: 'center', bg: 'hospital', rows: g.rows(), indoor: 1,
    objects: [
      { t: 'exit', x: 7, y: 9, to: back },
      { t: 'npc', id: id + '_daphne', sprite: 'daphne', x: 7, y: 2, dir: 'down', name: '다프네', talk: 'nurse' },
      { t: 'obj', kind: 'pc', x: 12, y: 2, block: 1 },
      { t: 'deco', kind: 'healer', x: 4, y: 1, w: 2, h: 1 }, { t: 'deco', kind: 'healer', x: 9, y: 1, w: 2, h: 1 },
      { t: 'deco', kind: 'plant', x: 1, y: 2, w: 1, h: 1, block: 1 }, { t: 'deco', kind: 'plant', x: 13, y: 8, w: 1, h: 1, block: 1 },
      { t: 'npc', id: id + '_snow', sprite: id === 'center1' ? 'snowfeather' : 'thetis', x: 2, y: 6, dir: 'right', name: id === 'center1' ? '스노우 페더' : '테티스',
        lines: id === 'center1' ? ['격납고 단말기(오른쪽 위)에서 부대원을 맡기거나 꺼낼 수 있어요.', '부대는 최대 6명까지! 나머지는 격납고에서 쉬고 있답니다.'] : ['바다 냄새 좋죠? 해안 너머 둥지에서 나는 쇳내만 빼면요.'] },
    ],
  };
}
makeCenter('center1', '오르카 수복실', ['base', 21, 6, 'down']);
function makeShop(id, name, back, stock, clerk) {
  const g = interior(13, 8, 6);
  g.rect(2, 3, 5, 1, 'k');
  g.rect(9, 2, 3, 1, 'x');
  MAPS[id] = {
    name, theme: 'indoor', bgm: 'center', bg: 'px', rows: g.rows(), indoor: 1,
    objects: [
      { t: 'exit', x: 6, y: 7, to: back },
      { t: 'npc', id: id + '_clerk', sprite: clerk.key, x: 4, y: 2, dir: 'down', name: clerk.name, talk: 'shop', stock },
      { t: 'deco', kind: 'shelf', x: 1, y: 1, w: 2, h: 1 }, { t: 'deco', kind: 'shelf', x: 9, y: 1, w: 3, h: 1 },
    ],
  };
}
makeShop('shop1', '오르카 보급소', ['base', 5, 13, 'down'], ['core', 'kit', 'chip'], { key: 'vanilla', name: '바닐라' });
(function () {
  const g = interior(11, 8, 5);
  g.rect(3, 4, 5, 2, 'c');
  MAPS.home = {
    name: '사령관실', theme: 'indoor', bgm: 'base', bg: 'base', rows: g.rows(), indoor: 1,
    objects: [
      { t: 'exit', x: 5, y: 7, to: ['base', 22, 13, 'down'] },
      { t: 'obj', kind: 'bed', x: 1, y: 2, w: 2, h: 2, block: 1 },
      { t: 'deco', kind: 'desk', x: 7, y: 1, w: 3, h: 2, block: 1 },
      { t: 'deco', kind: 'shelf', x: 4, y: 1, w: 2, h: 1 },
      { t: 'deco', kind: 'plant', x: 9, y: 6, w: 1, h: 1, block: 1 },
    ],
  };
})();

// ===== 1번 폐도로 =====
(function () {
  const g = new Grid(24, 40, '.');
  g.border('T', 2);
  g.v2(11, 30, 39, '=');
  g.h2(6, 12, 30, '=');
  g.v2(6, 19, 31, '=');
  g.h2(6, 17, 19, '=');
  g.v2(16, 8, 20, '=');
  g.h2(11, 17, 8, '=');
  g.v2(11, 0, 9, '=');
  g.blob(17, 33, 4, 3, '"', 3, '.');
  g.blob(4, 24, 2, 4, '"', 5, '.');
  g.blob(12, 24, 3, 3, '"', 8, '.');
  g.blob(5, 11, 3, 4, '"', 9, '.');
  g.blob(20, 13, 2, 3, '"', 12, '.');
  g.blob(17, 3, 3, 2, '"', 15, '.');
  g.rect(2, 16, 3, 1, 'W'); g.rect(19, 25, 3, 1, 'W'); g.set(20, 24, 'W');
  g.scatter('R', 0.03, '.', 21); g.scatter(',', 0.06, '.', 22); g.scatter('b', 0.02, '.', 23);
  g.rect(10, 36, 1, 1, '.'); g.set(13, 37, '.');
  MAPS.route1 = {
    name: '1번 폐도로', theme: 'route', bgm: 'route', bg: 'route', rows: g.rows(), enc: 'route1',
    objects: [
      { t: 'warp', x: 11, y: 39, w: 2, h: 1, to: ['base', 13, 1, 'down'] },
      { t: 'warp', x: 11, y: 0, w: 2, h: 1, to: ['forest', 17, 26, 'up'] },
      { t: 'sign', x: 13, y: 36, text: '1번 폐도로\n북쪽: 엘프의 숲  /  남쪽: 오르카 캠프' },
      { t: 'deco', kind: 'car', x: 8, y: 33, w: 2, h: 1, block: 1 }, { t: 'deco', kind: 'car', x: 14, y: 12, w: 2, h: 1, block: 1 },
      { t: 'trainer', id: 'emily', sprite: 'emily', x: 9, y: 26, dir: 'left', sight: 3 },
      { t: 'trainer', id: 'alvis', sprite: 'alvis', x: 14, y: 16, dir: 'right', sight: 2 },
      { t: 'trainer', id: 'amy', sprite: 'amy', x: 13, y: 4, dir: 'left', sight: 3 },
      { t: 'item', id: 'r1_core', x: 3, y: 34, item: 'core', n: 3 },
      { t: 'item', id: 'r1_kit', x: 21, y: 9, item: 'kit', n: 2 },
      { t: 'item', id: 'r1_chip', x: 3, y: 5, item: 'chip', n: 1 },
    ],
  };
})();

// ===== 엘프의 숲 =====
(function () {
  const g = new Grid(36, 28, '.');
  g.border('P', 3);
  g.v2(17, 20, 27, '_');
  g.h2(8, 18, 20, '_');
  g.v2(8, 8, 21, '_');
  g.h2(8, 27, 8, '_');
  g.v2(26, 8, 14, '_');
  g.h2(26, 35, 13, '_');
  g.blob(13, 14, 3, 2, '~', 4);
  g.blob(22, 22, 4, 2, '"', 31, '.');
  g.blob(4, 15, 1, 4, '"', 32, '.');
  g.blob(14, 4, 4, 1, '"', 33, '.');
  g.blob(30, 5, 3, 2, '"', 34, '.');
  g.blob(21, 15, 3, 3, '"', 35, '.');
  g.blob(30, 20, 2, 3, '"', 36, '.');
  g.blob(12, 24, 3, 1, '"', 37, '.');
  g.scatter('T', 0.07, '.', 41); g.scatter(',', 0.08, '.', 42); g.scatter('b', 0.03, '.', 43);
  // 길 주변 정리
  for (const [x, y] of [[16, 19], [19, 19], [7, 9], [10, 9], [25, 9], [28, 12], [28, 15]]) if (g.get(x, y) === 'T') g.set(x, y, '.');
  MAPS.forest = {
    name: '엘프의 숲', theme: 'forest', bgm: 'forest', amb: 'wind', bg: 'forest', rows: g.rows(), enc: 'forest', ambient: 'leaves',
    objects: [
      { t: 'warp', x: 17, y: 27, w: 2, h: 1, to: ['route1', 11, 1, 'down'] },
      { t: 'warp', x: 35, y: 13, w: 1, h: 2, to: ['harbor', 1, 10, 'right'] },
      { t: 'sign', x: 19, y: 25, text: '엘프의 숲\n길을 잃지 않도록 흙길을 따라가세요.' },
      { t: 'obj', kind: 'healpod', x: 10, y: 7, block: 1 },
      { t: 'trainer', id: 'darkelf', sprite: 'darkelf', x: 10, y: 17, dir: 'left', sight: 2 },
      { t: 'trainer', id: 'highelven', sprite: 'highelven', x: 18, y: 6, dir: 'down', sight: 2 },
      { t: 'trainer', id: 'fortune', sprite: 'fortune', x: 28, y: 11, dir: 'left', sight: 2 },
      { t: 'trainer', id: 'beta', sprite: 'lemonbeta', x: 33, y: 13, dir: 'left', sight: 4, boss: 1 },
      { t: 'deco', kind: 'log', x: 33, y: 14, w: 1, h: 1, block: 1, cond: '!beat_beta' },
      { t: 'item', id: 'f_kit2', x: 11, y: 12, item: 'kit2', n: 1 },
      { t: 'item', id: 'f_core', x: 4, y: 21, item: 'core', n: 3 },
      { t: 'item', id: 'f_core2', x: 32, y: 4, item: 'core2', n: 2 },
      { t: 'item', id: 'f_revive', x: 32, y: 22, item: 'revive', n: 1 },
    ],
  };
})();

// ===== 남부 항구 마을 =====
(function () {
  const g = new Grid(28, 22, '.');
  g.border('T', 2);
  g.rect(0, 10, 2, 2, '_'); g.rect(26, 10, 2, 2, '_');
  g.h2(0, 27, 10, '_');
  g.v2(6, 7, 10, '_', 1); g.v2(19, 6, 10, '_', 1);
  g.rect(2, 14, 24, 3, 's');
  g.rect(2, 17, 24, 5, '~');
  g.rect(12, 14, 2, 6, 'M');
  g.v2(12, 11, 14, '_');
  g.scatter(',', 0.08, '.', 51); g.set(10, 4, 'b'); g.set(24, 8, 'b'); g.set(3, 8, 'f'); g.set(15, 7, 'f');
  MAPS.harbor = {
    name: '남부 항구 마을', theme: 'town', bgm: 'town', amb: 'sea', bg: 'beach', rows: g.rows(),
    objects: [
      { t: 'warp', x: 0, y: 10, w: 1, h: 2, to: ['forest', 34, 13, 'left'] },
      { t: 'warp', x: 27, y: 10, w: 1, h: 2, to: ['coast', 1, 11, 'right'] },
      { t: 'building', x: 3, y: 3, w: 6, h: 4, style: 'center', label: '수복실', door: 6, to: ['center2', 7, 8] },
      { t: 'building', x: 17, y: 3, w: 5, h: 3, style: 'shop', label: '보급소', door: 19, to: ['shop2', 6, 6] },
      { t: 'building', x: 22, y: 12, w: 4, h: 2, style: 'tent', label: '', door: -1 },
      { t: 'deco', kind: 'lamp', x: 11, y: 9, w: 1, h: 1, block: 1 }, { t: 'deco', kind: 'lamp', x: 15, y: 9, w: 1, h: 1, block: 1 },
      { t: 'deco', kind: 'boat', x: 15, y: 18, w: 3, h: 2, block: 1 },
      { t: 'sign', x: 9, y: 11, text: '남부 항구 마을\n서쪽: 엘프의 숲  /  동쪽: 폐허 해안' },
      { t: 'npc', id: 'merlin', sprite: 'merlin', x: 14, y: 12, dir: 'down', name: '멀린', talk: 'merlin' },
      { t: 'npc', id: 'shirayuri', sprite: 'shirayuri', x: 8, y: 15, dir: 'right', name: '시라유리', wander: 1, lines: ['폐허 해안의 등대 근처는 철충 투성이예요.', '화염 기술은 냉기형에게 효과가 굉장하답니다!'] },
      { t: 'npc', id: 'tomoe', sprite: 'tomoe', x: 22, y: 8, dir: 'left', name: '토모', lines: ['해안 너머 동굴에서 이상한 붉은 빛이 새어 나와요. 철충의 둥지인 것 같아요.'] },
      { t: 'npc', id: 'johanna', sprite: 'johanna', x: 4, y: 12, dir: 'right', name: '요안나', wander: 1, lines: ['보급소에서 고급 링크 코어를 팔기 시작했어요. 성공률이 1.6배라던데요?', '링크 코어를 10개 이상 사면 보너스를 준대요!'] },
    ],
  };
})();
makeCenter('center2', '항구 수복실', ['harbor', 6, 7, 'down']);
makeShop('shop2', '항구 보급소', ['harbor', 19, 6, 'down'], ['core', 'core2', 'kit', 'kit2', 'chip', 'revive', 'cell'], { key: 'vanilla', name: '바닐라' });

// ===== 폐허 해안 =====
(function () {
  const g = new Grid(40, 24, '.');
  g.border('W', 2);
  g.rect(0, 11, 2, 2, '='); g.h2(0, 30, 11, '-');
  g.v2(9, 3, 12, '=');
  g.v2(22, 4, 12, '=');
  g.h2(22, 33, 4, '=');
  g.v2(30, 11, 16, '=');
  g.h2(9, 30, 16, '=');
  g.rect(2, 18, 36, 2, 's');
  g.rect(2, 20, 36, 4, '~');
  g.blob(15, 6, 3, 2, '"', 61, '.');
  g.blob(4, 6, 2, 3, '"', 62, '.');
  g.blob(16, 21, 3, 1, '"', 63, 's');
  g.blob(36, 15, 2, 3, '"', 64, '.');
  g.blob(26, 8, 2, 2, '"', 65, '.');
  g.blob(4, 15, 2, 1, '"', 66, '.');
  g.rect(12, 13, 4, 1, 'W'); g.rect(24, 13, 1, 2, 'W'); g.rect(17, 3, 3, 1, 'W'); g.rect(3, 9, 3, 1, 'W'); g.rect(34, 12, 3, 1, 'W');
  g.scatter('R', 0.04, '.', 67); g.scatter('r', 0.015, 's', 68);
  // 둥지 입구
  g.rect(34, 2, 5, 3, 'r'); g.set(36, 3, 'H'); g.set(36, 4, '='); g.v2(36, 4, 5, '=', 1); g.h2(33, 36, 5, '=', 1);
  MAPS.coast = {
    name: '폐허 해안', theme: 'coast', bgm: 'coast', amb: 'sea', bg: 'coast', rows: g.rows(), enc: 'coast', ambient: 'sea',
    objects: [
      { t: 'warp', x: 0, y: 11, w: 1, h: 2, to: ['harbor', 26, 10, 'left'] },
      { t: 'warp', x: 36, y: 3, w: 1, h: 1, to: ['nest', 14, 29, 'up'] },
      { t: 'deco', kind: 'lighthouse', x: 31, y: 6, w: 2, h: 3, block: 1 },
      { t: 'deco', kind: 'car', x: 12, y: 10, w: 2, h: 1, block: 1 }, { t: 'deco', kind: 'car', x: 26, y: 15, w: 2, h: 1, block: 1 }, { t: 'deco', kind: 'car', x: 5, y: 12, w: 2, h: 1, block: 1 },
      { t: 'sign', x: 7, y: 10, text: '폐허 해안\n동쪽 끝 동굴: 출입 금지 (철충 다수 확인)' },
      { t: 'obj', kind: 'healpod', x: 33, y: 7, block: 1 },
      { t: 'trainer', id: 'calista', sprite: 'calista', x: 10, y: 5, dir: 'left', sight: 3 },
      { t: 'trainer', id: 'raven', sprite: 'raven', x: 17, y: 15, dir: 'down', sight: 2 },
      { t: 'trainer', id: 'kheshig', sprite: 'kheshig', x: 23, y: 9, dir: 'left', sight: 3 },
      { t: 'trainer', id: 'mariagrace', sprite: 'mariagrace', x: 29, y: 14, dir: 'right', sight: 1 },
      { t: 'trainer', id: 'zeta', sprite: 'lemonzeta', x: 36, y: 4, dir: 'down', sight: 2, boss: 1 },
      { t: 'item', id: 'c_kit2', x: 3, y: 4, item: 'kit2', n: 2 },
      { t: 'item', id: 'c_core2', x: 37, y: 17, item: 'core2', n: 3 },
      { t: 'item', id: 'c_cell', x: 18, y: 2, item: 'cell', n: 1 },
      { t: 'item', id: 'c_revive', x: 3, y: 17, item: 'revive', n: 1 },
      { t: 'legend', id: 'eternity', x: 32, y: 9, species: 'eternity', level: 40, cond: 'cleared' },
    ],
  };
})();

// ===== 철충 둥지 =====
(function () {
  const g = new Grid(30, 32, 'X');
  // 통로
  const N = 'N';
  g.v2(14, 22, 31, N); g.h2(5, 15, 22, N); g.v2(5, 13, 23, N); g.h2(5, 24, 13, N); g.v2(23, 6, 14, N); g.h2(13, 24, 6, N); g.v2(14, 2, 7, N);
  g.blob(9, 26, 4, 3, N, 71); g.blob(21, 26, 5, 3, N, 72); g.blob(7, 17, 3, 3, N, 73); g.blob(19, 18, 4, 3, N, 74); g.blob(25, 9, 3, 3, N, 75);
  g.blob(8, 8, 4, 3, N, 76); g.blob(15, 3, 5, 2, N, 77); g.blob(4, 4, 2, 2, N, 78);
  g.v2(4, 4, 13, N, 1);
  g.blob(21, 27, 3, 2, 'n', 81, 'N'); g.blob(7, 17, 2, 2, 'n', 82, 'N'); g.blob(19, 18, 3, 2, 'n', 83, 'N'); g.blob(8, 8, 3, 2, 'n', 84, 'N'); g.blob(25, 10, 2, 2, 'n', 85, 'N');
  g.blob(10, 27, 2, 1, '%', 86, 'N'); g.blob(18, 10, 1, 1, '%', 87, 'N');
  g.rect(14, 28, 2, 4, N); g.rect(14, 2, 2, 6, N); g.rect(13, 3, 4, 3, N);
  MAPS.nest = {
    name: '철충 둥지', theme: 'nest', bgm: 'nest', amb: 'hum', bg: 'nest', rows: g.rows(), enc: 'nest', dark: 1, ambient: 'spores',
    objects: [
      { t: 'exit', x: 14, y: 31, w: 2, h: 1, to: ['coast', 36, 4, 'down'] },
      { t: 'obj', kind: 'healpod', x: 12, y: 7, block: 1 },
      { t: 'deco', kind: 'nestcore', x: 14, y: 0, w: 2, h: 2, block: 1 },
      { t: 'trainer', id: 'draculina', sprite: 'draculina', x: 6, y: 20, dir: 'up', sight: 3 },
      { t: 'trainer', id: 'sekhmet', sprite: 'sekhmet', x: 22, y: 12, dir: 'down', sight: 2 },
      { t: 'trainer', id: 'omega', sprite: 'lemonomega', x: 14, y: 3, dir: 'down', sight: 3, boss: 1, zone: [13, 4, 4, 4] },
      { t: 'item', id: 'n_kit3', x: 3, y: 4, item: 'kit3', n: 2 },
      { t: 'item', id: 'n_core2', x: 25, y: 26, item: 'core2', n: 3 },
      { t: 'item', id: 'n_revive', x: 27, y: 9, item: 'revive', n: 2 },
      { t: 'item', id: 'n_cell', x: 9, y: 6, item: 'cell', n: 2 },
      { t: 'legend', id: 'blacklilith', x: 4, y: 3, species: 'blacklilith', level: 40, cond: 'cleared' },
    ],
  };
})();
