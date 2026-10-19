// =====================================================================
//  오르카 휴대폰: 라비아타가 시작할 때 건넨다. 퀘스트 목표를 채우면
//  의뢰인이 전화를 걸어 와서, 다시 찾아가지 않아도 보고·보상이 끝난다.
//  - 대상: 목표(check)와 보고 대상(at)이 둘 다 있는 단계 ("○○하고 ○○에게 보고")
//  - "○○에게 가서 이야기 듣기"처럼 목표가 없는 단계는 직접 찾아가야 한다
//  quests.js · world.js · game.js 다음에 로드한다.
// =====================================================================
(function () {
  if (!window.Quests) return;
  // 보고 대상의 이름·초상화 (트레이너면 트레이너 표에서)
  function caller([map, id]) {
    const T = TRAINERS[id];
    if (T) return { speaker: T.name + ' (통화)', portrait: T.portrait, voice: T.voice || T.portrait };
    const o = MAPS[map] && MAPS[map].objects.find(x => x.id === id);
    return { speaker: ((o && o.name) || id) + ' (통화)', portrait: o && o.sprite, voice: o && o.sprite };
  }
  // 전화로 보고할 수 있는 단계
  function callable(q) {
    const st = Quests.step(q);
    // 보고 대상이 지금 같은 맵에 있으면 전화 대신 직접 말을 건다
    return st && st.at && st.check && st.at[0] !== World.id && Quests.stepReady(q) ? st : null;
  }
  let calling = false;
  async function ring(q, st) {
    calling = true; World.locked = true;
    try {
      const o = caller(st.at);
      for (let i = 0; i < 2; i++) { Audio2.tone(1320, 0.09, 'sine', 0.12); await wait(120); Audio2.tone(1568, 0.09, 'sine', 0.12); await wait(380); }
      await say('(띠리리링♪ 휴대폰이 울린다. ' + Quests.npcName(st.at) + '에게서 온 연락이다.)');
      if (o.voice) Audio2.voice(o.voice, 'talk', 0.8);
      if (st.talk) await st.talk(o);
      else await say('사령관, 부탁한 일 다 끝났지? 고마워!', o);
      await Quests.advance(q);
      Quests.tick();
    } finally { calling = false; World.locked = false; }
  }
  // 필드에서 한가할 때만 건다 (대화·전투·장면 전환 중에는 기다린다)
  Quests.phoneTick = function () {
    if (calling || !Game.flags.phone || Scene !== World || World.locked || UI.busy() || (window.Trans && Trans.active)) return;
    for (const q of Quests.list) {
      if (!Quests.active(q.id)) continue;
      const st = callable(q);
      if (st) { ring(q, st); return; }
    }
  };
  const baseUpdate = World.update.bind(World);
  World.update = function (dt) { baseUpdate(dt); this.phoneT = (this.phoneT || 0) + dt; if (this.phoneT > 0.7) { this.phoneT = 0; Quests.phoneTick(); } };

  // 라비아타가 시작 선물로 휴대폰을 준다
  const baseGifts = Scripts.starterGifts.bind(Scripts);
  Scripts.starterGifts = async function (o) {
    Game.flags.phone = 1;
    await say('그리고 이건 오르카 전용 휴대폰이에요. 의뢰를 끝내면 의뢰인이 바로 연락할 테니, 일일이 다시 찾아가지 않으셔도 돼요.', o);
    Audio2.sfx('item_get', 0.8);
    await say('사령관은 오르카 휴대폰을 받았다!');
    return baseGifts(o);
  };
  // 이미 시작한 세이브는 불러올 때 휴대폰을 받은 것으로 한다
  const baseLoad = Game.load;
  Game.load = function () { const ok = baseLoad.apply(this, arguments); if (ok && this.flags.gotStarter) this.flags.phone = 1; return ok; };
})();
