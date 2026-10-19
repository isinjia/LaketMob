// Portrait menus use the field's logical viewport, not a scaled landscape screen.
const PortraitUI = window.PortraitUI = {
  active() { return MobileField.portrait && UI.busy(); },
  fit(text,x,y,width,size=22,o={}) {
    txt(text,x,y,{size:Math.min(size,size*width/Math.max(width,measure(String(text),size,o.weight||700))),weight:700,...o});
  },
  header(title,sub='') {
    screenBG(); txt(title,22,46,{size:29,weight:900,family:TITLE_FONT});
    this.fit(sub,22,76,W-44,17,{color:UI_COL.sub});
  },
  footer(text='항목을 터치해 선택 · 목록을 밀어 이동') {
    this.fit(text,22,H-102,W-44,16,{color:UI_COL.sub});
  },
  lines(text,x,y,width,size=20,max=20,color='#cfe6f5') {
    const lines=wrapText(text,width,size,500).slice(0,max);
    lines.forEach((s,i)=>txt(s,x,y+i*(size+10),{size,weight:500,color}));
    return y+lines.length*(size+10);
  },
  row(nav,i,x,y,w,h) {
    nav.rect(i,x,y,w,h);
    panel(x,y,w,h,{accent:i===nav.i?UI_COL.line:'rgba(56,225,255,.22)',top:i===nav.i?'rgba(25,60,96,.96)':undefined});
  },
  list(nav,n,cols,visible) {
    nav._desktop ||= {cols:nav.cols,visible:nav.visible};
    nav.setN(n);nav.cols=cols;nav.visible=visible;
    const row=Math.floor(nav.i/cols),last=Math.max(0,Math.ceil(n/cols)-visible);
    nav.scroll=clamp(nav.scroll,0,last);
    if(row<nav.scroll)nav.scroll=row;
    if(row>=nav.scroll+visible)nav.scroll=row-visible+1;
    nav.beginDraw();return nav.scroll*cols;
  },
  button(w,label,x,y,width,height,action,on=false) {
    panel(x,y,width,height,{c:9,accent:on?UI_COL.accent:UI_COL.line,top:on?UI_COL.sel:undefined});this.fit(label,x+width/2,y+height/2+8,width-16,21,{align:'center'});
    w._touch.push({x,y:y-(this.scrollOffset||0),w:width,h:height,action,clip:this.clip});
  },
  beginScroll(w,top,bottom) {
    w._detailScroll=clamp(w._detailScroll||0,0,w._detailMax||0);
    w._content={top,bottom};this.clip={top,bottom};this.scrollOffset=w._detailScroll;
    ctx.save();ctx.beginPath();ctx.rect(24,top,W-48,Math.max(1,bottom-top));ctx.clip();ctx.translate(0,-w._detailScroll);
  },
  endScroll(w,endY) {
    w._detailMax=Math.max(0,endY-w._content.bottom);ctx.restore();this.scrollOffset=0;this.clip=null;
    if(w._detailMax>0)txt('밀어서 상세 내용 읽기',W-36,w._content.bottom+20,{size:15,align:'right',color:UI_COL.sub});
  },
  drawStack() {
    const dimAt=UI.dimIndex();
    for(const [i,w] of UI.stack.entries()) {
      if(i===dimAt) UI.dim(w);
      w._touch=[];
      if(!this.draw(w)) {
        const b=MobileField.uiBox(),width=W,height=H;
        ctx.save();ctx.translate(0,b.y);ctx.scale(b.scale,b.scale);
        try{W=960;H=640;w.draw();}finally{W=width;H=height;ctx.restore();}
      }
    }
  },
  draw(w) {
    const name=w.constructor.name;
    if(name==='PauseMenu') {
      this.header('작전 메뉴',Game.mapName());w.nav.beginDraw();
      const rh=Math.min(76,(H-230)/w.items.length);
      w.items.forEach(([label,k],i)=>{const y=104+i*rh;this.row(w.nav,i,20,y,W-40,rh-6);menuGlyph(k,50,y+(rh-6)/2,i===w.nav.i);txt(label,82,y+(rh-6)/2+8,{size:23,weight:700});});
      this.footer('원하는 메뉴를 터치하세요');return true;
    }
    if(name==='DexScreen') {
      const s=DEX_LIST[w.nav.i];
      this.header('바이오로이드 도감',`발견 ${DEX_LIST.filter(s=>Game.dex.seen[s.key]).length} · 영입 ${DEX_LIST.filter(s=>Game.dex.caught[s.key]).length} / ${DEX_LIST.length}`);
      if(w.detail) {
        const artH=Math.min(420,(H-210)*.43),caught=Game.dex.caught[s.key];
        ctx.save();if(!caught&&s.kind!=='worm')ctx.filter='brightness(.15) saturate(0)';
        drawFit(IMG.full[s.key]||lazyImg('full',s.key),22,95,W-44,artH,{anchor:'bottom'});ctx.restore();
        const y=110+artH;panel(18,y,W-36,H-y-128);
        this.fit(s.name,36,y+40,W-100,28);rankBadge(s.rank,W-64,y+17,30);
        s.types.forEach((t,i)=>typeBadge(t,36+i*82,y+58,74,26,16));
        this.fit('소속 · '+(s.faction||'철충'),36,y+120,W-72,20);
        let ty=y+154;
        if(s.habitat){txt('출현 · '+MAPS[s.habitat].name,36,ty,{size:19,color:UI_COL.accent});ty+=34;}
        ty=this.lines(caught||s.kind==='worm'?s.desc:'아직 영입하지 않은 유닛입니다.',36,ty,W-72,19,Math.max(1,Math.floor((H-ty-320)/29)));
        if(caught) ['HP','공격','방어','속도'].forEach((label,i)=>{const yy=H-302+i*26;txt(label,36,yy,{size:16,color:UI_COL.sub});bar(100,yy-12,W-152,9,s.base[i]/130,['#ffd76a','#ff8a1a']);});
        this.button(w,'이전',20,H-178,110,48,()=>w.step(-1));this.button(w,'다음',W-130,H-178,110,48,()=>w.step(1));
      } else {
        const cols=4,gap=12,size=(W-40-gap*(cols-1))/cols,rh=size+42,vis=Math.max(1,Math.floor((H-240)/rh));
        const start=this.list(w.nav,DEX_LIST.length,cols,vis);w._pageSize=cols*vis;
        for(let k=0;k<cols*vis&&start+k<DEX_LIST.length;k++){
          const i=start+k,sp=DEX_LIST[i],x=20+k%cols*(size+gap),y=104+Math.floor(k/cols)*rh,on=i===w.nav.i;
          w.nav.rect(i,x,y,size,rh-8);
          if(Game.dex.seen[sp.key]){iconSquare(sp.key,x,y,size,{gray:!Game.dex.caught[sp.key],border:on?'#fff':undefined});if(Game.dex.caught[sp.key])itemIcon('core',x+size-14,y+14,18);}
          else {panel(x,y,size,size);txt('?',x+size/2,y+size*.66,{size:43,align:'center',color:UI_COL.sub});}
          txt(String(sp.no).padStart(3,'0'),x,y+size+21,{size:15,color:on?UI_COL.line:UI_COL.sub});
          let label=Game.dex.seen[sp.key]?sp.name:'미발견';while(label.length>1&&measure(label,16,700)>size)label=label.slice(0,-1);
          txt(label,x,y+size+40,{size:16,weight:700});
        }
        this.footer(`${start+1}–${Math.min(start+cols*vis,DEX_LIST.length)} / ${DEX_LIST.length} · 밀어서 목록 이동`);
      } return true;
    }
    if(name==='PartyScreen') {
      this.header(w.mode==='pick'?(w.o.title||'대상을 선택하세요'):'부대 편성',w.swapFrom>=0?'교체할 위치를 터치하세요':`출격 부대 ${Game.party.length} / 6`);
      w.nav._desktop ||= {cols:w.nav.cols,visible:w.nav.visible};w.nav.cols=1;w.nav.visible=6;w.nav.beginDraw();const rh=Math.min(146,(H-240)/6);
      for(let i=0;i<6;i++) {const m=Game.party[i],y=104+i*rh;if(m)this.row(w.nav,i,20,y,W-40,rh-9);else panel(20,y,W-40,rh-9);
        if(!m){txt('빈 슬롯',W/2,y+rh/2,{size:20,align:'center',color:UI_COL.sub});continue;}
        iconSquare(m.iconKey,32,y+12,rh-34,{gray:m.hp<=0});const x=32+rh-18;
        this.fit(m.name,x,y+32,W-x-65,24);rankBadge(m.rank,W-60,y+12,26);
        txt('Lv.'+m.level,x,y+61,{size:20,color:UI_COL.accent});m.types.forEach((t,j)=>typeBadge(t,x+100+j*66,y+44,60,22,14));
        bar(x,y+73,W-x-38,10,m.hp/m.maxHp,hpColors(m.hp/m.maxHp));
        txt(`${m.hp} / ${m.maxHp}`,W-36,y+rh-25,{size:17,align:'right'});if(m.status)statusBadge(m.status,x,y+rh-45);bar(x,y+rh-18,W-x-38,4,m.expRatio(),['#7cd9ff','#2a8bd8']);
      }this.footer(w.swapFrom>=0?'이동할 슬롯 선택 · 돌아가기: 취소':'유닛을 터치해 상세 보기·순서 변경');return true;
    }
    if(name==='SummaryScreen') {
      const m=w.m,sp=SPECIES[m.key];this.header('유닛 정보',m.name+' · Lv.'+m.level);
      const artH=Math.min(330,(H-290)*.31);drawFit(m.art(),30,90,W-60,artH,{anchor:'bottom'});
      const tabY=105+artH;['정보','능력치','기술'].forEach((s,i)=>this.button(w,s,20+i*(W-40)/3,tabY,(W-46)/3,50,()=>{w.tab=i;w.anim=0;w._detailScroll=0;},i===w.tab));
      let y=tabY+76;panel(20,y-10,W-40,H-y-126);this.beginScroll(w,y-2,H-206);
      if(w.tab===0){const rows=[['도감 번호','No.'+String(sp.no).padStart(3,'0')],['이름',m.name],['등급',m.rank+(m.rank==='SS'?'':' · 승급 Lv.'+(PROMOTE_LV[m.rank]||'-'))],['소속',sp.faction||'-'],['링크 사령관',m.ot||'사령관'],['경험치',m.exp.toLocaleString()],['다음 레벨까지',m.level>=100?'-':(expForLevel(m.level+1)-m.exp).toLocaleString()]];
        rows.forEach(([a,b])=>{txt(a,36,y+25,{size:19,color:UI_COL.sub});this.fit(b,W-36,y+25,W-210,21,{align:'right'});y+=44;});
        m.types.forEach((t,i)=>typeBadge(t,36+i*84,y,76,28,17));y+=58;
        const tk=traitOf(m);for(const t of [tk&&TRAITS[tk],TRAITS.rally].filter(Boolean)){txt('◆ '+t.name,36,y,{size:20,color:UI_COL.accent});y=this.lines(t.desc,36,y+28,W-72,17,2)+14;}
        y=this.lines(sp.desc,36,y,W-72,18,40);
      } else if(w.tab===1){[['HP',m.hp+' / '+m.maxHp,m.hp/m.maxHp],['공격',m.atk,m.atk/200],['방어',m.def,m.def/200],['속도',m.spd,m.spd/200]].forEach(([s,v,r])=>{txt(s,36,y+30,{size:22,color:UI_COL.sub});txt(String(v),W-38,y+30,{size:24,align:'right',weight:800});bar(36,y+47,W-72,13,r,['#ffd76a','#ff8a1a']);y+=88;});txt('종족 기본 능력',36,y+24,{size:20,color:UI_COL.sub});y+=58;sp.base.forEach((v,i)=>{txt(['HP','공격','방어','속도'][i],36,y,{size:17});bar(100,y-12,W-150,10,v/130,['#7cd9ff','#2a8bd8']);y+=34;});
      }else{m.moves.forEach((mv,i)=>{const d=MOVES[mv.id];this.button(w,'',30,y,W-60,72,()=>w.moveI=i,i===w.moveI);typeBadge(d.type,42,y+10,64,23,14);this.fit(d.name,120,y+30,W-275,22);txt('EN '+mv.pp+'/'+d.pp,W-43,y+30,{size:18,align:'right'});txt(d.cat==='atk'?`위력 ${d.pow} · 명중 ${d.acc}`:'변화 기술',120,y+58,{size:17,color:UI_COL.sub});y+=82;});y=this.lines(MOVES[m.moves[w.moveI].id].desc,36,y+22,W-72,19,40);}
      this.endScroll(w,y+12);this.button(w,'이전 유닛',20,H-176,150,48,()=>{w.i=(w.i+w.list.length-1)%w.list.length;w.moveI=0;w._detailScroll=0;});this.button(w,'다음 유닛',W-170,H-176,150,48,()=>{w.i=(w.i+1)%w.list.length;w.moveI=0;w._detailScroll=0;});return true;
    }
    if(name==='SettingsScreen') {
      this.header('설정','터치로 값 변경');w.nav.beginDraw();const rh=Math.min(94,(H-234)/9);
      const labels=['배경음','효과음','음성','텍스트 속도','기본 달리기','퀘스트 추적 표시','난이도','터치 조작','돌아가기'];
      labels.forEach((label,i)=>{const y=104+i*rh;this.row(w.nav,i,20,y,W-40,rh-6);txt(label,36,y+29,{size:22,weight:700});
        let val=i<3?Math.round(Settings[['bgm','sfx','voice'][i]]*100)+'%':i===3?['','느리게','보통','빠르게','즉시'][Settings.textSpeed]:i===4?(Settings.runDefault?'ON':'OFF'):i===5?(Settings.questTracker?'ON':'OFF'):i===6?['쉬움','보통','어려움'][Settings.difficulty]:i===7?(Settings.touchStyle==='buttons'?'기존 버튼':'조이스틱 · 상황 버튼'):'';
        txt(val,W-38,y+29,{size:20,align:'right',color:UI_COL.accent});
        if(i<4||i===6){this.button(w,'−',36,y+rh-42,62,32,()=>{w.nav.i=i;Input.pressed.left=true;});this.button(w,'+',W-98,y+rh-42,62,32,()=>{w.nav.i=i;Input.pressed.right=true;});if(i<3)bar(112,y+rh-31,W-224,10,Settings[['bgm','sfx','voice'][i]],['#7ce8ff','#1a9fd0']);}
      });return true;
    }
    if(name==='BagScreen'||name==='ShopScreen') {
      const shop=name==='ShopScreen',items=shop?w.stock:w.items;
      this.header(shop?(w.o.title||'보급소'):'가방','보유 자원 '+Game.money.toLocaleString()+' P');
      const details=220,rh=76,vis=Math.max(2,Math.floor((H-240-details)/rh)),start=this.list(w.nav,items.length+1,1,vis);
      for(let i=start;i<Math.min(items.length+1,start+vis);i++){const y=104+(i-start)*rh;this.row(w.nav,i,20,y,W-40,rh-8);if(i===items.length){txt(shop?'나가기':'닫기',42,y+43,{size:23});continue;}const id=items[i];itemIcon(id,50,y+33,34);this.fit(ITEMS[id].name,82,y+30,W-230,23);txt(shop?ITEMS[id].price.toLocaleString()+' P':'× '+Game.bag[id],W-36,y+32,{size:20,align:'right',color:UI_COL.accent});if(shop)txt('보유 '+(Game.bag[id]||0),W-36,y+57,{size:16,align:'right',color:UI_COL.sub});}
      const id=items[w.nav.i],y=H-350;panel(20,y,W-40,210);if(id){itemIcon(id,56,y+44,40);this.fit(ITEMS[id].name,90,y+47,W-128,24);this.lines(ITEMS[id].desc,38,y+92,W-76,20,3);}this.footer('항목 터치: '+(shop?'구매':'사용')+' · 밀어서 목록 이동');return true;
    }
    if(name==='QuestLogScreen') {
      this.header('퀘스트 일지','진행 중 · 받을 수 있음 · 완료');const vis=Math.max(2,Math.floor((H-650)/68)),start=this.list(w.nav,Math.max(1,w.rows.length),1,vis);
      for(let i=start;i<Math.min(w.rows.length,start+vis);i++){const {q,k}=w.rows[i],y=104+(i-start)*68;this.row(w.nav,i,20,y,W-40,60);this.fit((k==='done'?'✓ ':k==='avail'?'! ':'? ')+q.title,36,y+29,W-72,22);txt(k==='done'?'완료':k==='avail'?'받을 수 있음':'진행 중',36,y+50,{size:15,color:UI_COL.sub});}
      const y=120+vis*68;panel(20,y,W-40,H-y-140);if(!w.rows.length){txt('진행 중인 퀘스트가 없습니다.',36,y+40,{size:22});return true;}
      const {q,k}=w.rows[w.nav.i],state=Quests.state(q.id);this.beginScroll(w,y+12,H-155);this.fit(q.title,36,y+38,W-72,26,{color:UI_COL.accent});let ty=y+76;if(q.giver)ty=this.lines('의뢰 · '+Quests.npcName(q.giver)+' ('+MAPS[q.giver[0]].name+')',36,ty,W-72,17,3)+12;ty=this.lines(q.summary||'',36,ty,W-72,19,30)+18;
      for(const [i,st]of q.steps.entries()){if(k!=='done'&&i>(state?state.step:0))break;ty=this.lines((k==='done'||state&&i<state.step?'✓ ':'• ')+st.goal+(st.prog&&state?' ('+st.prog(state)+')':''),36,ty,W-72,19,30)+12;}
      if(k==='act')ty=this.lines(Quests.goalText(q),36,ty,W-72,18,4,UI_COL.accent)+20;
      const r=q.reward||{},rewards=[r.money?r.money.toLocaleString()+' P':'',...Object.entries(r.items||{}).map(([id,n])=>ITEMS[id].name+' ×'+n)].filter(Boolean);if(rewards.length)ty=this.lines('보상 · '+rewards.join(' · '),36,ty+20,W-72,18,10);this.endScroll(w,ty+20);this.footer();return true;
    }
    if(name==='PCScreen') {
      this.header('오르카 격납고',`출격 ${Game.party.length}/6 · 보관 ${Game.box.length}`);
      ['출격 부대','격납고'].forEach((s,i)=>this.button(w,s,20+i*(W-40)/2,102,(W-46)/2,52,()=>w.side=i,i===w.side));
      const nav=w.side===0?w.navP:w.navB,list=w.side===0?Game.party:Game.box,vis=Math.max(1,Math.floor((H-300)/100)),start=this.list(nav,list.length,1,vis);
      for(let i=start;i<Math.min(list.length,start+vis);i++){const m=list[i],y=172+(i-start)*100;this.row(nav,i,20,y,W-40,90);iconSquare(m.iconKey,30,y+10,68);this.fit(m.name,114,y+32,W-160,23);txt('Lv.'+m.level,114,y+65,{size:19,color:UI_COL.accent});bar(210,y+53,W-250,11,m.hp/m.maxHp,hpColors(m.hp/m.maxHp));}
      if(!list.length)txt('비어 있습니다.',W/2,240,{size:23,align:'center',color:UI_COL.sub});this.footer();return true;
    }
    if(name==='CardScreen') {
      this.header('사령관 카드','ORCA COMMANDER');drawCommanderBust(W/2,205,1.5);txt('오르카 사령관',W/2,330,{size:28,align:'center',weight:900});
      const rows=[['보유 자원',Game.money.toLocaleString()+' P'],['도감 (영입)',DEX_LIST.filter(s=>Game.dex.caught[s.key]).length+' / '+DEX_LIST.filter(s=>s.kind!=='worm').length],['도감 (발견)',DEX_LIST.filter(s=>Game.dex.seen[s.key]).length+' / '+DEX_LIST.length],['플레이 시간',Game.playTimeStr()],['쓰러뜨린 유닛',(Game.stats.knockouts||0)+' 기']];
      rows.forEach(([label,v],i)=>{const y=360+i*72;panel(20,y,W-40,64);txt(label,36,y+41,{size:21,color:UI_COL.sub});txt(v,W-36,y+41,{size:23,weight:800,align:'right'});});
      BADGES.forEach((b,i)=>drawBadge(b,100+i*165,Math.min(H-210,800),Game.badges.includes(b.id),.8));return true;
    }
    if(name==='TypeChartScreen') {
      this.header('타입 상성표','위: 방어 타입 · 왼쪽: 공격 타입');const n=TYPE_ORDER.length,cw=(W-110)/n,ch=Math.min(83,(H-360)/n),y0=162;
      TYPE_ORDER.forEach((t,j)=>typeBadge(t,100+j*cw,112,cw-4,32,15));TYPE_ORDER.forEach((at,i)=>{typeBadge(at,16,y0+i*ch+12,76,30,16);TYPE_ORDER.forEach((dt,j)=>{const e=(EFF[at]&&EFF[at][dt])||1,x=100+j*cw,y=y0+i*ch;ctx.fillStyle=e>1?'#165c48':e<1?'#592436':'#15273b';ctx.fillRect(x+2,y+2,cw-4,ch-4);txt(e>1?'×2':e<1?'×½':'—',x+cw/2,y+ch/2+7,{size:20,align:'center',color:e>1?UI_COL.green:e<1?'#ff8a95':UI_COL.sub});});});
      this.lines('경장 → 기동 → 중장 → 경장\n화염 → 냉기 → 전기 → 화염\n기술과 자신의 타입이 같으면 위력 1.5배',24,y0+n*ch+46,W-48,21);return true;
    }
    if(name==='PatchNotesScreen') {
      this.header('패치노트','버전별 변경 내용');w.list(24,132,W-48,19,32,H-140);this.footer('화면을 누르면 닫기');return true;
    }
    if(name==='ControlsScreen') {
      this.header('조작법','모바일 터치');const rows=[['필드 이동','화면을 드래그하면 이동합니다.'],['달리기','조이스틱을 멀리 밀면 달립니다.'],['대화 · 조사','대상 근처에서 이동 영역을 짧게 탭하세요.'],['메뉴','이동 영역을 길게 누르거나 ☰를 터치하세요.'],['대화 넘기기','화면 어디든 짧게 탭하세요.'],['목록 이동','항목 터치 · 위아래로 밀어 이동'],['설정 값 변경','설정의 − / + 버튼을 터치하세요.'],['기존 버튼 방식','설정 → 터치 조작에서 선택']];const rh=Math.min(118,(H-240)/rows.length);rows.forEach(([a,b],i)=>{const y=104+i*rh;panel(20,y,W-40,rh-8);txt(a,36,y+32,{size:22,weight:800});this.lines(b,36,y+60,W-72,18,1);});return true;
    }
    if(name==='MoveForgetScreen') {
      this.header('기술 교체',w.m.name+' · 잊을 기술을 선택하세요');
      const list=[...w.m.moves.map(m=>m.id),w.newId],rh=Math.min(110,(H-370)/list.length);w.nav.beginDraw();
      list.forEach((id,i)=>{const d=MOVES[id],y=108+i*rh;this.row(w.nav,i,20,y,W-40,rh-10);typeBadge(d.type,34,y+14,68,26,16);this.fit(d.name,120,y+35,W-260,24);txt('EN '+d.pp,W-36,y+35,{size:19,align:'right'});txt(i===list.length-1?'NEW · 새 기술을 배우지 않음':d.cat==='atk'?`위력 ${d.pow} · 명중 ${d.acc}`:'변화 기술',120,y+70,{size:17,color:i===list.length-1?UI_COL.accent:UI_COL.sub});});
      this.lines(MOVES[list[w.nav.i]].desc,28,H-250,W-56,20,4);return true;
    }
    if(name==='StarterPreview') {
      const sp=w.sp;this.header('첫 부대원 선택',sp.name+' · '+sp.faction);
      const ah=Math.min(350,(H-400)*.48);drawFit(IMG.full[sp.key]||lazyImg('full',sp.key),24,94,W-48,ah,{anchor:'bottom'});
      let y=110+ah;panel(20,y,W-40,Math.max(160,H-y-380));sp.types.forEach((t,i)=>typeBadge(t,36+i*84,y+16,76,28,16));
      y=this.lines(sp.desc,36,y+78,W-72,19,3)+10;sp.base.forEach((v,i)=>{txt(['HP','공격','방어','속도'][i],36,y,{size:17});bar(110,y-12,W-160,9,v/130,['#ffd76a','#ff8a1a']);y+=27;});return true;
    }
    if(name==='PromotionScreen') {
      w.t+=FRAME_DT;this.header(w.promote?'링크 승급':'새로운 모습',w.m.name);const col=RANK_COLOR[w.stage>=2?w.to:w.from];
      ctx.save();ctx.translate(W/2,H*.4);ctx.rotate(w.t*.4);for(let i=0;i<16;i++){ctx.rotate(Math.PI/8);ctx.fillStyle=col+'22';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(900,-60);ctx.lineTo(900,60);ctx.closePath();ctx.fill();}ctx.restore();
      ctx.save();if(w.stage===1)ctx.filter='brightness('+(1.5+Math.sin(w.t*10)*.5)+')';drawFit(w.m.art(false),20,124,W-40,H-520,{anchor:'bottom'});ctx.restore();rankBadge(w.stage>=2?w.to:w.from,W/2-30,108,60);Particles.draw();return true;
    }
    if(name==='BadgeScreen') {w.draw();return true;}
    if(name==='Choice') {
      const rh=64,h=w.options.length*rh+24,y=Math.max(100,H-420-h);if(!UI.stack.some(item=>item instanceof Dialog)){ctx.fillStyle='#020815bb';ctx.fillRect(0,0,W,H);}panel(24,y,W-48,h);w.nav.beginDraw();w.options.forEach((s,i)=>{this.row(w.nav,i,34,y+12+i*rh,W-68,rh-6);this.fit(s,50,y+53+i*rh,W-100,23);});return true;
    }
    if(name==='NumberPick') {
      ctx.fillStyle='#020815bb';ctx.fillRect(0,0,W,H);const y=H/2-160;panel(20,y,W-40,310);txt('구매 수량',36,y+45,{size:26,weight:900});txt('× '+w.n,W/2,y+110,{size:40,align:'center'});txt((w.n*w.price).toLocaleString()+' P',W/2,y+150,{size:24,align:'center',color:UI_COL.accent});
      this.button(w,'−',40,y+175,100,52,()=>w.n=Math.max(1,w.n-1));this.button(w,'+',W-140,y+175,100,52,()=>w.n=Math.min(w.max,w.n+1));this.button(w,'구매',155,y+242,W-310,50,()=>UI.close(w,w.n));return true;
    }
    if(name==='Dialog') {
      // Rewrap the same page for the readable portrait width; preserve reveal progress.
      const y=H-360;if(w.o.portrait){const im=IMG.full[w.o.portrait]||lazyImg('full',w.o.portrait);drawFit(im,20,Math.max(100,y-450),W-40,Math.min(450,y-100),{anchor:'bottom'});}panel(16,y,W-32,242);if(w.o.speaker)txt(w.o.speaker,34,y+35,{size:22,weight:800,color:UI_COL.accent});
      this.lines(w.pageText.slice(0,Math.floor(w.shown)).replace(/\n/g,''),34,y+(w.o.speaker?76:42),W-68,23,5);return true;
    }
    return false;
  },
  init() {
    const originalUpdate=UI.update;
    UI.update=function(dt){
      if(!PortraitUI.active())for(const item of this.stack)for(const nav of [item.nav,item.navP,item.navB])if(nav?._desktop){Object.assign(nav,nav._desktop);nav.scroll=0;delete nav._desktop;}
      for(const item of this.stack)if(item instanceof Dialog){
        const portrait=MobileField.portrait;
        if(item._portraitLayout!==portrait){
          let offset=item.pages.slice(0,item.page).reduce((n,p)=>n+p.join('').length,0)+item.pageText.slice(0,Math.floor(item.shown)).replace(/\n/g,'').length;
          const lines=wrapText(item.full,portrait?W-68:item.box.w-64,item.slim?20:23,600),per=portrait?5:item.slim?2:3;
          item.pages=[];for(let i=0;i<lines.length;i+=per)item.pages.push(lines.slice(i,i+per));item.page=0;
          while(item.page<item.pages.length-1&&offset>item.pages[item.page].join('').length){offset-=item.pages[item.page].join('').length;item.page++;}
          item.shown=0;let chars=0;for(const c of item.pageText){if(chars>=offset)break;item.shown++;if(c!=='\n')chars++;}
          item._portraitLayout=portrait;
        }
      }
      const w=this.top();if(PortraitUI.active()&&w){const c=Input.mouse.click,hit=c&&w._touch?.find(r=>c.x>=r.x&&c.x<=r.x+r.w&&c.y>=r.y&&c.y<=r.y+r.h&&(!r.clip||(c.y>=r.clip.top&&c.y<=r.clip.bottom))); 
        if(hit){Input.mouse.click=null;hit.action();}
        // These desktop widgets have absolute click regions / click-anywhere acceptance.
        if(w instanceof SummaryScreen||w instanceof NumberPick)Input.mouse.click=null;
      }return originalUpdate.call(this,dt);
    };
    let drag=null;
    canvas.addEventListener('pointerdown',e=>{if(!this.active()||e.pointerType==='mouse')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientY,moved:false,widget:UI.top()};Audio2.unlock();},{passive:false});
    canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const d=e.clientY-drag.last;if(Math.abs(e.clientY-drag.y)>14)drag.moved=true;if(!drag.moved||Math.abs(d)<28)return;drag.last=e.clientY;const w=drag.widget;if(w!==UI.top())return;if(w._content&&drag.y>=canvas.getBoundingClientRect().top+w._content.top/H*canvas.getBoundingClientRect().height&&drag.y<=canvas.getBoundingClientRect().top+w._content.bottom/H*canvas.getBoundingClientRect().height){w._detailScroll=clamp((w._detailScroll||0)-d*H/canvas.getBoundingClientRect().height,0,w._detailMax||0);return;}const nav=w instanceof PCScreen?(w.side===0?w.navP:w.navB):w.nav;if(nav){const step=d>0?-1:1;nav.scroll=clamp(nav.scroll+step,0,Math.max(0,Math.ceil(nav.n/nav.cols)-nav.visible));nav.i=clamp(nav.i+step*nav.cols,nav.scroll*nav.cols,Math.min(nav.n-1,(nav.scroll+nav.visible)*nav.cols-1));}}, {passive:true});
    canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();if(!drag.moved&&drag.widget===UI.top())Input.mouse.click=MobileField.uiPoint(e,canvas.getBoundingClientRect());drag=null;},{passive:false});
    for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  }
};
PortraitUI.init();
