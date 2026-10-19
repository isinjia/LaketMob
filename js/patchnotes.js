// =====================================================================
//  패치노트: 타이틀 메뉴 「패치노트」에서 보는 버전별 변경 내용 (v0.60부터)
//  새 버전을 올릴 때마다 맨 위에 항목을 추가한다. 플레이어가 읽는 말로 쓴다.
// =====================================================================
const PATCH_NOTES = [
  { v: 'v0.60', items: [
    '포켓몬스터식 표현을 라스트 오리진에 어울리는 말로 바꿨습니다.',
    '기술 「몸통 박치기」의 이름을 「근접 타격」으로 바꿨습니다.',
    '전투 메시지가 바뀌었습니다: 「급소에 맞았다」 → 「치명타」, 「효과가 굉장했다」 → 「상성 우위」, 「효과가 별로인 듯하다」 → 「상성 열세」.',
    '기술 사용 횟수 표시를 PP에서 EN(에너지)으로 바꿨습니다. 에너지 셀로 회복합니다.',
    '부대원을 교체할 때 「돌아와!」 대신 「후퇴해!」라고 지시합니다.',
    '타이틀 화면에 패치노트 메뉴를 추가했습니다.',
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
