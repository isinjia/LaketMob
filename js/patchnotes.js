// =====================================================================
//  패치노트: 타이틀 메뉴 「패치노트」에서 보는 버전별 변경 내용 (v0.60부터)
//  새 버전을 올릴 때마다 맨 위에 항목을 추가한다. 플레이어가 읽는 말로 쓴다.
// =====================================================================
const PATCH_NOTES = [
  { v: 'v0.70', items: [
    '아주 낮은 확률로 야생에서 전설 바이오로이드 출현',
    '이미 잡은 몬스터는 덜 나오고, 아직 잡지 않은 몬스터가 더 자주 나옴',
    '처음 만나는 몬스터는 링크 성공률 상승',
    '버그 수정',
  ] },
  { v: 'v0.69', items: [
    '오르카 캠프에 포츈, 엘프의 숲에 포이로 자리 변경',
    '데이터 칩 10종 추가',
    '라비아타의 휴대폰: 퀘스트를 끝내면 의뢰인이 전화로 보상을 줌',
    '진화할 때 진화를 거부할 수 있음',
    '버그 수정',
  ] },
  { v: 'v0.68', items: [
    '케시크·클로버 에이스 일러스트가 깨져 보이던 문제 수정',
    '버그 수정',
  ] },
  { v: 'v0.67', items: [
    '멀린 대사를 원작 말투로 수정',
    '남부 항구 마을 NPC를 멀린에서 닥터로 변경',
    '전투에서 공격이 나가는 위치가 어긋나던 캐릭터 수정',
    '버그 수정',
  ] },
  { v: 'v0.66', items: [
    '링크 코어를 던지는 동안 HP 창이 가리지 않게 숨김',
    '대사가 넘어갈 때 대사창이 깜빡이던 문제 수정',
    '버그 수정',
  ] },
  { v: 'v0.65', items: [
    '체육관 관원을 원작 레모네이드 부관으로 변경 (감마 멀린, 베타 잉글리쉬 셰퍼드, 제타 헤스티아, 오메가 커넥터 유미, 델타는 부관 없음)',
    '잉글리쉬 셰퍼드·헤스티아 추가',
    '멀린 대사를 원작 말투로 변경',
    '버그 수정',
  ] },
  { v: 'v0.64', items: [
    '링크 코어 포획 연출 변경',
    '새 기술을 배울 때 기술 정보 확인 가능',
    '관장 승리 후 밤 장면 전체화면',
    '폴른·다크엘븐·운디네 전투 일러 방향 수정',
    '버그 수정',
  ] },
  { v: 'v0.63', items: [
    '캐릭터 기술을 원작 설정에 맞게 전면 재정리',
    '원작 대표기와 필살기가 일반 공용 기술보다 강하도록 조정',
    '보호기는 공격 약화, 지원기는 지휘·정보·보급 성격에 맞는 강화 기술 보유',
    '같은 효과나 같은 연출의 기술이 겹치지 않도록 정리',
    '속성 캐릭터는 속성 공격 2개 이상, 모든 캐릭터 기술 5개 이상',
  ] },
  { v: 'v0.62', items: [
    '관장은 해당 퀘스트를 받아야 도전할 수 있음',
    '캐릭터마다 원작 두 번째 패시브를 고유 기술로 추가 (Lv23에 배움)',
    '무기와 역할에 맞는 기술 구성 다듬기',
    '동료가 따라올 때 끊겨 보이던 문제 수정',
    '버그 수정',
  ] },
  { v: 'v0.61', items: [
    '공격기·보호기·지원기 역할과 무기에 맞춰 배우는 기술 구성 변경',
  ] },
  { v: 'v0.60', items: [
    '타이틀 화면에 패치노트 추가',
    '버그 수정',
  ] },
];

class PatchNotesScreen {
  constructor() { this.scroll = 0; }
  rows(width, size) {
    const out = [];
    for (const n of PATCH_NOTES) {
      out.push({ head: n.v });
      for (const it of n.items) wrapText('· ' + it, width, size, 600).forEach((l, i) => out.push({ text: i ? '   ' + l : l }));
      out.push({ gap: true });
    }
    return out;
  }
  update() {
    if (Input.pressed.b || Input.pressed.menu || Input.pressed.a || (Input.mouse.click && !this._drag)) { Audio2.cancel(); UI.close(this); return; }
    if (Input.pressed.down) this.scroll++;
    if (Input.pressed.up) this.scroll = Math.max(0, this.scroll - 1);
  }
  // 가로·데스크톱: 960x640 상자 안에 그린다
  draw() {
    screenBG('패치노트', '버전별 변경 내용');
    panel(80, 84, 800, 470);
    this.list(110, 124, 740, 18, 30, 520);
    helpLine('↑↓: 스크롤 · Z / X: 돌아가기');
  }
  // 줄 목록을 y0부터 bottom 까지 그린다 (scroll 줄만큼 건너뛴다)
  list(x, y0, width, size, lh, bottom) {
    const rows = this.rows(width, size), vis = Math.max(1, Math.floor((bottom - y0) / lh));
    this.scroll = Math.min(this.scroll, Math.max(0, rows.length - vis));
    rows.slice(this.scroll, this.scroll + vis).forEach((r, i) => {
      const y = y0 + i * lh;
      if (r.head) txt(r.head, x, y, { size: size + 4, weight: 900, color: UI_COL.accent });
      else if (r.text) txt(r.text, x, y, { size, weight: 600, color: '#cfe6f5' });
    });
  }
}
