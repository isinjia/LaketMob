// All points use the same image-local transform as drawMon, including flip, feet,
// bob, recoil, scaling and lunge. Never use a platform centre as a weapon socket.
const BattleArt = {
  layout(m, v, box, mine) {
    const name = m.artName ? m.artName() : m.key;
    const img = IMG.full[name];
    const dims = img && !img._bad && img.width ? [img.width, img.height] : (typeof FORM_SIZES !== 'undefined' && FORM_SIZES[name]) || ASSET_SIZES[m.key] || [360,720];
    const flip = typeof artFlip === 'function' && artFlip(name, mine ? 'R' : 'L');
    const s = Math.min(box.w / dims[0], box.h / dims[1]) * v.sc;
    const w = dims[0] * s, h = dims[1] * s;
    const foot = img && img.width ? artFootOffset(img) * (flip ? -1 : 1) : 0;
    const age = Tick.time - (v.kickAt ?? -100);
    const recoil = age >= 0 && age < .16 ? (mine ? -1 : 1) * (v.kick || 0) * Math.sin(age / .16 * Math.PI) : 0;
    const x = box.cx + v.x + recoil - w / 2 - foot * w;
    const bob = Math.sin(Tick.time * 2.2 + (mine ? 1 : 0)) * 3;
    const y = (mine ? box.base - 60 : box.base + 18) - h + v.dy + bob * (mine ? 1 : .6);
    const profile = BATTLE_ANCHORS[name] || {kind:'focus', emit:[flip ? .20 : .80,.40], hit:[.5,.45]};
    const point = uv => ({x:x + (flip ? 1-uv[0] : uv[0])*w, y:y + uv[1]*h});
    return {name,img,flip,x,y,w,h,profile,point};
  },
  frame(b,side) { return this.layout(side === 'me' ? b.me : b.foe, b.view(side), side === 'me' ? ME_BOX : FOE_BOX, side === 'me'); },
  point(b,side,role='emit',fx) {
    const f=this.frame(b,side);
    const body=role==='hit' || ['buff','heal','shield'].includes(fx);
    return f.point(body ? f.profile.hit : f.profile.emit);
  },
  live(b,side,role,fx) {
    const self=this;
    return {get x(){return self.point(b,side,role,fx).x;},get y(){return self.point(b,side,role,fx).y;}};
  },
  // A small visible focus for poses without a drawn firearm. Do not put a gun
  // flash on a bare hand or reuse a weapon location from a different skin.
  flash(b,side,target,fx,type) {
    const f=this.frame(b,side), p=this.point(b,side,'emit',fx);
    const angle=Math.atan2(target.y-p.y,target.x-p.x);
    const size=Math.max(7,Math.min(16,f.h*.035));
    b.shapes.push({type:'sourceflash',x:p.x,y:p.y,a:angle,size,t:0,life:f.profile.kind==='gun'?.085:.15,gun:f.profile.kind==='gun',color:f.profile.kind==='gun'?'#ffd47a':TYPES[type]?.color || '#bfefff'});
    if(f.profile.kind==='gun') { const v=b.view(side);v.kickAt=Tick.time;v.kick=Math.max(2,Math.min(5,f.h*.012)); }
    return p;
  },
  async approach(b,side,tSide) {
    const v=b.view(side), start={x:v.x,dy:v.dy,sc:v.sc};
    const own=this.frame(b,side), other=this.frame(b,tSide);
    // Moving to the far platform also moves the attacker into its perspective.
    // Keep the full sprite in frame instead of lifting a near-size portrait offscreen.
    const scale=start.sc*Math.min(1,other.h/own.h);
    v.sc=scale;
    const a=this.point(b,side), z=this.point(b,tSide,'hit');
    v.sc=start.sc;
    const dx=z.x-a.x,dy=z.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),reach=42;
    const end={x:start.x+dx-dx/d*reach,dy:start.dy+dy-dy/d*reach,sc:scale};
    const preview=this.layout(side==='me'?b.me:b.foe,{...v,...end},side==='me'?ME_BOX:FOE_BOX,side==='me');
    if(preview.y<18) end.dy+=18-preview.y;
    b._fxActor=side;
    await tween(v,end,180,Ease.outCubic);
    return async()=>{await tween(v,start,220,Ease.outCubic);b._fxActor=null;};
  }
};
// Face a newly added gun/weapon toward the opponent if no authored facing exists.
for(const [name,p] of Object.entries(BATTLE_ANCHORS)) if(!FACING[name] && ['gun','blade','mouth'].includes(p.kind) && Math.abs(p.emit[0]-.5)>.15) FACING[name]=p.emit[0]<.5?'L':'R';
