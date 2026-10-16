// Runtime geometry and effect smoke check. Set GAME_URL and PLAYWRIGHT_MODULE if needed.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let browser;
(async()=>{browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:960,height:640}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8792/')+'?speed=8');await page.waitForFunction(()=>window.RM);console.log('ready');const result=await page.evaluate(async()=>{
Game.save=()=>true;UI.stack.length=0;Game.party=[new Mon('leprechaun',35)];const b=Scene=new Battle({foes:[new Mon('brownie',35)]});for(const v of [b.meV,b.foeV])Object.assign(v,{x:0,dy:0,a:1,show:true});b.mode='none';b.introT=1;
let checks=0,maxError=0;const bad=[];
for(const key of Object.keys(BATTLE_ANCHORS)){
 const img=IMG.full[key]=await loadImage('assets/full/'+key+'.webp');if(img._bad){bad.push(key+':missing');continue;}
 for(const side of ['me','foe']){const m=side==='me'?b.me:b.foe;m.artName=()=>key;const v=b.view(side);Object.assign(v,{x:side==='me'?27:-18,dy:-12,sc:.87,kickAt:Tick.time-.06,kick:4});const f=BattleArt.frame(b,side),p=BattleArt.point(b,side);const original=ctx.drawImage;let actual;
 ctx.save();ctx.setTransform(1.07,0,0,1.07,-13,9);ctx.drawImage=function(im,x,y,w,h){if(im===img){const a=BATTLE_ANCHORS[key].emit;actual=new DOMPoint(x+a[0]*w,y+a[1]*h).matrixTransform(ctx.getTransform());}return original.apply(this,arguments)};
 try{b.drawMon(m,v,side==='me'?ME_BOX:FOE_BOX,side==='me');}finally{ctx.drawImage=original;ctx.restore();}
 const expected={x:p.x*1.07-13,y:p.y*1.07+9};const error=actual?Math.hypot(actual.x-expected.x,actual.y-expected.y):999;maxError=Math.max(error,maxError);checks++;if(error>.01)bad.push(key+':'+side+':'+error);
 }
}
delete b.me.artName;delete b.foe.artName;for(const v of [b.meV,b.foeV])Object.assign(v,{x:0,dy:0,sc:1,kickAt:-100});
const melee=[];for(const side of ['me','foe']){const target=side==='me'?'foe':'me';const retreat=await BattleArt.approach(b,side,target);const a=BattleArt.point(b,side),z=BattleArt.point(b,target,'hit');melee.push({side,distance:Math.hypot(a.x-z.x,a.y-z.y)});await retreat();}
const shots=[];const oldPush=b.shapes.push;let shot;
b.shapes.push=function(s){if(s.type==='tracer')shot={launch:Tick.time,source:{x:s.x1,y:s.y1},target:{x:s.x2,y:s.y2}};return oldPush.call(this,s)};
const oldBurst=Particles.burst;Particles.burst=function(x,y,...rest){if(shot){shots.push({...shot,impact:Tick.time,error:Math.hypot(x-shot.target.x,y-shot.target.y)});shot=null;}return oldBurst.call(this,x,y,...rest)};
const before=BFX.ok;BFX.ok=false;await b.fireShot('me','foe','bullet','light');await b.fireShot('foe','me','bullet','light');BFX.ok=before;b.shapes.push=oldPush;Particles.burst=oldBurst;
if(shots.length!==2 || shots.some(s=>s.impact-s.launch<.114 || s.error>.01))bad.push('projectile timing/landing');
const modes=[];const available=BFX.ok;
for(const webgl of available?[false,true]:[false]){BFX.ok=webgl;let count=0;for(const fx of [...new Set(Object.values(MOVES).map(m=>m.fx).filter(Boolean))]){for(const side of ['me','foe']){const type=Object.values(MOVES).find(m=>m.fx===fx).type;await b.playFx(fx,side,side==='me'?'foe':'me',type,true);count++;if(b._fxActor || Math.abs(b.view(side).x)>.001 || Math.abs(b.view(side).sc-1)>.001)bad.push(fx+':restoration');}}modes.push({webgl,count});}BFX.ok=available;
return{checks,maxError,bad,melee,shots,modes,webglAvailable:available};});console.log(JSON.stringify({result,errors},null,2));await browser.close();if(errors.length||result.bad.length)process.exitCode=1;})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
