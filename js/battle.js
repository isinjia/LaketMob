// =====================================================================
//  라켓몬스터 - 전투
// =====================================================================
const FOE_BOX = { cx: 700, base: 318, w: 380, h: 300 };
const ME_BOX = { cx: 235, base: 572, w: 430, h: 430 };

// 일러스트 하단 40%(다리·발)의 가로 무게중심이 그림 중앙에서 얼마나 벗어났는지 (그림 폭 대비 비율, 이미지마다 한 번 계산)
function artFootOffset(img) {
  if (img._foot !== undefined) return img._foot;
  img._foot = 0;
  try {
    const cw = 100, ch = Math.max(1, Math.round(cw * img.height / img.width));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, cw, ch);
    const y0 = Math.round(ch * 0.6), d = g.getImageData(0, y0, cw, ch - y0).data;
    let s = 0, sx = 0;
    for (let i = 0, n = d.length / 4; i < n; i++) { const a = d[i * 4 + 3]; s += a; sx += a * (i % cw); }
    if (s > 0) img._foot = clamp((sx / s + 0.5) / cw - 0.5, -0.2, 0.2);
  } catch (e) { } // file:// 등에서 픽셀을 읽을 수 없으면 보정 없이 그린다
  return img._foot;
}

function stageMult(s, acc) { if (acc) return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
const STAGE_NAME = { atk: '공격', def: '방어', spd: '속도', acc: '명중률' };

class Battle {
  constructor(o) {
    this.o = o;
    this.kind = o.kind || 'wild';           // wild | trainer
    this.foes = o.foes;                      // Mon[]
    this.foeI = 0;
    this.trainer = o.trainer || null;        // {name, portrait, lines...}
    this.bg = IMG.bg[o.bg || 'route'];
    this.meI = Game.party.findIndex(m => m.hp > 0);
    this.participants = new Set();
    this.shapes = [];
    this.mode = 'intro';
    this.menuNav = new ListNav(4, { cols: 4, wrap: false });
    this.moveNav = new ListNav(4, { cols: 4, wrap: false });
    this.foeV = { x: 420, a: 0, sc: 1, flash: 0, dy: 0, show: false, rot: 0 };
    this.meV = { x: -420, a: 0, sc: 1, flash: 0, dy: 0, show: false, rot: 0 };
    this.trV = { x: 420, a: 0 };
    this.cmdV = { x: -420, a: 1 };
    this.hudFoe = { a: 0, hp: 0 }; this.hudMe = { a: 0, hp: 0, exp: 0 };
    this.ball = null; this.link = null;
    this.runTries = 0;
    this.t = 0;
    this.lowT = 0;
    this.stage = { me: null, foe: null };
    this.resetStages('me'); this.resetStages('foe');
    this.introT = 0;
    this.levelPanel = null;
    // 알파의 역송신 준비는 최종전 첫 턴의 지휘로 이어진다.
    this.cmdG = this.trainer && this.trainer.copyOf && Game.flags.counterlink ? 3 : 0;
  }
  get foe() { return this.foes[this.foeI]; }
  pfx(side) { if (side === 'me') return ''; if (this.kind === 'trainer') return '상대 '; return this.o.legend ? '' : '폭주한 '; }
  get me() { return Game.party[this.meI]; }
  resetStages(side) { this.stage[side] = { atk: 0, def: 0, spd: 0, acc: 0 }; }
  sideOf(m) { return m === this.me ? 'me' : 'foe'; }
  view(side) { return side === 'me' ? this.meV : this.foeV; }

  // ---------------- 메인 흐름 ----------------
  async run() {
    Particles.clear(); if (window.BFX) BFX.clear();
    const bgm = this.o.bgm || (this.kind === 'wild' ? 'wild' : 'trainer');
    Audio2.bgm(bgm, { fadeIn: 200, fadeOut: 200 });
    Audio2.sfx('battle_start', 0.5);
    this.foes.forEach(f => Game.markSeen(f.key));
    // 인트로
    this.mode = 'intro';
    tween(this, { introT: 1 }, 600, Ease.outCubic);
    if (this.kind === 'wild') {
      this.foeV.show = true; this.foeV.a = 1;
      tween(this.cmdV, { x: 0 }, 650, Ease.outCubic);
      await tween(this.foeV, { x: 0 }, 650, Ease.outCubic);
      Audio2.voice(this.foe.key, 'start', 0.85);
      this.foeV.flash = 1; tween(this.foeV, { flash: 0 }, 400);
      await tween(this.hudFoe, { a: 1, hp: this.foe.hp }, 250);
      const verb = this.o.legend ? '전설의 바이오로이드 ' : '폭주한 ';
      await say(this.o.legend ? J(verb + this.foe.name, '이') + ' 모습을 드러냈다!' : J(verb + this.foe.name, '이') + ' 나타났다!', { auto: 1100 });
    } else {
      this.trV.a = 1;
      tween(this.cmdV, { x: 0 }, 600, Ease.outCubic);
      await tween(this.trV, { x: 0 }, 600, Ease.outCubic);
      await say(J(this.trainer.title + ' ' + this.trainer.name, '이') + ' 승부를 걸어왔다!', { auto: 1100 });
      if (this.trainer.intro) await say(this.trainer.intro, { speaker: this.trainer.name, auto: 1600 });
      await tween(this.trV, { x: 420, a: 0 }, 400, Ease.inQuad);
      await this.sendFoe();
    }
    await this.sendMe(true);
    // 턴 루프
    while (true) {
      const act = await this.chooseAction();
      const res = await this.doTurn(act);
      if (res) { await this.finish(res); return res; }
    }
  }

  async sendFoe() {
    const f = this.foe;
    this.resetStages('foe');
    Game.markSeen(f.key);
    if (this.kind === 'trainer') await say(J(this.trainer.name, '은') + ' ' + J(f.name, '을') + ' 내보냈다!', { auto: 800 });
    this.foeV.show = true; this.foeV.x = 0; this.foeV.a = 0; this.foeV.sc = 0.2; this.foeV.dy = 0;
    this.burst(this.foePos(), ['#ff6a7a', '#fff'], 22);
    Audio2.sfx('stage_in', 0.6);
    Audio2.voice(f.key, 'start', 0.85);
    await Promise.all([tween(this.foeV, { a: 1, sc: 1 }, 380, Ease.outBack), tween(this.hudFoe, { a: 1, hp: f.hp }, 300)]);
  }
  async sendMe(first) {
    const m = this.me;
    this.resetStages('me');
    this.participants.add(m);
    this.moveNav.i = 0;
    await say(first ? '가랏! ' + m.name + '!' : J(m.name, '아') + ', 부탁해!', { auto: 650 });
    // 코어 투척
    this.meV.show = true; this.meV.x = 0; this.meV.a = 0; this.meV.sc = 0.2;
    this.hudMe.hp = m.hp; this.hudMe.exp = m.expRatio();
    if (first) { tween(this.cmdV, { x: -460 }, 700, Ease.inQuad); await this.throwCore({ x: ME_BOX.cx + 40, y: ME_BOX.base - 212 }, this.mePos(), 'core', 380); }
    else await this.throwCore({ x: 60, y: 600 }, this.mePos(), 'core', 380);
    this.ball = null;
    this.burst(this.mePos(), ['#5ff4ff', '#fff'], 26);
    Audio2.sfx('stage_in', 0.7);
    Audio2.voice(m.voiceKey || m.key, 'start');
    await Promise.all([tween(this.meV, { a: 1, sc: 1 }, 380, Ease.outBack), tween(this.hudMe, { a: 1 }, 300)]);
  }
  foePos() { return BattleArt.point(this, 'foe', 'hit'); }
  mePos() { return BattleArt.point(this, 'me', 'hit'); }
  fxOrigin(side, fx) { return BattleArt.live(this, side, 'emit', fx); }
  fxTarget(side) { return BattleArt.live(this, side, 'hit'); }

  // ---------------- 행동 선택 ----------------
  chooseAction() {
    return new Promise(res => { this.mode = 'command'; this.pending = res; });
  }
  update(dt) {
    this.t += dt;
    if (UI.busy()) return;
    if (this.mode === 'command') this.updateCommand(dt);
    else if (this.mode === 'move') this.updateMove(dt);
  }
  updateCommand(dt) {
    if (this.me.hp / this.me.maxHp < 0.2) { this.lowT -= dt; if (this.lowT <= 0) { this.lowT = 1.4; Audio2.lowHp(); } }
    const r = this.menuNav.update(dt);
    if (r !== 'a') return;
    Audio2.select();
    const i = this.menuNav.i;
    if (i === 0) {
      if (this.me.moves.every(m => m.pp <= 0)) { this.mode = 'none'; this.pending({ type: 'move', id: '__struggle' }); return; }
      this.mode = 'move';
    } else if (i === 1) {
      this.mode = 'none';
      UI.push(new BagScreen('battle')).then(r => { if (r) this.pending({ type: 'item', ...r }); else this.mode = 'command'; });
    } else if (i === 2) {
      this.mode = 'none';
      UI.push(new PartyScreen('battle', { active: this.meI })).then(r => { if (r != null && r >= 0) this.pending({ type: 'switch', to: r }); else this.mode = 'command'; });
    } else if (i === 3) { this.mode = 'none'; this.pending({ type: 'run' }); }
  }
  updateMove(dt) {
    this.moveNav.setN(this.me.moves.length);
    // 사령관 지휘: 게이지가 차면 M/Tab(또는 클릭)으로 켜고 끈다
    const oc = Input.mouse.click, OR = this.orderRect;
    if ((this.cmdG || 0) >= 3 && (Input.pressed.menu || (oc && OR && oc.x >= OR.x && oc.x <= OR.x + OR.w && oc.y >= OR.y && oc.y <= OR.y + OR.h))) {
      this.order = !this.order; if (this.order) Audio2.sfx('charge', 0.6); else Audio2.cancel(); if (oc) Input.mouse.click = null; return;
    }
    const r = this.moveNav.update(dt);
    if (r === 'b') { Audio2.cancel(); this.mode = 'command'; return; }
    if (r !== 'a') return;
    const mv = this.me.moves[this.moveNav.i];
    if (mv.pp <= 0) { Audio2.bump(); return; }
    if (this.order && MOVES[mv.id].cat !== 'atk') { Audio2.bump(); this.orderWarn = 1.6; return; }
    Audio2.select();
    this.mode = 'none';
    this.pending({ type: 'move', id: mv.id, order: !!this.order && (this.cmdG || 0) >= 3 });
    this.order = false;
  }

  // ---------------- 턴 처리 ----------------
  // 연출·난수를 소비하지 않는 AI용 기대 피해. 다단 공격과 현재 능력 변화를 포함한다.
  expectedDamage(user, target, d, side, tSide) {
    if (d.cat !== 'atk') return 0;
    const attack = user.atk * stageMult(this.stage[side].atk) * (user.status === 'burn' ? 0.75 : 1);
    const defense = target.def * stageMult(this.stage[tSide].def);
    let damage = Math.floor(Math.floor(Math.floor(2 * user.level / 5 + 2) * d.pow * attack / defense) / 50) + 2;
    if (user.types.includes(d.type)) damage *= 1.5 * (user.hp <= user.maxHp / 3 ? 1.3 : 1);
    const eff = typeEff(d.type, target.types);
    damage *= eff * (eff > 1 && traitOf(target) === 'heavy' ? 0.75 : 1);
    const hits = d.hits ? (d.hits[0] + d.hits[1]) / 2 : 1;
    const accuracy = d.acc ? Math.min(1, d.acc / 100 * stageMult(this.stage[side].acc, true) * (traitOf(target) === 'air' ? 0.9 : 1)) : 1;
    return Math.max(1, damage * 0.925) * hits * accuracy;
  }
  moveScore(d) {
    const f = this.foe, m = this.me;
    const damage = this.expectedDamage(f, m, d, 'foe', 'me');
    let score = d.cat === 'atk' ? Math.min(110, damage / Math.max(1, m.hp) * 100) : 0;
    if (damage >= m.hp && d.cat === 'atk') score += 60;
    if (d.recoil && damage < m.hp) score -= Math.min(damage, m.hp) * d.recoil / f.maxHp * 70;
    if (d.drain) score += Math.min(f.maxHp - f.hp, damage * d.drain) / f.maxHp * 100;
    // 회복과 능력 변화는 가산한다. 요새화의 회복 가치를 방어 평가가 덮어쓰지 않는다.
    if (d.heal) score += Math.min(f.maxHp - f.hp, f.maxHp * d.heal) / f.maxHp * (f.hp < f.maxHp * 0.45 ? 180 : 90);
    if (d.status && !m.status) {
      const immune = { para: 'elec', burn: 'fire', freeze: 'ice' }[d.status];
      if (!m.types.includes(immune)) score += (d.status === 'freeze' ? 45 : 35) * (d.acc || 100) / 100;
    }
    const healthy = f.hp / f.maxHp;
    if (d.self) for (const [key, amount] of Object.entries(d.self)) {
      if (this.stage.foe[key] >= 2) continue;
      if (key === 'spd' && this.speedOf('foe') > this.speedOf('me')) continue;
      if (key === 'acc' && f.moves.every(x => !MOVES[x.id].acc || MOVES[x.id].acc >= 100) && this.stage.foe.acc >= 0) continue;
      score += Math.min(amount, 2 - this.stage.foe[key]) * (key === 'atk' ? 25 : 19) * healthy;
    }
    if (d.foe) for (const [key, amount] of Object.entries(d.foe)) {
      if (this.stage.me[key] <= -2) continue;
      score += Math.min(-amount, 2 + this.stage.me[key]) * 33 * healthy;
    }
    return Math.max(0, score);
  }
  foeAI() {
    const f = this.foe;
    const usable = f.moves.filter(x => x.pp > 0);
    if (!usable.length) return '__struggle';
    const smart = this.kind === 'trainer';
    let best = null, bestS = -1;
    for (const mv of usable) {
      const d = MOVES[mv.id];
      let s = this.moveScore(d);
      s *= smart ? rand(0.85, 1.15) : rand(0.4, 1.6);
      if (s > bestS) { bestS = s; best = mv.id; }
    }
    return best;
  }
  speedOf(side) {
    const m = side === 'me' ? this.me : this.foe;
    let s = m.spd * stageMult(this.stage[side].spd);
    if (m.status === 'para') s *= 0.5;
    return s;
  }
  async doTurn(act) {
    this.mode = 'none';
    const foeMove = this.foeAI();
    // 플레이어 비공격 행동 (우선 처리)
    if (act.type === 'run') {
      if (this.kind !== 'wild' || this.o.noRun) { await say(this.o.noRun ? '전투에서 이탈할 수 없다!' : '지휘관과의 승부에서 등을 보일 수는 없다!'); return null; }
      this.runTries++;
      const a = this.speedOf('me'), b = this.speedOf('foe');
      const chance = a >= b ? 1 : (a * 128 / b + 30 * this.runTries) / 256;
      if (Math.random() < chance) { Audio2.sfx('whoosh', 0.7); await say('무사히 후퇴했다!', { auto: 900 }); return 'run'; }
      await say('후퇴하지 못했다!', { auto: 900 });
      return await this.foeOnly(foeMove);
    }
    if (act.type === 'switch') {
      await this.withdraw();
      this.meI = act.to;
      await this.sendMe(false);
      return await this.foeOnly(foeMove);
    }
    if (act.type === 'item') {
      const it = ITEMS[act.item];
      if (it.kind === 'ball') { const r = await this.throwBall(act.item); if (r === 'reject') return null; if (r) return r; return await this.foeOnly(foeMove); }
      const target = Game.party[act.target];
      Game.bag[act.item]--;
      const msg = Game.applyItem(act.item, target);
      Audio2.sfx('heal', 0.7);
      if (target === this.me) { this.fxHeal('me'); await tween(this.hudMe, { hp: this.me.hp }, 500); }
      await say(msg, { auto: 1100 });
      return await this.foeOnly(foeMove);
    }
    // 둘 다 기술 사용
    const mMove = act.id, fMove = foeMove;
    this.orderNext = !!act.order;
    const pm = this.prio(mMove), pf = this.prio(fMove);
    let meFirst = pm !== pf ? pm > pf : (this.speedOf('me') === this.speedOf('foe') ? Math.random() < 0.5 : this.speedOf('me') > this.speedOf('foe'));
    const order = meFirst ? [['me', mMove], ['foe', fMove]] : [['foe', fMove], ['me', mMove]];
    for (const [side, mv] of order) {
      const user = side === 'me' ? this.me : this.foe;
      if (user.hp <= 0) continue;
      await this.useMove(side, mv);
      const r = await this.checkFaints();
      if (r) return r === 'cont' ? null : r;
    }
    return await this.endOfTurn();
  }
  prio(id) { return id === '__struggle' ? 0 : (MOVES[id].prio || 0); }
  async foeOnly(fMove) {
    await this.useMove('foe', fMove);
    const r = await this.checkFaints();
    if (r) return r === 'cont' ? null : r;
    return await this.endOfTurn();
  }
  async endOfTurn() {
    this.ordering = false;
    this.foeG = (this.foeG || 0) + 1;
    this.cmdG = Math.min(3, (this.cmdG || 0) + 1);
    for (const side of ['me', 'foe']) {
      const m = side === 'me' ? this.me : this.foe;
      if (m.hp <= 0) continue;
      if (m.status === 'burn' || m.status === 'corrode') {
        const dmg = Math.max(1, Math.floor(m.maxHp / (m.status === 'burn' ? 16 : 12)));
        this.view(side).flash = 1; tween(this.view(side), { flash: 0 }, 300);
        if (m.status === 'burn') { Audio2.sfx('hit_fire', 0.5); this.burst(side === 'me' ? this.mePos() : this.foePos(), ['#ff7a45', '#ffd34d'], 14, 140); }
        else { Audio2.sfx('hit_robot', 0.4); this.burst(side === 'me' ? this.mePos() : this.foePos(), ['#b55cff', '#ff4d7a'], 14, 140); }
        await this.applyDamage(side, dmg);
        await say(J(this.pfx(side) + m.name, '은') + ' ' + (m.status === 'burn' ? '화상' : '철충 침식') + ' 피해를 입었다!', { auto: 800 });
        const r = await this.checkFaints();
        if (r) return r === 'cont' ? null : r;
      }
    }
    return null;
  }
  // 반환: null(계속) | 'cont'(교체 후 다음 턴) | 'win' | 'lose'
  async checkFaints() {
    let result = null;
    if (this.foe.hp <= 0) {
      await this.faintAnim('foe');
      await say(this.pfx('foe') + J(this.foe.name, '은') + ' 쓰러졌다!', { auto: 900 });
      Game.stats.knockouts = (Game.stats.knockouts || 0) + 1;
      await this.giveExp(this.foe);
      const next = this.foes.findIndex(f => f.hp > 0);
      // 상대의 마지막 유닛을 쓰러뜨렸다면 같은 턴에 아군이 모두 쓰러져도 승리로 친다 (전투 후 선두가 HP 1로 버틴다)
      if (next < 0) { if (Game.party.every(p => p.hp <= 0)) { if (this.me && this.me.hp <= 0) await this.faintAnim('me'); this.me.hp = 1; } return 'win'; }
      if (Game.party.every(p => p.hp <= 0)) { if (this.me && this.me.hp <= 0) await this.faintAnim('me'); return 'lose'; }
      if (this.kind === 'trainer') {
        this.foeI = next;
        if (this.me.hp > 0 && Game.party.filter(p => p.hp > 0).length > 1) {
          const c = await ask(J(this.trainer.name, '은') + ' ' + J(this.foes[next].name, '을') + ' 내보내려 한다. 유닛을 교체할까?', ['교체한다', '그대로 간다'], { cancel: true });
          if (c === 0) {
            const t = await UI.push(new PartyScreen('battle', { active: this.meI }));
            if (t != null && t >= 0) { await this.withdraw(); this.meI = t; await this.sendFoe(); await this.sendMe(false); return 'cont'; }
          }
        }
        await this.sendFoe();
        result = 'cont';
      }
    }
    if (this.me.hp <= 0) {
      await this.faintAnim('me');
      await say(J(this.me.name, '은') + ' 쓰러졌다!', { auto: 900 });
      if (Game.party.every(p => p.hp <= 0)) return 'lose';
      // 교체 강제
      const t = await UI.push(new PartyScreen('battle', { active: this.meI, forced: true }));
      this.meI = t;
      await this.sendMe(false);
      result = 'cont';
    }
    return result;
  }
  async withdraw() {
    await say(J(this.me.name, '아') + ', 후퇴해!', { auto: 600 });
    Audio2.sfx('whoosh', 0.5);
    await tween(this.meV, { a: 0, sc: 0.3 }, 280, Ease.inQuad);
    this.meV.show = false;
  }
  async faintAnim(side) {
    const v = this.view(side), m = side === 'me' ? this.me : this.foe;
    Audio2.voice(side === 'me' ? (m.voiceKey || m.key) : m.key, 'retreat', 0.9);
    Audio2.sfx('hit_phy', 0.6);
    if (m.kind === 'boss') this.burst(side === 'me' ? this.mePos() : this.foePos(), ['#ff4d5e', '#ffb22e', '#333'], 40, 300);
    await tween(v, { dy: 160, a: 0 }, 520, Ease.inQuad);
    v.show = false; v.dy = 0;
    if (side === 'foe') this.hudFoe.a = 0; else this.hudMe.a = 0;
  }

  // ---------------- 기술 사용 ----------------
  async useMove(side, id) {
    const user = side === 'me' ? this.me : this.foe;
    const tSide = side === 'me' ? 'foe' : 'me';
    const target = side === 'me' ? this.foe : this.me;
    const pre = this.pfx(side);
    // 상태 확인
    if (user.status === 'freeze') {
      if (Math.random() < 0.25) { user.status = null; await say(pre + J(user.name, '의') + ' 동결이 풀렸다!', { auto: 800 }); }
      else { this.burst(side === 'me' ? this.mePos() : this.foePos(), ['#bff6ff', '#fff'], 12, 100); Audio2.sfx('ice', 0.4); await say(pre + J(user.name, '은') + ' 얼어붙어 움직일 수 없다!', { auto: 900 }); return; }
    }
    if (user.status === 'para' && Math.random() < 0.25) {
      this.fxSpark(side === 'me' ? this.mePos() : this.foePos());
      await say(pre + J(user.name, '은') + ' 몸이 감전되어 움직일 수 없다!', { auto: 900 }); return;
    }
    let d;
    if (id === '__struggle') d = { name: '최후의 발악', type: 'phys', cat: 'atk', pow: 50, acc: 100, recoil: 0.25, fx: 'smash' };
    else { d = MOVES[id]; const slot = user.moves.find(x => x.id === id); if (slot) slot.pp = Math.max(0, slot.pp - 1); }
    this._tp = {}; this.ordering = false;
    if (side === 'me' && this.orderNext && d.cat === 'atk') { this.orderNext = false; this.cmdG = 0; this.ordering = 'me'; this.orderMul = 1.5; await this.orderCutIn(user); }
    // 보스의 폭주 명령: 4턴마다 강화된 공격 (필중은 아님)
    if (side === 'foe' && d.cat === 'atk' && this.foe.kind === 'boss' && (this.foeG || 0) >= 4) {
      this.foeG = 0; this.ordering = 'foe'; this.orderMul = 1.3;
      FX.doFlash('#ff2a4a', 0.35); Audio2.sfx('warning', 0.6); if (window.BFX && BFX.ok) { const p = this.foePos(); BFX.ring(p.x, p.y, 20, 180, 0xff2a4a, 0.5); }
      await say(J(this.foe.name, '의') + ' 폭주 명령! 공격이 강화되었다!', { auto: 900 });
    }
    const av = this.view(side); av.flash = 0.55; tween(av, { flash: 0 }, 350);
    await say(pre + J(user.name, '의') + ' ' + d.name + '!', { auto: 650 });
    // 명중
    if (d.acc && this.ordering !== 'me') {
      // 광역(area) 기술은 명중 단계·기동형 회피의 영향을 받지 않는다 (범위로 휩쓴다)
      const accM = d.area ? 1 : stageMult(this.stage[side].acc, true) * (traitOf(target) === 'air' ? 0.9 : 1);
      if (Math.random() * 100 >= d.acc * accM) {
        Audio2.sfx('whoosh', 0.5);
        await say('그러나 공격은 빗나갔다!', { auto: 800 }); return;
      }
    }
    if (d.cat === 'st') { await this.statusMove(side, tSide, user, target, d); return; }
    // 공격
    const nHits = d.hits ? randi(d.hits[0], d.hits[1]) : 1;
    const eff = typeEff(d.type, target.types);
    let total = 0, crit = false, hits = 0;
    await this.playFx(d.fx, side, tSide, d.type, true);
    for (let h = 0; h < nHits; h++) {
      if (target.hp <= 0) break;
      const r = this.calcDamage(user, target, d, side, tSide);
      if (r.crit) crit = true;
      hits++;
      total += r.dmg;
      this.hitReact(tSide, d.type, eff, r.crit);
      this.popNumber(tSide, r.dmg, eff, r.crit);
      await this.applyDamage(tSide, r.dmg, 260);
      if (nHits > 1) await wait(120);
    }
    if (crit) await say('치명타! 약점을 꿰뚫었다!', { auto: 650 });
    if (eff > 1 && side === 'me' && hits) this.cmdG = Math.min(3, (this.cmdG || 0) + 1);
    if (eff > 1) await say('상성 우위! 큰 피해를 입혔다!', { auto: 700 });
    else if (eff < 1) await say('상성 열세... 피해가 줄었다.', { auto: 700 });
    if (nHits > 1) await say(hits + '번 맞았다!', { auto: 650 });
    // 흡수/반동
    if (d.drain && total > 0 && user.hp > 0) {
      const h = Math.max(1, Math.floor(total * d.drain));
      this.fxDrain(tSide, side);
      await this.applyDamage(side, -h);
      await say(J(this.pfx(tSide) + target.name, '으로') + '부터 체력을 흡수했다!', { auto: 800 });
    }
    if (d.recoil && total > 0) {
      await this.applyDamage(side, Math.max(1, Math.floor(total * d.recoil)));
      await say(pre + J(user.name, '은') + ' 반동으로 피해를 입었다!', { auto: 800 });
    }
    // 부가 효과
    if (target.hp > 0 && d.eff) {
      for (const k in d.eff) {
        if (Math.random() >= d.eff[k]) continue;
        if (/^foe(Def|Atk|Spd|Acc)$/.test(k)) await this.changeStage(tSide, k.slice(3).toLowerCase(), -1);
        else if (!target.status && !(k === 'burn' && target.types.includes('fire')) && !(k === 'freeze' && target.types.includes('ice')) && !(k === 'para' && target.types.includes('elec'))) await this.inflict(tSide, k);
      }
    }
    if (d.self && user.hp > 0) for (const k in d.self) await this.changeStage(side, k, d.self[k]);
    if (d.type === 'fire' && target.status === 'freeze' && target.hp > 0) { target.status = null; await say(J(this.pfx(tSide) + target.name, '의') + ' 동결이 녹았다!', { auto: 700 }); }
  }
  calcDamage(user, target, d, side, tSide) {
    let A = user.atk * stageMult(this.stage[side].atk);
    let D = target.def * stageMult(this.stage[tSide].def);
    if (d.pierce) D = Math.min(D, target.def) * 0.7; // 관통: 방어 강화를 무시하고 장갑의 30%를 뚫는다
    let critChance = d.crit ? 1 / 4 : 1 / 16;
    if (traitOf(user) === 'light') critChance = Math.min(1 / 3, critChance * 2); // 급소 기술과 겹쳐도 1/3까지만
    const crit = Math.random() < critChance;
    if (crit) { A = Math.max(A, user.atk); D = Math.min(D, target.def); }
    if (user.status === 'burn') A *= 0.75;
    let dmg = Math.floor(Math.floor(Math.floor(2 * user.level / 5 + 2) * d.pow * A / D) / 50) + 2;
    if (user.types.includes(d.type)) dmg *= 1.5;
    dmg *= typeEff(d.type, target.types);
    if (crit) dmg *= 1.5;
    if (user.types.includes(d.type) && user.hp <= user.maxHp / 3) { dmg *= 1.3; this.traitPop(side, 'rally'); }
    if (traitOf(target) === 'heavy' && typeEff(d.type, target.types) > 1) { dmg *= 0.75; this.traitPop(tSide, 'heavy'); }
    if (crit && traitOf(user) === 'light') this.traitPop(side, 'light');
    if (this.ordering === side) dmg *= this.orderMul || 1.5;
    dmg *= rand(0.85, 1);
    return { dmg: Math.max(1, Math.floor(dmg)), crit };
  }
  async statusMove(side, tSide, user, target, d) {
    await this.playFx(d.fx, side, tSide, d.type, false);
    let did = false;
    if (d.heal) {
      if (user.hp >= user.maxHp) { await say('그러나 HP는 이미 가득하다!', { auto: 700 }); }
      else { this.fxHeal(side); await this.applyDamage(side, -Math.floor(user.maxHp * d.heal)); await say(J(this.pfx(side) + user.name, '의') + ' HP가 회복되었다!', { auto: 800 }); did = true; }
    }
    if (d.self) for (const k in d.self) { await this.changeStage(side, k, d.self[k]); did = true; }
    if (d.foe) for (const k in d.foe) { await this.changeStage(tSide, k, d.foe[k]); did = true; }
    if (d.status) {
      if (target.status) await say('그러나 효과가 없었다!', { auto: 700 });
      else if ((d.status === 'para' && target.types.includes('elec')) || (d.status === 'burn' && target.types.includes('fire')) || (d.status === 'freeze' && target.types.includes('ice'))) await say(this.pfx(tSide) + target.name + '에게는 효과가 없는 것 같다...', { auto: 800 });
      else { await this.inflict(tSide, d.status); did = true; }
    }
    return did;
  }
  async inflict(side, st) {
    const m = side === 'me' ? this.me : this.foe;
    m.status = st;
    const p = side === 'me' ? this.mePos() : this.foePos();
    if (st === 'burn') { this.burst(p, ['#ff7a45', '#ffd34d'], 24, 200); Audio2.sfx('flame', 0.5); }
    if (st === 'para') { this.fxSpark(p); }
    if (st === 'freeze') { this.burst(p, ['#bff6ff', '#7fe3f0', '#fff'], 24, 200); Audio2.sfx('ice', 0.6); }
    if (st === 'corrode') { this.burst(p, ['#b55cff', '#ff4d7a'], 24, 200); Audio2.sfx('hit_robot', 0.5); }
    const msg = { burn: '화상을 입었다!', para: '감전되어 움직이기 어려워졌다!', freeze: '얼어붙었다!', corrode: '철충 세포에 침식당했다!' }[st];
    await say(J(this.pfx(side) + m.name, '은') + ' ' + msg, { auto: 900 });
  }
  async changeStage(side, k, n) {
    const m = side === 'me' ? this.me : this.foe;
    const cur = this.stage[side][k];
    const nv = clamp(cur + n, -6, 6);
    if (nv === cur) { await say(J(this.pfx(side) + m.name, '의') + ' ' + J(STAGE_NAME[k], '은') + ' 더 이상 ' + (n > 0 ? '오르지' : '떨어지지') + ' 않는다!', { auto: 800 }); return; }
    this.stage[side][k] = nv;
    const p = side === 'me' ? this.mePos() : this.foePos();
    if (n > 0) { this.fxArrows(p, true); Audio2.sfx('rise', 0.6); }
    else { this.fxArrows(p, false); Audio2.tone(500, 0.25, 'sawtooth', 0.06, -300); }
    const deg = Math.abs(n) >= 2 ? (n > 0 ? '크게 올랐다!' : '크게 떨어졌다!') : (n > 0 ? '올랐다!' : '떨어졌다!');
    await say(J(this.pfx(side) + m.name, '의') + ' ' + J(STAGE_NAME[k], '이') + ' ' + deg, { auto: 800 });
  }
  async applyDamage(side, dmg, ms = 450) {
    const m = side === 'me' ? this.me : this.foe;
    m.hp = clamp(m.hp - dmg, 0, m.maxHp);
    const hud = side === 'me' ? this.hudMe : this.hudFoe;
    await tween(hud, { hp: m.hp }, ms, Ease.outQuad);
  }

  // ---------------- 포획 ----------------
  async throwBall(id) {
    const it = ITEMS[id];
    if (this.kind === 'trainer') { Audio2.bump(); await say('다른 지휘관의 유닛과는 링크할 수 없다!'); return 'reject'; }
    Game.bag[id]--;
    await say('사령관은 ' + J(it.name, '을') + ' 사용했다!', { auto: 600 });
    const f = this.foe;
    // 확률 계산
    const stBonus = f.status === 'freeze' ? 2 : f.status ? 1.5 : 1;
    const newBonus = Game.dex.caught[f.key] ? 1 : 1.3; // 도감 채우기: 처음 만나는 종은 링크가 조금 더 쉽다
    const a = it.rate >= 255 ? 255 : ((3 * f.maxHp - 2 * f.hp) * f.species.catch * it.rate) / (3 * f.maxHp) * stBonus * newBonus;
    let shakes = 0;
    if (a >= 255) shakes = 4;
    else { const b = 65536 / Math.pow(255 / Math.max(1, a), 0.1875); for (let i = 0; i < 4; i++) { if (Math.random() * 65536 < b) shakes++; else break; } }
    // 투척 연출: 코어가 빛 꼬리를 끌며 날아가 대상 앞에 멈춰 뜬다 (대상을 빨아들이지 않는다)
    const fr = BattleArt.frame(this, 'foe'), cx = fr.x + fr.w / 2, cy = fr.y + fr.h * 0.42;
    const hover = { x: cx - Math.min(110, fr.w * 0.45), y: cy - 10 };
    await this.throwCore({ x: 120, y: ME_BOX.base - 12 }, hover, id, 380, 90, true);
    Audio2.sfx('shine', 0.6); FX.doFlash('#bff6ff', 0.35);
    this.burst(hover, ['#5ff4ff', '#fff'], 18, 200);
    // 링크 장치 전개: 구속 고리가 몸을 감싸고 코어와 대상이 빛줄기로 이어진다
    const L = this.link = { cx, cy, fr, a: 0, prog: 0, shown: 0, pulse: 0, state: 'sync', t: 0 };
    // 링크 중에는 HP 같은 UI를 치워 연출만 보이게 한다 (실패하면 다시 나온다)
    tween(this.hudFoe, { a: 0 }, 220); tween(this.hudMe, { a: 0 }, 220);
    this.ball.hover = true;
    Audio2.sfx('charge', 0.45);
    await tween(L, { a: 1 }, 320, Ease.outCubic);
    const th = [0.34, 0.67, 0.92];
    for (let i = 0; i < Math.min(3, shakes); i++) {
      Audio2.tone(520 + i * 200, 0.14, 'sine', 0.16, 260);
      L.pulse = 1; tween(L, { pulse: 0 }, 420);
      await Promise.all([tween(L, { prog: th[i] }, 520, Ease.outCubic), this.struggle(i)]);
      await wait(220);
    }
    if (shakes >= 4) {
      Audio2.tone(1180, 0.25, 'sine', 0.2, 400);
      await tween(L, { prog: 1 }, 380, Ease.outCubic);
      L.state = 'ok'; L.pulse = 1; tween(L, { pulse: 0 }, 600);
      Audio2.sfx(this.o.legend ? 'catch_ss' : 'catch', 0.8); FX.doFlash('#e8fdff', 0.45);
      // 대상이 빛 입자로 풀려 코어로 흘러 들어간다
      for (let k = 0; k < 46; k++) {
        const px = fr.x + Math.random() * fr.w, py = fr.y + fr.h * (0.1 + Math.random() * 0.8), d = 0.35 + Math.random() * 0.35;
        Particles.add({ x: px, y: py, vx: (hover.x - px) / d, vy: (hover.y - py) / d, life: d, size: 3 + Math.random() * 4, color: k % 3 ? '#5ff4ff' : '#ffffff', add: true });
      }
      await Promise.all([tween(this.foeV, { a: 0, sc: 0.92 }, 520, Ease.inQuad), tween(L, { a: 0 }, 600)]);
      this.foeV.show = false; this.link = null;
      if (!this.ball) this.ball = { x: hover.x, y: hover.y, id, rot: 0, t: 0 };
      this.ball.glow = 1; this.ball.hover = false;
      tween(this.hudMe, { a: 1 }, 260); // 경험치 표시용으로 아군 UI만 돌아온다
      await wait(250);
      // 링크가 끝난 코어가 사령관에게 돌아온다
      await this.throwCore({ x: this.ball.x, y: this.ball.y }, { x: 140, y: ME_BOX.base - 40 }, id, 420, 60, true, true);
      Audio2.voice(f.key, 'join');
      await say('링크 완료! ' + J(f.name, '과') + ' 링크했다!', { auto: 1500 });
      Game.markCaught(f.key);
      f.hp = Math.max(1, f.hp); f.ot = '사령관';
      await this.giveExp(f, true);
      const where = Game.addMon(f);
      if (where === 'box') await say('부대가 가득 차서 ' + J(f.name, '은') + ' 오르카 격납고로 보내졌다.', { auto: 1400 });
      this.ball = null; this.foeV.sc = 1;
      return 'caught';
    }
    // 실패: 게이지가 붉게 깨지고 연결선이 끊기며 구속 고리가 부서진다
    L.state = 'fail'; L.pulse = 1;
    Audio2.tone(240, 0.3, 'sawtooth', 0.16, -160); Audio2.sfx('shield', 0.6);
    await Promise.all([this.struggle(3), tween(L, { prog: Math.max(0, L.prog - 0.25) }, 260)]);
    FX.doShake(8, 0.25);
    this.burst({ x: cx, y: cy }, ['#ff5a6a', '#fff', '#5ff4ff'], 34, 320);
    this.burst(this.ball || hover, ['#5ff4ff', '#fff'], 20, 220);
    this.foeV.flash = 1; tween(this.foeV, { flash: 0 }, 350);
    await Promise.all([tween(L, { a: 0 }, 260), tween(this.hudFoe, { a: 1 }, 300), tween(this.hudMe, { a: 1 }, 300)]);
    this.link = null; this.ball = null;
    const msgs = ['링크가 바로 거부당했다!', '동기화 34%에서 링크가 끊어졌다!', '동기화 67%... 조금만 더 하면 됐는데!', '동기화 92%! 거의 다 됐는데!'];
    await say(msgs[Math.min(3, shakes)], { auto: 1000 });
    return null;
  }
  throwCore(from, to, id, ms, arc = 180, trail = false, back = false) {
    if (!back || !this.ball) this.ball = { x: from.x, y: from.y, id, rot: 0, t: 0 };
    Audio2.sfx('whoosh', 0.6);
    const b = this.ball, sx = from.x, sy = from.y;
    return new Promise(res => {
      let t = 0;
      Tick.add(dt => {
        t += dt * 1000; const p = clamp(t / ms, 0, 1), e = back ? Ease.inQuad(p) : Ease.outCubic(p);
        b.x = lerp(sx, to.x, e); b.y = lerp(sy, to.y, e) - Math.sin(p * Math.PI) * arc; b.rot += dt * (trail ? 6 : 14);
        // 링크 코어는 빛 꼬리를 남긴다
        if (trail) for (let k = 0; k < 2; k++) Particles.add({ x: b.x + (Math.random() - 0.5) * 8, y: b.y + (Math.random() - 0.5) * 8, life: 0.28, size: 5 - k * 2, color: k ? '#ffffff' : '#5ff4ff', add: true, drag: 0.9 });
        if (p >= 1) { b.rot = 0; if (back) this.ball = null; res(); return false; }
      });
    });
  }
  // 링크에 저항하며 버둥거린다 (단계가 오를수록 세게)
  struggle(i) { const v = this.foeV, k = 6 + i * 3; return (async () => { for (let j = 0; j < 3; j++) { await tween(v, { x: k }, 50); await tween(v, { x: -k }, 70); } await tween(v, { x: 0 }, 50); })(); }
  // 구속 고리 · 연결선 · 동기화 게이지
  drawLink() {
    const L = this.link; if (!L || L.a <= 0) return;
    L.t += FRAME_DT;
    const { cx, cy, fr } = L, fail = L.state === 'fail', ok = L.state === 'ok';
    const col = fail ? '255,90,106' : ok ? '255,236,140' : '95,244,255';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 몸을 감싸는 고리 세 개: 동기화가 오를수록 조여 들고, 서로 반대로 돈다
    const rw = fr.w * (0.62 - 0.14 * L.prog), rh = rw * 0.22;
    for (let k = 0; k < 3; k++) {
      const yy = fr.y + fr.h * (0.28 + k * 0.22), rot = L.t * (k % 2 ? -1.6 : 1.3);
      ctx.save(); ctx.translate(cx, yy); ctx.globalAlpha = L.a * (0.55 + 0.45 * L.pulse);
      ctx.strokeStyle = 'rgba(' + col + ',0.95)'; ctx.lineWidth = 2.5 + 2 * L.pulse; ctx.setLineDash([22, 10]); ctx.lineDashOffset = rot * 40;
      ctx.beginPath(); ctx.ellipse(0, 0, rw * (1 - k * 0.08), rh, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = L.a * 0.18; ctx.lineWidth = 9; ctx.stroke(); ctx.restore();
    }
    // 코어 → 대상 빛줄기 (데이터가 흘러 들어가는 점선)
    const b = this.ball;
    if (b && !fail) {
      ctx.globalAlpha = L.a; ctx.strokeStyle = 'rgba(' + col + ',0.9)'; ctx.lineWidth = 3;
      ctx.setLineDash([6, 9]); ctx.lineDashOffset = -L.t * 120;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = L.a * 0.25; ctx.lineWidth = 10; ctx.stroke();
    }
    ctx.restore();
    // 동기화 게이지 (대상 머리 위)
    L.shown += (L.prog - L.shown) * Math.min(1, FRAME_DT * 10);
    const gw = 190, gx = cx - gw / 2, gy = Math.max(70, fr.y - 18);
    ctx.save(); ctx.globalAlpha = L.a;
    ctx.fillStyle = 'rgba(4,14,28,0.82)'; ctx.fillRect(gx - 8, gy - 26, gw + 16, 44);
    ctx.strokeStyle = 'rgba(' + col + ',0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(gx - 8, gy - 26, gw + 16, 44);
    const label = fail ? 'LINK LOST' : ok ? 'LINK ESTABLISHED' : 'LINK SYNC';
    txt(label, gx, gy - 8, { size: 14, weight: 900, color: 'rgb(' + col + ')' });
    txt(Math.round(L.shown * 100) + '%', gx + gw, gy - 8, { size: 14, weight: 900, align: 'right', color: '#fff' });
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(gx, gy, gw, 8);
    const jit = fail ? (Math.random() - 0.5) * 10 : 0;
    ctx.fillStyle = 'rgb(' + col + ')'; ctx.fillRect(gx + jit, gy, gw * L.shown, 8);
    ctx.restore();
  }

  // ---------------- 경험치 / 레벨업 ----------------
  async giveExp(foe, caught) {
    const trainerMul = this.kind === 'trainer' ? 1.5 : 1;
    // 난이도 보정: 쉬움은 경험치를 더, 어려움은 덜 줘서 상대 레벨 차이로 보상이 뒤집히지 않게 한다
    const diffMul = [1.25, 1, 0.8][Settings.difficulty] || 1;
    const base = Math.floor(foe.species.exp * foe.level / 4 * trainerMul * diffMul * (this.o.expMul || 1));
    const alive = Game.party.filter(p => p.hp > 0);
    const part = [...this.participants].filter(p => p.hp > 0 && Game.party.includes(p));
    for (const m of alive) {
      const share = part.includes(m) ? base : Math.floor(base * 0.5);
      if (share <= 0 || m.level >= 100) continue;
      if (part.includes(m)) await say(J(m.name, '은') + ' 경험치 ' + J(String(share), '을') + ' 얻었다!', { auto: 700 });
      await this.addExp(m, share);
    }
    const others = alive.filter(m => !part.includes(m));
    if (others.length && !caught) await say('부대 학습 장치로 다른 부대원들도 경험치를 얻었다!', { auto: 800 });
    this.participants = new Set([this.me].filter(Boolean));
  }
  async addExp(m, amount) {
    let left = amount;
    while (left > 0 && m.level < 100) {
      const need = expForLevel(m.level + 1) - m.exp;
      const step = Math.min(need, left);
      const fromR = m.expRatio();
      m.exp += step; left -= step;
      if (m === this.me) {
        const toR = m.exp >= expForLevel(m.level + 1) ? 1 : m.expRatio();
        this.hudMe.exp = fromR;
        let tt = 0; const ex = this.hudMe;
        await new Promise(res => Tick.add(dt => { tt += dt; ex.exp = lerp(fromR, toR, Math.min(1, tt / 0.6)); if (Math.random() < 0.5) Audio2.expTick(); if (tt >= 0.6) { res(); return false; } }));
      }
      if (m.exp >= expForLevel(m.level + 1)) await this.levelUp(m);
    }
  }
  async levelUp(m) {
    const before = [m.maxHp, m.atk, m.def, m.spd];
    const oldMax = m.maxHp;
    m.level++;
    m.recalc();
    m.hp += m.maxHp - oldMax;
    if (m === this.me) { this.hudMe.hp = m.hp; this.hudMe.exp = 0; this.meV.flash = 1; tween(this.meV, { flash: 0 }, 500); this.burst(this.mePos(), ['#ffe14d', '#fff'], 24, 220); }
    Audio2.sfx('levelup', 0.8);
    const after = [m.maxHp, m.atk, m.def, m.spd];
    this.levelPanel = { m, before, after, t: 0 };
    await say(J(m.name, '은') + ' 레벨 ' + m.level + '에 도달했다!');
    this.levelPanel = null;
    await Game.learnMovesAt(m, m.level);
    if (m.canPromote() || m.canEvolve()) Game.pendingPromote.add(m);
  }

  // ---------------- 종료 ----------------
  async finish(res) {
    this.mode = 'none';
    if (window.BFX) setTimeout(() => { if (!(Scene instanceof Battle) || Scene === this) BFX.clear(); }, 1500);
    if (res === 'win') {
      Audio2.stopBgm(200);
      Audio2.sfx('win_jingle', 0.75); Audio2.sfx('win_sfx', 0.5);
      if (this.kind === 'trainer') {
        this.trV.x = 420; this.trV.a = 1;
        await tween(this.trV, { x: 0 }, 500, Ease.outCubic);
        await say(J(this.trainer.title + ' ' + this.trainer.name, '과') + '의 승부에서 이겼다!', { auto: 1100 });
        if (this.trainer.lose) await say(this.trainer.lose, { speaker: this.trainer.name });
        const prize = Math.floor((this.trainer.prize || 0) * ([1.25, 1, 0.8][Settings.difficulty] || 1));
        if (prize) { Game.money += prize; Audio2.sfx('coin', 0.7); await say('사령관은 상금으로 ' + prize.toLocaleString() + ' P를 받았다!', { auto: 1200 }); }
      } else {
        const money = Math.floor(this.foes.reduce((s, f) => s + f.level * 12, 0) * ([1.25, 1, 0.8][Settings.difficulty] || 1));
        if (money) { Game.money += money; Audio2.sfx('coin', 0.6); await say('폭주를 진압하고 보급품 ' + money + ' P를 회수했다!', { auto: 1000 }); }
      }
      if (this.me && this.me.hp > 0) Audio2.voice(this.me.voiceKey || this.me.key, 'mvp', 0.9);
    }
    if (res === 'lose') {
      Audio2.stopBgm(300);
      await say('사령관의 부대는 모두 전투불능이 되었다...', { auto: 1200 });
      const lost = defeatCost(Game.money, Game.badges.length);
      Game.money -= lost;
      await say('눈앞이 캄캄해졌다...' + (lost ? '  (자원 ' + lost + ' P를 잃었다)' : ''), { auto: 1600 });
    }
    // 전투 종료 시 능력 단계 초기화 / 동결 해제는 유지
  }

  // ---------------- 연출 ----------------
  burst(p, colors, n = 20, speed = 240) { Particles.burst(p.x, p.y, n, { speed, size: 6, life: 0.6, color: colors, drag: 0.92, add: true }); }
  // 특성 발동 표시
  traitPop(side, k) {
    this._tp = this._tp || {}; if (this._tp[side + k]) return; this._tp[side + k] = 1;
    const p = side === 'me' ? this.mePos() : this.foePos(), T = TRAITS[k];
    this.shapes.push({ type: 'num', x: p.x, y: p.y - 110, text: '◆ ' + T.name, color: k === 'rally' ? '#ff9f43' : '#7cf0ff', size: 22, t: -0.25, life: 1.1 });
    if (window.BFX && BFX.ok) BFX.ring(p.x, p.y, 30, 120, k === 'rally' ? 0xff9f43 : 0x7cf0ff, 0.4);
  }
  popNumber(side, dmg, eff, crit) {
    const p = side === 'me' ? this.mePos() : this.foePos();
    this.shapes.push({ type: 'num', x: p.x + rand(-30, 30), y: p.y - 40, text: String(dmg), color: crit ? '#ffe14d' : eff > 1 ? '#ff6b6b' : eff < 1 ? '#9fb3c8' : '#fff', size: crit ? 46 : eff > 1 ? 40 : 34, t: 0, life: 0.9 });
  }
  hitReact(side, type, eff, crit) {
    const v = this.view(side);
    v.flash = 1; tween(v, { flash: 0 }, 300);
    const base = v.x;
    let k = 0; Tick.add(dt => { k += dt; v.x = base + Math.sin(k * 60) * 10 * (1 - k / 0.35); if (k >= 0.35) { v.x = base; return false; } });
    FX.doShake(eff > 1 || crit ? 12 : 5, eff > 1 || crit ? 0.35 : 0.2);
    if (eff > 1 || crit || this.ordering) {
      window.HITSTOP = crit || this.ordering ? 0.08 : 0.05;
      const tp = side === 'me' ? this.mePos() : this.foePos(); this.zoomAt = tp; this.zoom = crit || this.ordering ? 1.08 : 1.05; tween(this, { zoom: 1 }, 320, Ease.outCubic);
    }
    const snd = { phys: 'hit_gun', light: 'hit_slash', heavy: 'hit_smash', air: 'hit_gun_big', fire: 'hit_fire', ice: 'hit_ice', elec: 'hit_elec' }[type] || 'hit_phy';
    Audio2.sfx(snd, 0.8, rand(0.92, 1.08));
    if (eff > 1) Audio2.sfx('hit_phy_big', 0.5);
    const p = side === 'me' ? this.mePos() : this.foePos();
    const col = TYPES[type].color;
    if (window.BFX && BFX.ok) {
      BFX.hit(p.x, p.y, col, crit || eff > 1 ? 1.6 : 1.1);
      BFX.sparks(p.x, p.y, col, crit ? 22 : 12, crit ? 6 : 4);
      if (crit || eff > 1) BFX.baked(crit ? 'skill_hit_simple' : 'hnadgun_hit', p.x, p.y, crit ? 1.3 : 1.1, side === 'me');
      if (crit) BFX.ring(p.x, p.y, 20, 160, 0xffe14d, 0.35);
    } else {
      Particles.burst(p.x, p.y, crit ? 30 : 18, { speed: 320, size: 5, life: 0.45, color: [col, '#fff'], drag: 0.9, add: true });
      Particles.add({ x: p.x, y: p.y, size: 20, life: 0.35, color: col, shape: 'ring', grow: 3, add: true });
    }
  }
  fxHeal(side) {
    const p = side === 'me' ? this.mePos() : this.foePos();
    for (let i = 0; i < 26; i++) Particles.add({ x: p.x + rand(-80, 80), y: p.y + rand(0, 120), vy: rand(-140, -60), size: rand(5, 9), life: rand(0.6, 1.1), color: pick(['#5dff9c', '#c8ffde', '#fff']), shape: 'square', rot: 0.78, add: true });
  }
  fxSpark(p) {
    Audio2.sfx('spark', 0.6);
    for (let i = 0; i < 3; i++) this.shapes.push({ type: 'bolt', x1: p.x + rand(-60, 60), y1: p.y - 80, x2: p.x + rand(-40, 40), y2: p.y + 60, t: i * -0.05, life: 0.25, color: '#ffe14d', w: 3 });
  }
  fxArrows(p, up) {
    for (let i = 0; i < 10; i++) this.shapes.push({ type: 'arrow', x: p.x + rand(-90, 90), y: p.y + (up ? rand(40, 140) : rand(-120, -20)), vy: up ? -180 : 180, t: -i * 0.04, life: 0.7, color: up ? '#ff9f43' : '#5aa9ff' });
  }
  fxDrain(from, to) {
    const a = from === 'me' ? this.mePos() : this.foePos(), b = to === 'me' ? this.mePos() : this.foePos();
    for (let i = 0; i < 18; i++) {
      const sx = a.x + rand(-40, 40), sy = a.y + rand(-40, 40);
      this.shapes.push({ type: 'orb', sx, sy, ex: b.x, ey: b.y, t: -i * 0.03, life: 0.6, color: '#ff4d7a', size: 7 });
    }
  }
  // Same projectile geometry in WebGL and Canvas fallback. A short tracer travels
  // from the visible weapon socket; impact starts only once it arrives.
  async fireShot(side, tSide, fx, type, spread = 5) {
    const target = BattleArt.point(this,tSide,'hit'), f = BattleArt.frame(this,tSide);
    const r = Math.min(spread, f.w*.045, 12);
    const q = {x:target.x+rand(-r,r),y:target.y+rand(-r,r)};
    const from = BattleArt.flash(this,side,q,fx,type);
    const gun = BattleArt.frame(this,side).profile.kind==='gun';
    Audio2.sfx(gun?'atk_rifle':'atk_energy',.55);
    this.shapes.push({type:'tracer',x1:from.x,y1:from.y,x2:q.x,y2:q.y,t:0,life:.115,color:gun?'#ffe9a8':TYPES[type].color});
    await wait(115);
    if(window.BFX && BFX.ok) BFX.baked('hnadgun_hit',q.x,q.y,.45,tSide==='me') || BFX.hit(q.x,q.y,TYPES[type].color,.5);
    else Particles.burst(q.x,q.y,8,{speed:100,size:3,life:.2,color:gun?'#ffe9a8':TYPES[type].color,add:true});
  }
  async meleeFx(fx,side,tSide,type) {
    const back=await BattleArt.approach(this,side,tSide), target=this.fxTarget(tSide);
    try {
      const n=fx==='slash3'?3:1;
      for(let i=0;i<n;i++) {
        Audio2.sfx(fx==='dash'||fx==='smash'?'hit_smash':'atk_swing',.65);
        this.shapes.push({type:fx==='bite'?'bite':'slash',x:target.x+rand(-6,6),y:target.y+rand(-6,6),r:fx==='smash'?40:58,a0:-2.5+i*.9,t:0,life:.22,color:fx==='bite'?'#ff778b':'#e9fbff'});
        if(window.BFX && BFX.ok) BFX.hit(target.x,target.y,TYPES[type].color,.55);
        await wait(n>1?85:150);
      }
    } finally { await back(); }
  }
  async playFx(fx, side, tSide, type, isAtk) {
    if (fx === 'shininghand' && !(window.BFX && BFX.ok)) fx = 'dash'; // 3D 연출을 못 쓰면 돌진으로
    if (['slash','slash3','bite','dash','smash'].includes(fx)) return this.meleeFx(fx,side,tSide,type);
    if (window.BFX && BFX.ok) return this.playFx3(fx, side, tSide, type, isAtk);
    const A = this.fxOrigin(side, fx);
    const B = this.fxTarget(tSide);
    const col = TYPES[type].color;
    const uv = this.view(side);
    const proj = (o) => new Promise(res => {
      const from={x:A.x,y:A.y}, to=o.to || {x:B.x,y:B.y};
      BattleArt.flash(this,side,to,fx,type);
      const s = { type: o.kind || 'proj', x: from.x, y: from.y, t: 0, life: 99, color: o.color || col, size: o.size || 8 };
      this.shapes.push(s);
      let t = 0;
      Tick.add(dt => {
        t += dt * 1000; const p = clamp(t / o.ms, 0, 1);
        s.x = lerp(from.x, to.x, p) + (o.wob ? Math.sin(p * 20) * o.wob : 0);
        s.y = lerp(from.y, to.y, p) - Math.sin(p * Math.PI) * (o.arc || 0);
        if (o.trail) Particles.add({ x: s.x, y: s.y, size: o.size * 0.8, life: 0.3, color: pick(o.trail), add: true, vx: rand(-20, 20), vy: rand(-20, 20) });
        if (p >= 1) { s.life = 0; res(); return false; }
      });
    });
    switch (fx) {
      case 'bullet':
        for(let i=0;i<3;i++) await this.fireShot(side,tSide,fx,type,5);
        break;
      case 'bullets': {
        const shots=[];
        for(let i=0;i<7;i++){shots.push(this.fireShot(side,tSide,fx,type,12));await wait(55);}
        await Promise.all(shots); break;
      }
      case 'snipe':
        Audio2.sfx('charge', 0.4); await wait(250); BattleArt.flash(this,side,B,fx,type); Audio2.sfx('atk_rifle', 0.9);
        this.shapes.push({ type: 'beam', x1: A.x, y1: A.y, x2: B.x, y2: B.y, t: 0, life: 0.25, color: '#fff', w: 3 });
        FX.doFlash('#fff', 0.35); await wait(80); break;
      case 'shell':
        Audio2.sfx('atk_rifle', 0.7); await proj({ ms: 420, arc: 140, size: 9, color: '#ffd76a', trail: ['#888', '#bbb'] });
        Audio2.sfx('explosion', 0.6); this.explode(B, 1); break;
      case 'barrage':
        for (let i = 0; i < 4; i++) { Audio2.sfx('atk_rifle', 0.5); const q={x:B.x+rand(-14,14),y:B.y+rand(-12,12)}; proj({ to:q, ms: 380, arc: 120 + i * 30, size: 8, color: '#ffd76a', trail: ['#888'] }).then(() => this.explode(q, 0.8)); await wait(110); }
        await wait(380); Audio2.sfx('explosion_big', 0.7); FX.doShake(14, 0.4); break;
      case 'beam': case 'icebeam': case 'plasma':
        Audio2.sfx('charge', 0.5);
        for (let i = 0; i < 16; i++) Particles.add({ x: A.x + rand(-70, 70), y: A.y + rand(-70, 70), vx: 0, vy: 0, size: 5, life: 0.4, color: col, add: true });
        await wait(300);
        Audio2.sfx(fx === 'icebeam' ? 'ice' : 'atk_laser', 0.8);
        this.shapes.push({ type: 'beam', x1: A.x, y1: A.y, x2: B.x, y2: B.y, t: 0, life: 0.45, color: fx === 'beam' ? '#7ff6ff' : col, w: fx === 'beam' ? 22 : 14 });
        await wait(250); if (fx === 'beam') this.explode(B, 1.2); break;
      case 'dive':
        Audio2.sfx('whoosh', 0.8);
        await tween(uv, { dy: -260, a: 0.2 }, 220, Ease.inQuad);
        this.shapes.push({ type: 'streak', x: B.x, y: B.y, t: 0, life: 0.3, color: col });
        await wait(120); uv.dy = 0; tween(uv, { a: 1 }, 200); break;
      case 'bombs':
        Audio2.sfx('whoosh', 0.6);
        for (let i = 0; i < 5; i++) { const tx = B.x + rand(-80, 80), ty = B.y + rand(-30, 50); this.shapes.push({ type: 'drop', x: tx, y: ty - 400, ty, t: 0, life: 0.35, color: '#333' }); setTimeout(() => { this.explode({ x: tx, y: ty }, 0.9); Audio2.sfx('explosion', 0.45); }, 330); await wait(90); }
        await wait(400); FX.doShake(12, 0.35); break;
      case 'flame':
        BattleArt.flash(this,side,B,fx,type);
        Audio2.sfx('flame', 0.7);
        for (let i = 0; i < 40; i++) { const p = Particles.add({ x: A.x, y: A.y, vx: (B.x - A.x) * rand(1.3, 1.8), vy: (B.y - A.y) * rand(1.3, 1.8) + rand(-60, 60), size: rand(8, 16), life: 0.6, color: pick(['#ff7a45', '#ffd34d', '#ff3d1f']), add: true, drag: 0.97 }); if (i % 4 === 0) await wait(16); }
        await wait(260); break;
      case 'fireball':
        Audio2.sfx('fireball', 0.7); await proj({ ms: 380, arc: 40, size: 18, color: '#ff8a3d', trail: ['#ff7a45', '#ffd34d', '#ff3d1f'] });
        this.explode(B, 1, ['#ff7a45', '#ffd34d']); break;
      case 'napalm':
        Audio2.sfx('fireball', 0.8); await proj({ ms: 360, arc: 160, size: 14, color: '#ff8a3d', trail: ['#ff7a45', '#ffd34d'] });
        Audio2.sfx('explosion_big', 0.7); FX.doFlash('#ff7a45', 0.5); FX.doShake(14, 0.4);
        for (let i = 0; i < 70; i++) Particles.add({ x: B.x + rand(-120, 120), y: B.y + rand(-20, 80), vx: rand(-40, 40), vy: rand(-260, -80), size: rand(10, 22), life: rand(0.5, 1), color: pick(['#ff7a45', '#ffd34d', '#ff3d1f', '#5a1a00']), add: true });
        await wait(250); break;
      case 'ice':
        Audio2.sfx('ice', 0.6);
        for (let i = 0; i < 3; i++) { proj({ ms: 300, size: 10, kind: 'shard', color: '#bff6ff', trail: ['#7fe3f0', '#fff'] }); await wait(80); }
        await wait(260); break;
      case 'blizzard':
        Audio2.sfx('ice', 0.9); FX.doFlash('#bff6ff', 0.45);
        for (let i = 0; i < 80; i++) { const a = rand(0, 6.28), r = rand(80, 200); Particles.add({ x: B.x + Math.cos(a) * r, y: B.y + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * r * 2, vy: -Math.sin(a) * r * 1.2, size: rand(4, 9), life: 0.55, color: pick(['#ffffff', '#bff6ff', '#7fe3f0']), shape: 'square', rot: a, vr: 8, add: true }); }
        await wait(420); break;
      case 'spark':
        Audio2.sfx('atk_elec', 0.7);
        for (let i = 0; i < 3; i++) { this.shapes.push({ type: 'bolt', x1: A.x, y1: A.y, x2: B.x + rand(-30, 30), y2: B.y + rand(-30, 30), t: 0, life: 0.18, color: '#ffe14d', w: 3 }); await wait(70); }
        break;
      case 'thunder':
        Audio2.sfx('lightning', 0.9); FX.doFlash('#fff7b0', 0.7);
        for (let i = 0; i < 3; i++) this.shapes.push({ type: 'bolt', x1: B.x + rand(-30, 30), y1: -20, x2: B.x + rand(-20, 20), y2: B.y, t: -i * 0.06, life: 0.35, color: '#fff27a', w: 7 });
        await wait(300); FX.doShake(12, 0.35); break;
      case 'acid':
        Audio2.sfx('water', 0.7);
        for (let i = 0; i < 4; i++) { proj({ ms: 380, arc: 100 + i * 20, size: 9, color: '#a64dff', trail: ['#7d2aff', '#ff4d7a'] }); await wait(70); }
        await wait(300); break;
      case 'drain':
        Audio2.sfx('atk_energy', 0.6); this.shapes.push({ type: 'slash', x: B.x, y: B.y, r: 70, a0: -2.2, t: 0, life: 0.25, color: '#ff4d7a' }); await wait(200); break;
      case 'wave':
        Audio2.sfx('atk_energy', 0.7);
        for (let i = 0; i < 5; i++) { this.shapes.push({ type: 'wave', x1: A.x, y1: A.y, x2: B.x, y2: B.y, t: -i * 0.08, life: 0.5, color: col }); }
        await wait(500); break;
      case 'buff': Audio2.sfx('charge', 0.5); for (let i = 0; i < 20; i++) Particles.add({ x: A.x + rand(-70, 70), y: A.y + rand(0, 100), vy: rand(-200, -80), size: rand(4, 8), life: 0.7, color: pick(['#ffb22e', '#fff']), add: true }); await wait(300); break;
      case 'debuff': Audio2.sfx('atk_rifle', 0.5); this.shapes.push({ type: 'tracer', x1: A.x, y1: A.y, x2: B.x, y2: B.y, t: 0, life: 0.12, color: '#ffe9a8' }); await wait(200); break;
      case 'shield': Audio2.sfx('shield', 0.7); this.shapes.push({ type: 'hex', x: A.x, y: A.y, t: 0, life: 0.7, color: '#5ff4ff' }); await wait(350); break;
      case 'heal': Audio2.sfx('heal', 0.7); await wait(100); break;
      case 'smoke': Audio2.sfx('whoosh', 0.6); for (let i = 0; i < 30; i++) Particles.add({ x: B.x + rand(-80, 80), y: B.y + rand(-40, 60), vx: rand(-30, 30), vy: rand(-40, 0), size: rand(18, 34), life: rand(0.8, 1.3), color: 'rgba(200,210,220,0.5)' }); await wait(400); break;
      default: await wait(200);
    }
  }
  explode(p, s = 1, colors) {
    Particles.burst(p.x, p.y, Math.floor(28 * s), { speed: 300 * s, size: 10 * s, life: 0.55, color: colors || ['#ffd34d', '#ff7a45', '#fff', '#555'], drag: 0.9, add: true });
    Particles.add({ x: p.x, y: p.y, size: 26 * s, life: 0.4, color: '#ffd34d', shape: 'ring', grow: 3, add: true });
  }

  // ---------------- 그리기 ----------------
  draw() {
    const [ox, oy] = FX.offset();
    ctx.save(); ctx.translate(ox, oy);
    if (this.zoom && this.zoom !== 1 && this.zoomAt) { const z = this.zoom, zx = this.zoomAt.x, zy = this.zoomAt.y; ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy); }
    // 배경
    if (this.bg && !this.bg._bad) {
      const s = Math.max(W / this.bg.width, H / this.bg.height);
      ctx.drawImage(this.bg, (W - this.bg.width * s) / 2, (H - this.bg.height * s) / 2 - 40, this.bg.width * s, this.bg.height * s);
    } else { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, W, H); }
    const vg = ctx.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(0,10,30,0.15)'); vg.addColorStop(0.6, 'rgba(0,10,30,0.25)'); vg.addColorStop(1, 'rgba(0,8,20,0.75)');
    ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, H + 40);
    // 발판
    this.platform(FOE_BOX.cx + this.foeV.x * 0, FOE_BOX.base, 210, 46, this.introT);
    this.platform(ME_BOX.cx, ME_BOX.base - 90, 250, 54, this.introT);
    // 트레이너
    if (this.trainer && this.trV.a > 0) drawFit(IMG.full[this.trainer.portrait], FOE_BOX.cx - FOE_BOX.w / 2 + this.trV.x, FOE_BOX.base + 18 - FOE_BOX.h, FOE_BOX.w, FOE_BOX.h, { anchor: 'bottom', alpha: this.trV.a, flip: typeof artFlip === 'function' && artFlip(this.trainer.portrait, 'L') });
    // 유닛
    if(this._fxActor==='foe') {
      if(this.me) this.drawMon(this.me,this.meV,ME_BOX,true);
      this.drawMon(this.foe,this.foeV,FOE_BOX,false);
    } else {
      this.drawMon(this.foe,this.foeV,FOE_BOX,false);
      if(this.me) this.drawMon(this.me,this.meV,ME_BOX,true);
    }
    if (this.cmdV.x > -440) drawCommanderBig(ME_BOX.cx - 10 + this.cmdV.x, H + 30, 1.3, 'back');
    // 코어
    this.drawLink();
    if (this.ball) {
      ctx.save(); ctx.translate(this.ball.x, this.ball.y + (this.ball.hover ? Math.sin(Tick.time * 5) * 4 : 0)); ctx.rotate(this.ball.rot || 0);
      if (this.ball.glow || this.ball.hover) { ctx.shadowColor = this.ball.glow ? '#ffe14d' : '#5ff4ff'; ctx.shadowBlur = 22; }
      itemIcon(this.ball.id, 0, 0, 34); ctx.restore();
    }
    this.drawShapes();
    Particles.draw();
    if (window.BFX && BFX.ok) { BFX.update(FRAME_DT); BFX.draw(); }
    ctx.restore();
    // HUD
    this.drawHudFoe(); this.drawHudMe();
    if (this.kind === 'trainer') this.drawTeamDots();
    // 명령 메뉴
    if (this.mode === 'command') this.drawCommand();
    if (this.mode === 'move') this.drawMoves();
    if (this.levelPanel) this.drawLevelPanel();
    if (this.cut) this.drawCutIn();
    FX.drawFlash();
  }
  platform(cx, cy, rx, ry, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
    g.addColorStop(0, 'rgba(120,230,255,0.45)'); g.addColorStop(0.7, 'rgba(40,120,170,0.35)'); g.addColorStop(1, 'rgba(10,30,60,0.0)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(140,240,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.86, ry * 0.86, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -Tick.time * 30; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  drawMon(m, v, box, mine) {
    if (!m || !v.show || v.a <= 0) return;
    const frame=BattleArt.layout(m,v,box,mine), {img,flip,x,y,w:dw,h:dh}=frame;
    if(!img || img._bad) return;
    ctx.save();
    ctx.globalAlpha = v.a;
    // 그림자
    ctx.save(); ctx.globalAlpha = 0.35 * v.a; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(box.cx + v.x, (mine ? box.base - 70 : box.base + 12) + v.dy, dw * 0.32, 14, 0, 0, 7); ctx.fill(); ctx.restore();
    if (flip) { ctx.translate(x + dw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + dw / 2), 0); }
    ctx.drawImage(img, x, y, dw, dh);
    if (v.flash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      // 오프스크린 없이 밝게: lighter로 한 번 더
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = v.a * v.flash * 0.8;
      ctx.drawImage(img, x, y, dw, dh);
    }
    ctx.restore();
  }
  drawShapes() {
    const dt = FRAME_DT;
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      s.t += dt; if (s.t >= s.life) { this.shapes.splice(i, 1); continue; }
      if (s.t < 0) continue;
      const k = s.t / s.life;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (s.type === 'sourceflash') {
        ctx.translate(s.x,s.y);ctx.rotate(s.a);ctx.globalAlpha=1-k;
        if(s.gun) {
          ctx.fillStyle=s.color;ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(s.size*1.5,-s.size*.32);ctx.lineTo(s.size,0);ctx.lineTo(s.size*1.5,s.size*.32);ctx.closePath();ctx.fill();
          ctx.fillStyle='#fff9df';ctx.beginPath();ctx.ellipse(s.size*.35,0,s.size*.55,s.size*.19,0,0,7);ctx.fill();
        } else {
          ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s.size*(.4+k),0,7);ctx.stroke();
          ctx.fillStyle='#e9fbff';ctx.beginPath();ctx.arc(0,0,3*(1-k),0,7);ctx.fill();
        }
      } else if (s.type === 'num') {
        ctx.globalCompositeOperation = 'source-over';
        const yy = s.y - Ease.outCubic(Math.min(1, k * 2)) * 50;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        txt(s.text, s.x, yy, { size: s.size, weight: 900, align: 'center', color: s.color, stroke: 6, strokeColor: '#1a0a14', shadow: false, family: TITLE_FONT });
      } else if (s.type === 'tracer') {
        ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k;
        ctx.beginPath(); const p = Math.min(1, k); ctx.moveTo(lerp(s.x1, s.x2, Math.max(0, p - 0.20)), lerp(s.y1, s.y2, Math.max(0, p - 0.20))); ctx.lineTo(lerp(s.x1, s.x2, p), lerp(s.y1, s.y2, p)); ctx.stroke();
      } else if (s.type === 'beam') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.color; ctx.lineCap = 'round';
        ctx.lineWidth = s.w * (1 + Math.sin(s.t * 60) * 0.2); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = s.w * 0.35; ctx.stroke();
      } else if (s.type === 'slash') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.color; ctx.lineWidth = 10 * (1 - k) + 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, s.a0, s.a0 + Ease.outCubic(Math.min(1, k * 3)) * 2.2); ctx.stroke();
      } else if (s.type === 'bite') {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = s.color; const g = (1 - Math.min(1, k * 3)) * 60;
        for (const dir of [-1, 1]) { ctx.beginPath(); for (let j = 0; j < 5; j++) { ctx.lineTo(s.x - 60 + j * 30, s.y + dir * g); ctx.lineTo(s.x - 45 + j * 30, s.y + dir * (g - 26)); } ctx.lineTo(s.x + 90, s.y + dir * g); ctx.closePath(); ctx.fill(); }
      } else if (s.type === 'bolt') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.color; ctx.lineWidth = s.w; ctx.shadowColor = s.color; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1);
        const n = 8; for (let j = 1; j < n; j++) { const p = j / n; ctx.lineTo(lerp(s.x1, s.x2, p) + rand(-18, 18), lerp(s.y1, s.y2, p) + rand(-8, 8)); }
        ctx.lineTo(s.x2, s.y2); ctx.stroke();
      } else if (s.type === 'proj' || s.type === 'shard') {
        ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 18;
        if (s.type === 'shard') { ctx.translate(s.x, s.y); ctx.rotate(Tick.time * 10); ctx.fillRect(-s.size, -s.size / 3, s.size * 2, s.size / 1.5); }
        else { ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 7); ctx.fill(); }
      } else if (s.type === 'streak') {
        ctx.globalAlpha = 1 - k; const g = ctx.createLinearGradient(s.x, s.y - 400, s.x, s.y); g.addColorStop(0, 'transparent'); g.addColorStop(1, s.color);
        ctx.fillStyle = g; ctx.fillRect(s.x - 26 * (1 - k), s.y - 400, 52 * (1 - k), 400);
      } else if (s.type === 'drop') {
        ctx.globalCompositeOperation = 'source-over'; const yy = lerp(s.y, s.ty, Ease.inQuad(k)); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(s.x, yy, 7, 14, 0, 0, 7); ctx.fill();
      } else if (s.type === 'arrow') {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1 - k; ctx.fillStyle = s.color;
        const yy = s.y + s.vy * s.t; ctx.beginPath(); const d = s.vy < 0 ? -1 : 1;
        ctx.moveTo(s.x, yy + d * 14); ctx.lineTo(s.x - 10, yy); ctx.lineTo(s.x - 4, yy); ctx.lineTo(s.x - 4, yy - d * 14); ctx.lineTo(s.x + 4, yy - d * 14); ctx.lineTo(s.x + 4, yy); ctx.lineTo(s.x + 10, yy); ctx.closePath(); ctx.fill();
      } else if (s.type === 'orb') {
        const p = Ease.inOutQuad(k); ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(lerp(s.sx, s.ex, p), lerp(s.sy, s.ey, p) - Math.sin(p * Math.PI) * 60, s.size, 0, 7); ctx.fill();
      } else if (s.type === 'wave') {
        const p = k; ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(lerp(s.x1, s.x2, p), lerp(s.y1, s.y2, p), 20 + p * 70, 0, 7); ctx.stroke();
      } else if (s.type === 'hex') {
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(95,244,255,0.15)';
        const r = 120 + k * 20; ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = Math.PI / 3 * j + Math.PI / 6; ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }
  drawHudFoe() {
    const f = this.foe; if (!f || this.hudFoe.a <= 0) return;
    const a = this.hudFoe.a, x = 24 - (1 - a) * 300, y = 34, w = 390, h = 96;
    ctx.save(); ctx.globalAlpha = a;
    panel(x, y, w, h, { c: 12, accent: f.kind === 'boss' || this.kind === 'trainer' ? '#ff4d5e' : UI_COL.line });
    txt(f.name, x + 20, y + 34, { size: 23, weight: 900 });
    if (Game.dex.caught[f.key]) itemIcon('core', x + 30 + measure(f.name, 23, 900), y + 26, 16);
    rankBadge(f.rank, x + w - 112, y + 12, 24);
    txt('Lv.' + f.level, x + w - 18, y + 34, { size: 20, weight: 800, align: 'right', color: UI_COL.accent });
    f.types.forEach((t, k) => typeBadge(t, x + 20 + k * 58, y + 46, 54, 20, 12));
    if (f.status) statusBadge(f.status, x + 140, y + 46);
    txt('HP', x + 20, y + 84, { size: 14, weight: 900, color: UI_COL.accent });
    bar(x + 50, y + 73, w - 70, 13, this.hudFoe.hp / f.maxHp, hpColors(this.hudFoe.hp / f.maxHp));
    ctx.restore();
  }
  drawHudMe() {
    const m = this.me; if (!m || this.hudMe.a <= 0) return;
    const a = this.hudMe.a, x = 540 + (1 - a) * 300, y = ME_BOX.base - 220, w = 400, h = 118;
    ctx.save(); ctx.globalAlpha = a;
    panel(x, y, w, h, { c: 12 });
    txt(m.name, x + 20, y + 34, { size: 23, weight: 900 });
    rankBadge(m.rank, x + w - 112, y + 12, 24);
    txt('Lv.' + m.level, x + w - 18, y + 34, { size: 20, weight: 800, align: 'right', color: UI_COL.accent });
    m.types.forEach((t, k) => typeBadge(t, x + 20 + k * 58, y + 44, 54, 20, 12));
    if (m.status) statusBadge(m.status, x + 140, y + 44);
    txt('HP', x + 20, y + 84, { size: 14, weight: 900, color: UI_COL.accent });
    const r = this.hudMe.hp / m.maxHp;
    bar(x + 50, y + 73, w - 70, 13, r, hpColors(r));
    txt(Math.ceil(this.hudMe.hp) + ' / ' + m.maxHp, x + w - 20, y + 104, { size: 17, weight: 800, align: 'right' });
    txt('EXP', x + 20, y + 106, { size: 11, weight: 900, color: '#7cd9ff' });
    bar(x + 52, y + 99, 200, 6, this.hudMe.exp, ['#7cd9ff', '#2a8bd8']);
    // 사령관 지휘 게이지
    const g = this.cmdG || 0, full = g >= 3;
    txt('지휘', x + w - 132, y + 61, { size: 13, weight: 900, color: full ? '#ffb22e' : UI_COL.sub });
    for (let i = 0; i < 3; i++) {
      const cx = x + w - 92 + i * 22, cy = y + 56, on = i < g;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      if (full) { ctx.shadowColor = '#ffb22e'; ctx.shadowBlur = 8 + 6 * Math.sin(Tick.time * 6); }
      ctx.fillStyle = on ? '#ffb22e' : 'rgba(255,178,46,0.15)'; ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -6, 12, 12); ctx.restore();
    }
    if (r < 0.2 && r > 0) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(Tick.time * 8); chamfer(x, y, w, h, 12); ctx.fillStyle = '#ff2a3a'; ctx.fill(); }
    ctx.restore();
  }
  drawTeamDots() {
    const n = this.foes.length;
    for (let i = 0; i < n; i++) { const alive = this.foes[i].hp > 0; ctx.save(); ctx.globalAlpha = 0.9; itemIcon(alive ? 'core' : 'chip', 40 + i * 26, 150, 18); if (!alive) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(40 + i * 26, 150, 10, 0, 7); ctx.fill(); } ctx.restore(); }
  }
  drawCommand() {
    panel(BOX.x, BOX.y, BOX.w, BOX.h);
    txt(J(this.me.name, '은') + ' 무엇을 할까?', BOX.x + 32, BOX.y + 52, { size: 23, weight: 700 });
    txt(Game.party.map(p => p.hp > 0 ? '●' : '○').join(' '), BOX.x + 32, BOX.y + 96, { size: 16, color: UI_COL.line });
    // 전술 힌트: 상대 타입과 가장 효과적인 기술
    if (this.foe) {
      let best = null, bv = 0;
      for (const mv of this.me.moves) { const d = MOVES[mv.id]; if (d.cat !== 'atk' || mv.pp <= 0) continue; const e0 = typeEff(d.type, this.foe.types); const v = d.pow * e0 * (this.me.types.includes(d.type) ? 1.5 : 1) * (d.acc || 100) / 100 * (e0 > 1 && traitOf(this.foe) === 'heavy' ? 0.75 : 1); if (v > bv) { bv = v; best = d; } }
      let hx = BOX.x + 150; txt('상대', hx, BOX.y + 97, { size: 16, color: UI_COL.sub }); hx += 40;
      this.foe.types.forEach(t => { typeBadge(t, hx, BOX.y + 81, 46, 20, 12); hx += 50; });
      if (best) { const e = typeEff(best.type, this.foe.types); txt('추천 ' + best.name + (e > 1 ? ' ▲' : e < 1 ? ' ▼' : ''), hx + 8, BOX.y + 96, { size: 16, weight: 800, color: e > 1 ? UI_COL.green : e < 1 ? '#ff8a95' : UI_COL.sub }); }
    }
    const labels = [['전투', '#ff6b4a'], ['가방', '#ffb22e'], ['부대', '#5ff4a0'], ['후퇴', '#5fb8ff']];
    this.menuNav.beginDraw();
    labels.forEach(([l, c], i) => {
      const x = 548 + (i % 2) * 196, y = BOX.y + 14 + Math.floor(i / 2) * 62, w = 186, h = 54;
      this.menuNav.rect(i, x, y, w, h);
      const on = i === this.menuNav.i;
      ctx.save();
      chamfer(x, y, w, h, 10);
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, on ? c : 'rgba(30,50,80,0.9)'); g.addColorStop(1, on ? 'rgba(20,30,50,0.95)' : 'rgba(12,22,40,0.95)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = on ? '#fff' : c + '88'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
      ctx.restore();
      txt(l, x + w / 2, y + 36, { size: 24, weight: 900, align: 'center', color: on ? '#fff' : '#cfe6f5' });
    });
  }
  drawMoves() {
    panel(BOX.x, BOX.y, BOX.w, BOX.h);
    const m = this.me;
    this.moveNav.beginDraw();
    m.moves.forEach((mv, i) => {
      const d = MOVES[mv.id];
      const x = BOX.x + 16 + (i % 2) * 310, y = BOX.y + 14 + Math.floor(i / 2) * 62, w = 300, h = 54;
      this.moveNav.rect(i, x, y, w, h);
      const on = i === this.moveNav.i, t = TYPES[d.type];
      ctx.save(); chamfer(x, y, w, h, 10);
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, on ? t.dark : 'rgba(25,40,66,0.95)'); g.addColorStop(1, 'rgba(10,18,34,0.95)');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = on ? t.color : t.color + '55'; ctx.lineWidth = on ? 2.5 : 1.2; ctx.stroke();
      ctx.fillStyle = t.color; ctx.fillRect(x + 2, y + 10, 5, h - 20);
      ctx.restore();
      txt(d.name, x + 20, y + 35, { size: 21, weight: 800, color: mv.pp === 0 ? '#777' : '#fff' });
      if (d.cat === 'atk' && this.foe) { const e = typeEff(d.type, this.foe.types); if (e !== 1) txt(e > 1 ? '▲' : '▼', x + w - 82, y + 34, { size: 16, weight: 900, color: e > 1 ? UI_COL.green : '#ff8a95' }); }
      txt(mv.pp + '/' + d.pp, x + w - 14, y + 35, { size: 16, weight: 700, align: 'right', color: mv.pp === 0 ? UI_COL.red : mv.pp <= d.pp / 4 ? UI_COL.accent : UI_COL.sub });
    });
    // 정보
    const mv = m.moves[this.moveNav.i]; if (!mv) return;
    const d = MOVES[mv.id];
    const ix = BOX.x + 648, iy = BOX.y + 14;
    ctx.fillStyle = 'rgba(56,225,255,0.2)'; ctx.fillRect(ix - 12, iy, 1, BOX.h - 28);
    typeBadge(d.type, ix, iy + 4, 70, 24, 14);
    txt(d.cat === 'atk' ? '위력 ' + d.pow : '변화', ix + 84, iy + 23, { size: 17, weight: 800 });
    txt(d.acc ? '명중 ' + d.acc : '필중', ix + 270, iy + 23, { size: 15, align: 'right', color: UI_COL.sub });
    if (d.cat === 'atk') {
      const e = typeEff(d.type, this.foe.types);
      const lab = e > 1 ? ['효과 굉장!', UI_COL.green] : e < 1 ? ['효과 별로...', '#ff8a95'] : ['보통', UI_COL.sub];
      const stab = m.types.includes(d.type);
      txt(lab[0] + (stab ? '  · 자속' : ''), ix, iy + 58, { size: 18, weight: 800, color: lab[1] });
    }
    if ((this.cmdG || 0) >= 3) {
      const R = this.orderRect = { x: ix - 4, y: iy + 70, w: 280, h: 38 }, on = !!this.order;
      ctx.save(); chamfer(R.x, R.y, R.w, R.h, 8);
      ctx.fillStyle = on ? 'rgba(255,178,46,0.9)' : 'rgba(255,178,46,0.15)'; ctx.fill();
      ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = 1.5 + Math.sin(Tick.time * 6); ctx.stroke(); ctx.restore();
      txt((on ? '◆ 사령관 지휘 ON' : '◇ 사령관 지휘 OFF') + '  [M/Tab]', R.x + R.w / 2, R.y + 25, { size: 16, weight: 900, align: 'center', color: on ? '#1a0a14' : '#ffd27a' });
      if (this.orderWarn > 0) { this.orderWarn -= FRAME_DT; txt('지휘는 공격 기술에만 쓸 수 있다', R.x + R.w / 2, R.y - 8, { size: 13, weight: 800, align: 'center', color: '#ff8a95' }); }
    } else {
      this.orderRect = null;
      wrapText(d.desc, 270, 14, 500).slice(0, 2).forEach((l, k) => txt(l, ix, iy + 84 + k * 20, { size: 14, weight: 500, color: '#b8d4e6' }));
    }
  }
  // 사령관 지휘 컷인
  async orderCutIn(user) {
    this.cut = { t: 0, name: user.name }; Audio2.sfx('charge', 0.7); Audio2.sfx('shine', 0.5);
    tween(this.cut, { t: 1 }, 1100, Ease.linear);
    await wait(500); FX.doFlash('#fff', 0.35); Audio2.voice(user.voiceKey || user.key, 'start', 0.9);
    await say('사령관의 지휘! ' + J(user.name, '의') + ' 다음 공격이 강화되었다!', { auto: 900 });
    this.cut = null;
  }
  drawCutIn() {
    const k = this.cut.t, a = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1, sx = (1 - Math.min(1, k / 0.2)) * -300;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, Math.round((H - 640) / 2));
    ctx.fillStyle = 'rgba(5,15,30,0.82)'; ctx.beginPath(); ctx.moveTo(0, 190); ctx.lineTo(W, 150); ctx.lineTo(W, 330); ctx.lineTo(0, 370); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb22e'; ctx.fillRect(0, 186, W, 3); ctx.fillRect(0, 368, W, 3);
    for (let i = 0; i < 14; i++) { const yy = 200 + i * 12, xx = ((Tick.time * 900 + i * 173) % (W + 300)) - 150; ctx.fillStyle = 'rgba(255,178,46,0.25)'; ctx.fillRect(xx, yy, 120, 2); }
    drawCommanderBust(200 + sx, 300, 1.1);
    txt('사령관 지휘', 360 - sx * 0.5, 250, { size: 44, weight: 900, family: TITLE_FONT, color: '#ffb22e', stroke: 6, strokeColor: '#1a0a14' });
    txt(this.cut.name + ', 지금이야!', 362 - sx * 0.3, 300, { size: 26, weight: 800, color: '#fff' });
    txt('위력 1.5배 · 필중', 362, 336, { size: 18, weight: 700, color: '#7cf0ff' });
    ctx.restore();
  }
  drawLevelPanel() {
    const p = this.levelPanel; p.t += FRAME_DT;
    const a = Ease.outBack(clamp(p.t / 0.25, 0, 1));
    const x = 660, y = 130, w = 270, h = 210;
    ctx.save(); ctx.translate(x + w, y); ctx.scale(a, a); ctx.translate(-(x + w), -y);
    panel(x, y, w, h, { accent: UI_COL.accent });
    txt('LEVEL UP!', x + 20, y + 36, { size: 22, weight: 900, color: UI_COL.accent, family: TITLE_FONT });
    txt(p.m.name + '  Lv.' + p.m.level, x + w - 18, y + 34, { size: 15, weight: 800, align: 'right' });
    STAT_NAMES.forEach((n, k) => {
      const yy = y + 76 + k * 34;
      txt(n, x + 22, yy, { size: 18, color: UI_COL.sub });
      const show = p.t > 1.0;
      txt(String(show ? p.after[k] : p.before[k]), x + 180, yy, { size: 20, weight: 800, align: 'right' });
      if (!show) txt('+' + (p.after[k] - p.before[k]), x + w - 20, yy, { size: 18, weight: 800, align: 'right', color: UI_COL.green });
    });
    ctx.restore();
  }
}
Ease.outBounce = t => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; };
