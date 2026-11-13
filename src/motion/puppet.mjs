// Source-level articulated character compiler for AetherMotion's existing
// native group/polygon/circle/path renderer. No new renderer, no APIs.
// A character's local origin is the contact point between both feet at (0,0).
const TURNS=2*Math.PI;
const PI=Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x);
const N=(x)=>Math.round(x*1000)/1000;
const c=(id,x,y,r,color,rest={})=>({id,kind:'circle',x,y,radius:r,color,...rest});
const p=(id,points,color,rest={})=>({id,kind:'polygon',points,color,...rest});
const line=(id,points,color,stroke=2,rest={})=>({id,kind:'path',points,stroke,color,...rest});
const rect=(id,x,y,w,h,color)=>({id,kind:'rect',x,y,width:w,height:h,color});
const group=(id,x,y,children,rest={})=>({id,kind:'group',x,y,children,...rest});
function keyTrack(frames,valueFn) {
 const count=Math.min(Math.max(frames,2),64);
 const chosen=new Set();
 const keys=[];
 for(let i=0;i<count;i++){
  const frame=Math.round(i*(frames-1)/(count-1));
  if(chosen.has(frame))continue;
  chosen.add(frame);
  keys.push({t:frame/(frames-1),value:N(valueFn(frame/(frames-1)))});
 }
 return keys;
}
function envelope(t,start,end) {
 if(t<=start||t>=end)return 0;
 const width=Math.min((end-start)*.17,.13);
 return smooth(clamp((t-start)/width,0,1))*smooth(clamp((end-t)/width,0,1));
}
function walking(t,action) {
 if(!action)return 0;
 const {start,end,cycles,strength}=action;
 return Math.sin(TURNS*cycles*clamp((t-start)/(end-start),0,1))*
  24*strength*envelope(t,start,end);
}
function waving(t,action,side) {
 if(!action||action.arm!==side)return 0;
 const {start,end,cycles}=action;
 const phase=clamp((t-start)/(end-start),0,1);
 const weight=envelope(t,start,end);
 return weight*(-95+14*Math.sin(TURNS*cycles*phase));
}
function headItems(o) {
 const skin=o.skin,hair=o.hair,shade='#523B36';
 const eyes=[c('eye_left',-8,-4,2.4,shade),c('eye_right',8,-4,2.4,shade)];
 const brow=[line('brow_left',[[-12,-11],[-5,-12]],shade,2),line('brow_right',[[4,-12],[12,-11]],shade,2)];
 const face=[
  c('face',0,0,20.5,skin),c('ear_left',-20,2,4,skin),c('ear_right',20,2,4,skin),
  c('nose',1,4,3,'#BD8977'),...eyes,...brow,
  o.expression==='happy'?line('smile',[[-7,10],[0,13],[7,10]],shade,2):
  o.expression==='concerned'?line('worried',[[-6,13],[0,10],[6,13]],shade,2):
  line('mouth',[[-6,11],[5,11]],shade,2),
  p('hair_back',[[-21,-13],[-17,-23],[0,-28],[17,-23],[22,-12],[12,-17],[7,-22],[0,-16],[-9,-21]],hair),
  p('hair_top',[[-20,-9],[-18,-23],[-7,-27],[8,-27],[21,-15],[19,-6],[10,-17],[3,-18],[-6,-12],[-11,-18]],hair),
 ];
 if(o.outfit==='scholar')face.push(p('scholar_cap',[[-25,-20],[-18,-34],[17,-34],[25,-20],[29,-17],[-29,-17]],'#435D69'));
 if(o.outfit==='merchant')face.push(p('merchant_hat',[[-25,-21],[-13,-33],[15,-33],[25,-21],[28,-18],[-29,-18]],'#AC7650'));
 return face;
}
function buildLeg(id,x,color,shoes,frames,dir,walk){
 const rotation=keyTrack(frames,t=>walking(t,walk)*dir);
 const knee=keyTrack(frames,t=>-Math.max(0,walking(t,walk)*dir)*.48);
 return group(id,x,-59,[
   p('thigh',[[-12,0],[12,0],[9,30],[-7,31]],color),
   group('shin',0,29,[
      p('calf',[[-9,-2],[9,-2],[7,27],[-6,27]],color),
      p('boot',[[-8,24],[12,24],[17,29],[14,36],[-13,36]],shoes)
   ],{rotation:knee})
 ],{rotation});
}
function buildArm(id,x,skin,shirt,frames,side,walk,wave) {
 const sign=side==='left'?-1:1;
 const rotation=keyTrack(frames,t=>{
  const swing=-walking(t,walk)*.53;
  const waveMotion=waving(t,wave,side);
  return N((swing+waveMotion)*sign);
 });
 const forearm=keyTrack(frames,t=>waving(t,wave,side)*-.36*sign);
 return group(id,x,-105,[
   p('upper_sleeve',[[-8,-2],[9,-2],[10,23],[2,29],[-9,23]],shirt),
   group('forearm',0,24,[
       p('lower_sleeve',[[-7,0],[7,0],[7,24],[-6,24]],shirt),
       c('hand',0,27,7.5,skin),
       line('finger',[[-2,28],[-2,34]],'#A97E6A',1.2)
   ],{rotation:forearm})
 ],{rotation});
}
export function buildPuppetGroup(o,frames){
 if(!Number.isInteger(frames)||frames<2)throw Error('Puppet requires at least two source frames');
 const {id,kind,height,skin,shirt,trousers,hair,shoes,walk,wave,expression='neutral',outfit='villager',facing='right',...pose}=o;
 if(kind!=='puppet')throw Error('Expected puppet object');
 const relativeScale=(typeof pose.scale==='number'?pose.scale:1)*(height/160);
 const correctedScale=Array.isArray(pose.scale)?pose.scale.map(k=>({...k,value:k.value*(height/160)})):relativeScale;
 const outerScale=typeof correctedScale==='number'?correctedScale:correctedScale;
 // AetherMotion supports positive scale, not negative mirroring; facing is expressed
 // via asymmetric facial/hair accessory placement rather than flipping the whole rig.
 const faceTurn=facing==='left'?-2.5:2.5;
 const bob=keyTrack(frames,t=>Math.abs(walking(t,walk))*.11);
 const leftLeg=buildLeg('leg_left',-13,trousers,shoes,frames,1,walk);
 const rightLeg=buildLeg('leg_right',13,trousers,shoes,frames,-1,walk);
 const backArm=buildArm('arm_left',-27,skin,shirt,frames,'left',walk,wave);
 const frontArm=buildArm('arm_right',27,skin,shirt,frames,'right',walk,wave);
 const headAngle=keyTrack(frames,t=>faceTurn+walking(t,walk)*.12);
 const body=group('moving_body',0,0,[
   p('scarf',[[-17,-104],[17,-104],[24,-88],[0,-86]],'#DEB57C'),
   p('tunic',[[-20,-103],[18,-103],[29,-58],[19,-52],[-23,-52],[-30,-58]],shirt),
   p('shadow_panel',[[14,-101],[18,-102],[29,-58],[18,-53],[7,-56]],'#000000',{opacity:.12}),
   p('belt',[[-24,-60],[23,-60],[20,-54],[-22,-54]],'#6D4C43'),
   rect('buckle',-4,-61,8,7,'#DCC48D'),
   p('collar',[[-14,-103],[-4,-113],[4,-113],[15,-103],[0,-94]],'#F0D8B7'),
   group('head',0,-128,headItems({skin,hair,expression,outfit}),{rotation:headAngle}),
   backArm,frontArm
 ],{y:bob});
 const children=[
  c('ground_shadow',0,1,23,'#20322E',{opacity:.34,scale:1}),
  leftLeg,rightLeg,body
 ];
 if(outfit==='merchant')children.push(p('satchel',[[-22,-95],[-39,-89],[-42,-54],[-19,-55]],'#9C6A4A'));
 if(outfit==='scholar')children.push(p('cape',[[-27,-107],[-33,-74],[-36,-47],[-15,-52],[24,-54],[30,-72],[20,-106]],'#425B76',{opacity:.55}));
 return group(id,pose.x??0,pose.y??0,children,
   {...(pose.opacity!==undefined?{opacity:pose.opacity}:{}),
    ...(pose.rotation!==undefined?{rotation:pose.rotation}:{}),
    scale:outerScale});
}
