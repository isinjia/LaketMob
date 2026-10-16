// 세로 필드는 540px 논리 폭으로 확장한다. 전투·타이틀은 기존 화면을 유지한다.
const MobileField = window.MobileField = {
  portrait: false, drag: null, fast: false, touch: matchMedia('(pointer: coarse)').matches,
  enabled() { return this.touch && Settings.touchStyle !== 'buttons'; },
  field() { return typeof Scene !== 'undefined' && Scene === World && !!World.def; },
  dimensions() {
    this.portrait = this.enabled() && innerHeight > innerWidth && this.field();
    W = this.portrait ? 540 : 960;
    H = this.portrait ? Math.round(540 * innerHeight / innerWidth) : 640;
  },
  release() {
    if (!this.drag) return;
    for (const k of ['up','down','left','right','run']) Input.release(k);
    this.drag = null; this.fast = false;
    this.stick.hidden = true;
  },
  pulse(k) { Input.press(k); setTimeout(() => Input.release(k), 90); },
  uiBox() {
    const scale = W / 960;
    const dialog = UI.top() instanceof Dialog || UI.top() instanceof Choice;
    return { scale, y: dialog ? H - 640 * scale - 82 : (H - 640 * scale) / 2 };
  },
  uiPoint(e, r) {
    const b = this.uiBox();
    return { x: (e.clientX-r.left)/r.width*W/b.scale, y: ((e.clientY-r.top)/r.height*H-b.y)/b.scale };
  },
  drawUI() {
    if (!UI.busy()) return;
    const b = this.uiBox(), w = W, h = H;
    ctx.save();
    if (!(UI.top() instanceof Dialog) && !(UI.top() instanceof Choice)) { ctx.fillStyle='rgba(2,4,10,.65)'; ctx.fillRect(0,0,W,H); }
    ctx.translate(0,b.y); ctx.scale(b.scale,b.scale);
    try { W=960; H=640; UI.draw(); } finally { W=w; H=h; ctx.restore(); }
  },
  target() {
    const p = World.player;
    const dirs = [p.dir, ...Object.keys(DIRS).filter(d=>d!==p.dir)];
    for (const dir of dirs) {
      const [dx,dy]=DIRS[dir]; let x=p.x+dx,y=p.y+dy;
      let e=World.entAt(x,y);
      if (!e && TILE_DEF[World.tile(x,y)]?.counter) e=World.entAt(x+dx,y+dy);
      if(e) return {dir,e};
    }
    return null;
  },
  sync() {
    const want=this.enabled() && innerHeight>innerWidth && this.field();
    if (want!==this.portrait) { this.release(); resize(); }
    const modern=this.enabled(), field=modern && this.field(), free=field && !UI.busy() && !World.locked && !Trans.active;
    if (!free) this.release();
    document.body.classList.toggle('modern-field',free);
    document.body.classList.toggle('modern-touch',modern);
    document.body.classList.toggle('portrait-field',this.portrait);
    this.hud.hidden=!modern;
    this.area.hidden=!free;
    const t=free && !World.player.moving ? this.target() : null;
    this.action.hidden=!t;
    this.action.textContent=t ? (['npc','trainer','legend'].includes(t.e.kind)?'대화하기':'조사하기') : '';
    this.back.hidden=!UI.busy();
    this.confirm.hidden=!(UI.top() instanceof Dialog);
    this.menu.hidden=!field || UI.busy();
    this.quest.hidden=!free || !this.portrait || !Settings.questTracker;
    const q=window.Quests && Quests.trackList()[0];
    this.quest.textContent=q ? '◇ '+q.title+'  ·  '+Quests.goalText(q) : '◇ 퀘스트 일지';
  },
  init() {
    const el=document.createElement('div'); el.id='mobile-field';
    el.innerHTML=`<div id="move-zone" aria-label="드래그하여 이동, 멀리 밀면 달리기"></div><div id="floating-stick" hidden><i></i></div><button id="field-menu" aria-label="메뉴">☰</button><button id="field-quest"></button><button id="field-action"></button><button id="field-confirm">계속 ▸</button><button id="field-back">돌아가기</button>`;
    document.body.appendChild(el); this.hud=el;
    const get=id=>document.getElementById(id);
    this.area=get('move-zone'); this.stick=get('floating-stick'); this.menu=get('field-menu'); this.quest=get('field-quest'); this.action=get('field-action'); this.back=get('field-back'); this.confirm=get('field-confirm');
    this.menu.onclick=()=>{this.release();this.pulse('menu');};
    this.quest.onclick=()=>{this.release();UI.push(new QuestLogScreen());};
    this.action.onclick=()=>{ const t=this.target(); if(t&&!World.player.moving) { World.player.dir=t.dir; this.pulse('a'); } };
    this.back.onclick=()=>this.pulse('b'); this.confirm.onclick=()=>this.pulse('a');
    this.area.addEventListener('pointerdown',e=>{
      if(this.drag || e.button>0) return;
      e.preventDefault(); this.area.setPointerCapture(e.pointerId); Audio2.unlock();
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};
      this.stick.hidden=false; this.stick.style.left=e.clientX+'px'; this.stick.style.top=e.clientY+'px';
      this.stick.firstElementChild.style.transform='translate(-50%,-50%)';
    });
    this.area.addEventListener('pointermove',e=>{
      if(!this.drag || e.pointerId!==this.drag.id) return;
      const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y,r=Math.hypot(dx,dy),s=Math.min(1,48/Math.max(1,r));
      this.stick.firstElementChild.style.transform=`translate(calc(-50% + ${dx*s}px),calc(-50% + ${dy*s}px))`;
      const dir=r<10?null:Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
      for(const k of ['up','down','left','right']) { if(k===dir) Input.press(k); else Input.release(k); }
      this.fast=r>36; if(this.fast) Input.press('run'); else Input.release('run');
      this.stick.classList.toggle('fast',this.fast);
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture']) this.area.addEventListener(name,e=>{if(this.drag?.id===e.pointerId)this.release();});
    window.addEventListener('blur',()=>this.release());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.release();});
    this.sync();
  }
};
MobileField.init();
