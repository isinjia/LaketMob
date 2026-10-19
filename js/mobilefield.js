// 세로 필드와 메뉴는 540px 논리 폭으로 확장한다. 전투·타이틀 본 화면은 기존 비율을 유지한다.
const MobileField = window.MobileField = {
  portrait: false, drag: null, fast: false, touch: matchMedia('(pointer: coarse)').matches,
  enabled() { return this.touch && Settings.touchStyle !== 'buttons'; },
  field() { return typeof Scene !== 'undefined' && Scene === World && !!World.def; },
  portraitContext() {
    return this.field() || (typeof UI !== 'undefined' && UI.stack.some(w=>!['Dialog','Choice'].includes(w.constructor.name)));
  },
  dimensions() {
    this.portrait = this.enabled() && innerHeight > innerWidth && this.portraitContext();
    W = this.portrait ? 540 : 960;
    H = this.portrait ? Math.round(540 * innerHeight / innerWidth) : 640;
  },
  release() {
    if (!this.drag) return;
    clearTimeout(this.drag.holdTimer);
    for (const k of ['up','down','left','right','run']) Input.release(k);
    this.drag = null; this.fast = false;
    this.stick.hidden = true;
  },
  pulse(k) { Input.press(k); setTimeout(() => Input.release(k), 90); },
  request(kind) { this.pending={kind,until:performance.now()+600}; },
  uiBox() {
    const scale = W / 960;
    const dialog = UI.top() instanceof Dialog || UI.top() instanceof Choice;
    return { scale, y: dialog ? H - 640 * scale - 82 : (H - 640 * scale) / 2 };
  },
  uiPoint(e, r) {
    if(window.PortraitUI && PortraitUI.active()) return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};
    const b = this.uiBox();
    return { x: (e.clientX-r.left)/r.width*W/b.scale, y: ((e.clientY-r.top)/r.height*H-b.y)/b.scale };
  },
  drawUI() {
    if (!UI.busy()) return;
    if(window.PortraitUI) return PortraitUI.drawStack();
    const b = this.uiBox(), w = W, h = H;
    ctx.save();
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
    const want=this.enabled() && innerHeight>innerWidth && this.portraitContext();
    if (want!==this.portrait) { this.release(); resize(); }
    const modern=this.enabled(), field=modern && this.field(), free=field && !UI.busy() && !World.locked && !Trans.active;
    if (!free) { this.release(); this.pending=null; }
    if(this.pending && free) {
      const task=this.pending;
      if(performance.now()>task.until) this.pending=null;
      else if(!World.player.moving) {
        this.pending=null;
        if(task.kind==='menu') { Audio2.select(); UI.push(new PauseMenu()); }
        else { const t=this.target(); if(t) { World.player.dir=t.dir; World.interact(); } }
      }
    }
    document.body.classList.toggle('modern-field',free);
    document.body.classList.toggle('modern-touch',modern);
    document.body.classList.toggle('portrait-field',this.portrait);
    this.hud.hidden=!modern;
    this.area.hidden=!free;
    const t=free && !World.player.moving ? this.target() : null;
    this.action.hidden=!t;
    this.action.textContent=t ? (['npc','trainer','legend'].includes(t.e.kind)?'대화하기':'조사하기') : '';
    const dex = UI.top() instanceof DexScreen && !UI.top().detail;
    this.prev.hidden=this.next.hidden=!dex;
    this.back.hidden=!UI.busy();
    this.confirm.hidden=!(UI.top() instanceof Dialog);
    this.menu.hidden=!field || UI.busy();
    this.quest.hidden=!free || !this.portrait || !Settings.questTracker;
    const q=window.Quests && Quests.trackList()[0];
    this.quest.textContent=q ? '◇ '+q.title+'  ·  '+Quests.goalText(q) : '◇ 퀘스트 일지';
  },
  init() {
    const el=document.createElement('div'); el.id='mobile-field';
    el.innerHTML=`<div id="move-zone" aria-label="드래그 이동, 짧게 탭 대화·조사, 길게 눌러 메뉴"></div><div id="floating-stick" hidden><i></i></div><button id="field-menu" aria-label="메뉴">☰</button><button id="field-quest"></button><button id="field-action"></button><button id="field-confirm">계속 ▸</button><button id="field-back">돌아가기</button><button id="dex-prev">이전 목록</button><button id="dex-next">다음 목록</button>`;
    document.body.appendChild(el); this.hud=el;
    const get=id=>document.getElementById(id);
    this.area=get('move-zone'); this.stick=get('floating-stick'); this.menu=get('field-menu'); this.quest=get('field-quest'); this.action=get('field-action'); this.back=get('field-back'); this.confirm=get('field-confirm'); this.prev=get('dex-prev'); this.next=get('dex-next');
    const page=d=>{const t=UI.top(); if(t instanceof DexScreen) { t.nav.i=clamp(t.nav.i+d*(this.portrait?(t._pageSize||16):32),0,DEX_LIST.length-1); t.nav.scroll=Math.floor(t.nav.i/t.nav.cols); } };
    this.prev.onclick=()=>page(-1); this.next.onclick=()=>page(1);
    this.menu.onclick=()=>{this.release();this.pulse('menu');};
    this.quest.onclick=()=>{this.release();UI.push(new QuestLogScreen());};
    this.action.onclick=()=>this.request('interact');
    this.back.onclick=()=>this.pulse('b'); this.confirm.onclick=()=>this.pulse('a');
    this.area.addEventListener('pointerdown',e=>{
      if(this.drag || e.button>0) return;
      e.preventDefault(); this.area.setPointerCapture(e.pointerId); Audio2.unlock();
      this.pending=null;
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
      const drag=this.drag;
      drag.holdTimer=setTimeout(()=>{if(this.drag===drag&&!drag.moved){this.request('menu');this.release();}},600);
      this.stick.hidden=false; this.stick.style.left=e.clientX+'px'; this.stick.style.top=e.clientY+'px';
      this.stick.firstElementChild.style.transform='translate(-50%,-50%)';
    });
    this.area.addEventListener('pointermove',e=>{
      if(!this.drag || e.pointerId!==this.drag.id) return;
      const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y,r=Math.hypot(dx,dy),s=Math.min(1,48/Math.max(1,r));
      if(r>=10) { this.drag.moved=true; clearTimeout(this.drag.holdTimer); }
      this.stick.firstElementChild.style.transform=`translate(calc(-50% + ${dx*s}px),calc(-50% + ${dy*s}px))`;
      const dir=r<10?null:Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
      for(const k of ['up','down','left','right']) { if(k===dir) Input.press(k); else Input.release(k); }
      this.fast=r>36; if(this.fast) Input.press('run'); else Input.release('run');
      this.stick.classList.toggle('fast',this.fast);
    });
    this.area.addEventListener('pointerup',e=>{if(this.drag?.id!==e.pointerId)return;const tap=!this.drag.moved;this.release();if(tap)this.request('interact');});
    for(const name of ['pointercancel','lostpointercapture']) this.area.addEventListener(name,e=>{if(this.drag?.id===e.pointerId)this.release();});
    window.addEventListener('blur',()=>{this.pending=null;this.release();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.pending=null;this.release();}});
    this.sync();
  }
};
MobileField.init();
