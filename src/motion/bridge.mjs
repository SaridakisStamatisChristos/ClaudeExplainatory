// Thin adapter: compile declarative ClaudeExplainatory scenes into AetherMotion's
// established versioned film schema. Motion rendering remains owned by AetherMotion.
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,extname} from 'node:path';
import {resolveLocalAsset} from '../editorial/assets.mjs';
import {buildPuppetGroup} from './puppet.mjs';
export const MOTION_FPS=30;
export const sceneGraphOnly=script=>Array.isArray(script.scenes)&&script.scenes.length>0&&script.scenes.every(s=>s.template==='scene_graph');
const spatial=new Set(['x','y','height','width','radius','stroke','size']);
function scalar(v,frames,mult=1,path='track'){
 if(typeof v==='number')return v*mult;
 if(!Array.isArray(v)||!v.length)throw Error(path+': empty keyframe track');
 const keys=v.map(k=>({frame:Math.round(k.t*(frames-1)),value:k.value*mult,...(k.ease?{ease:k.ease}:{})}));
 for(let i=1;i<keys.length;i++)if(keys[i].frame<=keys[i-1].frame)
   throw Error(path+': normalized keyframes collapse onto the same source frame; use fewer keys');
 return keys;
}
function compileObject(obj,frames,mult,assets,imageSources,sceneIndex,path,symbols={},mangle=false){
 if(obj.kind==='puppet'){
  // Generated puppet is a deterministic hierarchical AetherMotion group; it never
  // runs a per-frame JS painter and uses no external image generation.
  const puppet=buildPuppetGroup(obj,frames);
  return compileObject(puppet,frames,mult,assets,imageSources,sceneIndex,path,symbols,mangle);
 }
 if(obj.kind==='instance'){
  const definition=symbols[obj.symbol];
  if(!Array.isArray(definition))throw Error('Unknown symbol '+obj.symbol);
  const group={...obj,kind:'group',children:[]};delete group.symbol;
  const compiled=compileObject(group,frames,mult,assets,imageSources,sceneIndex,path,symbols,mangle);
  compiled.children=definition.map((part,j)=>compileObject(part,frames,mult,assets,imageSources,sceneIndex,path+'_sym_'+j,symbols,true));
  return compiled;
 }
 const dest={...obj};
 if(mangle)dest.id='sym_'+createHash('sha256').update(sceneIndex+'/'+path+'/'+obj.id).digest('hex').slice(0,20);
 for(const key of ['x','y','height','width','radius','stroke','size','scale','rotation','opacity','phase','stride','gesture','mouth','reveal']){
  if(obj[key]===undefined)continue;
  // Body stride is limited to 30px in AetherMotion, even at higher delivery resolutions.
  const factor=spatial.has(key)?mult:1;
  dest[key]=['x','y','scale','rotation','opacity','phase','stride','gesture','mouth','reveal'].includes(key)
    ?scalar(obj[key],frames,factor,'object '+obj.id+'.'+key):obj[key]*factor;
 }
 if(obj.kind==='path'||obj.kind==='polygon')dest.points=obj.points.map(([x,y])=>[x*mult,y*mult]);
 if(obj.kind==='group')dest.children=obj.children.map((child,j)=>compileObject(child,frames,mult,assets,imageSources,sceneIndex,path+'_'+j,symbols,mangle));
 if(obj.kind==='image'){
  const id='image_'+sceneIndex+'_'+path;
  dest.asset=id;delete dest.src;
  const file='images/'+id+extname(obj.src).toLowerCase();
  assets[id]=file;imageSources.set(file,obj.src);
 }
 return dest;
}
export function compileMotionFilm(script,timing,{draft=true}={}){
 if(!sceneGraphOnly(script))throw Error('scene_graph productions must contain only scene_graph scenes (legacy scene mixing not yet supported)');
 if(timing.length!==script.scenes.length)throw Error('scene graph timing count does not match script');
 if(timing.length>32)throw Error('AetherMotion supports at most 32 narration cues per production');
 const mult=draft?1:2;let current=0;const assets={};const imageSources=new Map();
 const scenes=[],audio=[];
 for(const [i,scene] of script.scenes.entries()){
  const t=timing[i],frames=Math.round(t.duration*MOTION_FPS);
  if(!Number.isInteger(frames)||frames<2)throw Error('scene '+i+': invalid frame count');
  const p=scene.props;
  const camera=p.camera?Object.fromEntries(Object.entries(p.camera).map(([k,v])=>[k,scalar(v,frames,k==='zoom'?1:mult,'camera.'+k)])):undefined;
  const objects=p.objects.map((obj,j)=>compileObject(obj,frames,mult,assets,imageSources,i,String(j),script.scene_symbols??{}));
  const transition=script.scene_transition;
  let fade;
  if(transition){
   const n=Math.max(2,Math.round(transition.duration*MOTION_FPS));
   const incoming=i>0?n:0,outgoing=i<script.scenes.length-1?n:0;
   if(incoming+outgoing>frames)throw Error('scene '+i+': transitions exceed available narration-timed frames');
   if(incoming||outgoing)fade={color:transition.color,...(incoming?{inFrames:incoming}:{}),...(outgoing?{outFrames:outgoing}:{})};
  }
  scenes.push({id:'shot_'+i,frames,background:p.background,...(p.style?{style:{...p.style,...(p.style.penWidth?{penWidth:p.style.penWidth*mult}:{})}}:{}),...(camera?{camera}:{}),...(fade?{fade}:{}),objects});
  const speechFrames=Math.ceil(t.audioDuration*MOTION_FPS);
  if(speechFrames>frames)throw Error('scene '+i+': narration exceeds scene duration');
  audio.push({file:'audio/speech_'+i+'.wav',startFrame:current,endFrame:current+Math.max(1,speechFrames),role:'narration',caption:scene.say});
  current+=frames;
 }
 return {film:{version:'0.1',engine:'canvas2d',fps:MOTION_FPS,width:540*mult,height:960*mult,durationFrames:current,
   ...(Object.keys(assets).length?{assets}:{}),scenes,audio},imageSources};
}
export async function stageMotionFilm(script,timing,work,{draft=true,assetRoot}={}){
 const {film,imageSources}=compileMotionFilm(script,timing,{draft});
 await mkdir(join(work,'audio'),{recursive:true});
 await mkdir(join(work,'images'),{recursive:true});
 for(const [i,t] of timing.entries())await copyFile(t.wav,join(work,'audio','speech_'+i+'.wav'));
 for(const [name,src] of imageSources)await copyFile(resolveLocalAsset(src,assetRoot),join(work,name));
 const path=join(work,'motion-film.json');
 await writeFile(path,JSON.stringify(film,null,2)+'\n');
 return {film,path};
}
