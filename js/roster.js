// 확장 캐릭터는 기존 도감 번호와 세이브 키를 바꾸지 않고 뒤에 붙인다.
for (const source of EXPANDED_ROSTER) {
  if (SPECIES[source.key]) continue;
  const s = { ...source, no: DEX_LIST.length + 1 };
  SPECIES[s.key] = s; SPECIES_LIST.push(s); DEX_LIST.push(s);
}
// 각 지역의 기존 조우를 2/3 정도 유지하고 추가 캐릭터를 1/3 확률로 섞는다.
for (const [area, table] of Object.entries(ENCOUNTERS)) {
  const additions = EXPANDED_ROSTER.filter(s => s.habitat === area && SPECIES[s.key]?.expanded);
  const weight = table.list.reduce((n, [, w]) => n + w, 0) * 0.5 / Math.max(1, additions.length);
  for (const s of additions) if (!table.list.some(([k]) => k === s.key)) table.list.push([s.key, weight]);
}
