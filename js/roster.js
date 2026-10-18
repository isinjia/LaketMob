// 자동 생성 데이터와 별도로 관리하는 주요 캐릭터의 전술별 습득표.
// 기존에 기억한 기술은 보존한다. 새 영입과 이후 레벨업부터 이 표를 사용한다.
const ROSTER_MOVE_PROFILES = {
  constantia: [[1, 'shot'], [1, 'taunt'], [7, 'expose'], [14, 'command'], [24, 'rush'], [32, 'snipe']],
  johanna: [[1, 'quick'], [1, 'guard'], [7, 'coverfire'], [14, 'blade'], [24, 'steelwill'], [34, 'fortify']],
  amy: [[1, 'shot'], [1, 'smoke'], [7, 'aimed'], [14, 'snipe'], [24, 'expose'], [34, 'flash']],
  daphne: [[1, 'shot'], [1, 'repair'], [7, 'smoke'], [14, 'dive'], [24, 'fortify'], [34, 'strafe']],
  fortune: [[1, 'shot'], [1, 'repair'], [7, 'guard'], [14, 'coverfire'], [24, 'command'], [34, 'steelwill']],
  tomoe: [[1, 'quick'], [1, 'command'], [7, 'blade'], [14, 'expose'], [24, 'rush'], [34, 'steelwill']],
  labiata: [[1, 'tackle'], [1, 'aimed'], [7, 'blade'], [14, 'shell'], [24, 'barrage'], [34, 'overload']],
  vanilla: [[1, 'shot'], [1, 'repair'], [7, 'taunt'], [14, 'expose'], [24, 'blade'], [34, 'command']],
  emily: [[1, 'shot'], [1, 'shell'], [7, 'aimed'], [14, 'burst'], [24, 'barrage'], [34, 'railgun'], [40, 'overload']],
  atalanta: [[1, 'shot'], [1, 'guard'], [7, 'coverfire'], [14, 'expose'], [24, 'steelwill'], [34, 'snipe']],
  audrey: [[1, 'shot'], [1, 'smoke'], [7, 'taunt'], [14, 'command'], [24, 'expose'], [34, 'rush']],
  rhea: [[1, 'dive'], [1, 'repair'], [7, 'guard'], [14, 'strafe'], [24, 'fortify'], [34, 'bomb']],
  alvis: [[1, 'tackle'], [1, 'guard'], [7, 'repair'], [14, 'coverfire'], [24, 'steelwill'], [34, 'rush']],
  raven: [[1, 'shot'], [1, 'aimed'], [7, 'dive'], [14, 'snipe'], [24, 'smoke'], [34, 'bomb']],
  shirayuri: [[1, 'shot'], [1, 'taunt'], [7, 'expose'], [14, 'snipe'], [24, 'aimed'], [34, 'flash']],
  thetis: [[1, 'dive'], [1, 'smoke'], [7, 'repair'], [14, 'command'], [24, 'strafe'], [34, 'bomb']],
  snowfeather: [[1, 'dive'], [1, 'coldshot'], [7, 'smoke'], [14, 'cryo'], [24, 'afterburn'], [34, 'absolute']],
  poi: [[1, 'quick'], [1, 'blade'], [7, 'expose'], [14, 'aimed'], [24, 'rush'], [34, 'flash']],
  draculina: [[1, 'dive'], [1, 'smoke'], [7, 'bloodlink'], [14, 'afterburn'], [24, 'strafe'], [34, 'bomb']],
  sekhmet: [[1, 'shot'], [1, 'taunt'], [7, 'repair'], [14, 'expose'], [24, 'command'], [34, 'steelwill']],
};

// 확장 캐릭터는 기존 도감 번호와 세이브 키를 바꾸지 않고 뒤에 붙인다.
for (const source of EXPANDED_ROSTER) {
  if (SPECIES[source.key]) continue;
  const s = { ...source, moves: ROSTER_MOVE_PROFILES[source.key] || source.moves, no: DEX_LIST.length + 1 };
  SPECIES[s.key] = s; SPECIES_LIST.push(s); DEX_LIST.push(s);
}
// 각 지역의 기존 조우를 2/3 정도 유지하고 추가 캐릭터를 1/3 확률로 섞는다.
for (const [area, table] of Object.entries(ENCOUNTERS)) {
  const additions = EXPANDED_ROSTER.filter(s => s.habitat === area && SPECIES[s.key]?.expanded);
  const weight = table.list.reduce((n, [, w]) => n + w, 0) * 0.5 / Math.max(1, additions.length);
  for (const s of additions) if (!table.list.some(([k]) => k === s.key)) table.list.push([s.key, weight]);
}
