// Deterministic 2D sprite gait derived from actual horizontal travel.
// Source sprites remain reusable; output is inert native AetherMotion tracks.
import {compileBehaviorTracks,sampleSource} from './behaviors.mjs';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x),r=x=>Math.round(x*1e5)/1e5;
export const PARTS=['rearLeg','frontLeg','rearArm','frontArm','headPivot','torso'];
function sampleFrames(track,frame,fallback=0){
 if(track===undefined)return fallback;
 if(typeof track==='number')return track;
 if(frame<=track[0].frame)return track[0].value;
 for(let i=1;i<track.length;i++){
  const a=track[i-1],b=track[i];if(frame>=b.frame)continue;
  const t=(frame-a.frame)/(b.frame-a.frame);
  return a.value+(b.value-a.value)*(a.ease==='hold'?0:a.ease==='smooth'?smooth(t):t);
 }
 return track.at(-1).value;
}
export function animateBipedInstance(obj,definition,frames){
 const parts=structuredClone(definition);
 if(!obj.locomotion)return parts;
 if(!Number.isInteger(frames)||frames<2)throw Error('Locomotion requires at least two frames');
 const loc=obj.locomotion,byName=new Map(parts.map(p=>[p.id,p]));
 if(PARTS.some(k=>!byName.has(k)))throw Error('Biped sprite missing required articulated components');
 const count=Math.min(256,frames),positions=[],progress=[];
 const motion=obj.behaviors?.length?compileBehaviorTracks(obj,frames):{};
 const start=loc.start??0,end=loc.end??1;
 let distance=0,prev=null;
 for(let i=0;i<count;i++){
  const frame=Math.round(i*(frames-1)/(count-1)),t=frame/(frames-1);
  const x=motion.x?sampleFrames(motion.x,frame):sampleSource(obj.x,t,0);
  const scale=sampleSource(obj.scale,t,1);
  if(!Number.isFinite(x)||!(scale>0))throw Error('Locomotion source position or scale invalid');
  if(prev!==null&&t>=start&&t<=end)distance+=Math.abs(x-prev);
  positions.push({frame,t,x,scale,distance});
  progress.push(Math.PI*distance/(loc.stepLength*scale));
  prev=x;
 }
 const average=distance/Math.max(1,(end-start)*(frames-1));
 const outputs=new Map(PARTS.map(k=>[k,{rotation:[],y:[]}]));
 for(let i=0;i<count;i++){
  const pt=positions[i],p=positions[Math.max(0,i-1)],n=positions[Math.min(count-1,i+1)];
  const velocity=(n.x-p.x)/Math.max(1,n.frame-p.frame);
  const edge=Math.min(.10,(end-start)*.2),t=pt.t;
  const window=t<start||t>end?0:smooth(clamp((t-start)/edge,0,1))*smooth(clamp((end-t)/edge,0,1));
  const force=average>.00001?window*clamp(Math.abs(velocity)/(average*1.4),0,1):0;
  const angle=progress[i],sign=velocity<0?-1:1;
  const stride=Math.sin(angle)*loc.legSwing*force*sign;
  const arm=Math.sin(angle)*loc.armSwing*force*sign;
  const bob=Math.abs(Math.sin(angle))*loc.bounce*force;
  const signals={
   rearLeg:{rotation:-stride,y:-111-Math.max(0,-Math.sin(angle))*loc.lift*force},
   frontLeg:{rotation:stride,y:-111-Math.max(0,Math.sin(angle))*loc.lift*force},
   rearArm:{rotation:arm,y:-206-bob},frontArm:{rotation:-arm,y:-204-bob},
   headPivot:{rotation:-stride*.09,y:-251-bob},torso:{y:-216-bob}
  };
  for(const key of PARTS){
   const q=outputs.get(key),s=signals[key],at=r(t);
   q.y.push({t:at,value:r(s.y)});
   if(s.rotation!==undefined)q.rotation.push({t:at,value:r(s.rotation)});
  }
 }
 for(const key of PARTS){
  const o=byName.get(key),v=outputs.get(key);o.y=v.y;
  if(v.rotation.length)o.rotation=v.rotation;
 }
 return parts;
}
