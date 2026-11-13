// Declarative, deterministic motion operators for any drawable or group.
// All motion is compiled to bounded integer-frame keyframes for AetherMotion.
// No random numbers, animation callbacks, network, or wall-clock dependencies.
const PI=Math.PI, TAU=2*PI, MAX_KEYS=256;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const round=x=>Math.round(x*1e6)/1e6;
const lerp=(a,b,t)=>a+(b-a)*t;

/** Sample the authoring format (normalized time) with AetherMotion's easing. */
export function sampleSource(track,t,fallback){
 if(track===undefined)return fallback;
 if(typeof track==='number')return track;
 if(t<=track[0].t)return track[0].value;
 for(let i=1;i<track.length;i++){
  const left=track[i-1],right=track[i];
  if(t>=right.t)continue;
  const u=(t-left.t)/(right.t-left.t);
  const eased=left.ease==='hold'?0:left.ease==='smooth'?smooth(u):u;
  return lerp(left.value,right.value,eased);
 }
 return track.at(-1).value;
}
function bounds(b){
 return {start:b.start??0,end:b.end??1};
}
function envelope(t,b){
 const {start,end}=bounds(b);
 if(t<=start||t>=end)return 0;
 const edge=Math.min(.11,(end-start)*.18);
 return smooth(clamp((t-start)/edge,0,1))*smooth(clamp((end-t)/edge,0,1));
}
function phaseAt(t,b){
 const {start,end}=bounds(b);
 return clamp((t-start)/(end-start),0,1);
}
function offsetOnPolyline(points,u,ease='linear'){
 const lengths=[],l=points.length;
 let total=0;
 for(let i=1;i<l;i++){
  const len=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
  lengths.push(len);total+=len;
 }
 const p=ease==='smooth'?smooth(u):ease==='hold'?(u===1?1:0):u;
 let at=clamp(p,0,1)*total;
 for(let i=0;i<lengths.length;i++){
  if(at>lengths[i]&&i<lengths.length-1){at-=lengths[i];continue;}
  const a=points[i],b=points[i+1],w=clamp(at/lengths[i],0,1);
  return {x:lerp(a[0],b[0],w),y:lerp(a[1],b[1],w),
    rotation:Math.atan2(b[1]-a[1],b[0]-a[0])*180/PI};
 }
 throw new Error('Motion path must contain nonzero-length segments');
}
export const behavioralKeys=Object.freeze(['x','y','rotation','scale']);
export function compileBehaviorTracks(obj,frames){
 if(!Array.isArray(obj.behaviors)||!obj.behaviors.length)return {};
 if(!Number.isInteger(frames)||frames<2)throw new Error('Motion requires at least two frames');
 const keys=new Set();
 for(const b of obj.behaviors){
  if(b.kind==='float')keys.add(b.axis);
  if(b.kind==='sway'||b.kind==='path'&&b.orient)keys.add('rotation');
  if(b.kind==='pulse')keys.add('scale');
  if(b.kind==='orbit'||b.kind==='path'){keys.add('x');keys.add('y');}
 }
 const properties=[...keys];
 const out=Object.fromEntries(properties.map(k=>[k,[]]));
 const count=Math.min(MAX_KEYS,frames);
 let lastFrame=-1;
 for(let i=0;i<count;i++){
  const frame=Math.round(i*(frames-1)/(count-1));
  if(frame<=lastFrame)continue;
  lastFrame=frame;
  const t=frame/(frames-1);
  const pose={
   x:sampleSource(obj.x,t,0),y:sampleSource(obj.y,t,0),
   rotation:sampleSource(obj.rotation,t,0),scale:sampleSource(obj.scale,t,1)
  };
  for(const b of obj.behaviors){
   const cycle=TAU*((b.cycles??1)*phaseAt(t,b)+(b.phase??0));
   const env=envelope(t,b);
   if(b.kind==='float')pose[b.axis]+=b.amplitude*Math.sin(cycle)*env;
   else if(b.kind==='sway')pose.rotation+=b.degrees*Math.sin(cycle)*env;
   else if(b.kind==='pulse')pose.scale*=1+b.amount*Math.sin(cycle)*env;
   else if(b.kind==='orbit'){
    pose.x+=b.radiusX*Math.cos(cycle)*env;
    pose.y+=b.radiusY*Math.sin(cycle)*env;
   }else if(b.kind==='path'){
    const {x,y,rotation}=offsetOnPolyline(b.points,phaseAt(t,b),b.ease);
    pose.x+=x;pose.y+=y;
    if(b.orient)pose.rotation+=rotation;
   }
  }
  for(const prop of properties){
   const value=round(pose[prop]);
   const min=prop==='scale'?.001:-100000,max=prop==='scale'?100:100000;
   if(!Number.isFinite(value)||value<min||value>max)
    throw Error('Object '+obj.id+': behavior drives '+prop+' out of native renderer bounds');
   out[prop].push({frame,value});
  }
 }
 return out;
}
