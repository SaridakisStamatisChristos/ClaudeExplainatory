// Closed, source-level contract for AetherMotion scene graphs.
// Motion keys use normalized scene progress (t in 0..1), not guessed speech durations.
import {resolveLocalAsset} from '../editorial/assets.mjs';
import {statSync} from 'node:fs';
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const number=x=>typeof x==='number'&&Number.isFinite(x);
const color=x=>typeof x==='string'&&/^#[a-fA-F0-9]{6}$/.test(x);
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const exact=(v,keys,p,errors)=>{for(const k of Object.keys(v))if(!keys.includes(k))errors.push(p+": unknown property '"+k+"'");};
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const span=(v,min,max)=>number(v)&&v>=min&&v<=max;
function track(v,p,errors,min,max) {
 const entries=Array.isArray(v)?v:null;
 if(!entries){if(!span(v,min,max))errors.push(p+': expected finite number in ['+min+', '+max+'] or normalized keyframes');return;}
 if(entries.length<1||entries.length>48){errors.push(p+': expected 1–48 keyframes');return;}
 let previous=-1;
 for(const [i,key] of entries.entries()){
  const at=p+'['+i+']';
  if(!record(key)){errors.push(at+': expected keyframe object');continue;}
  exact(key,['t','value','ease'],at,errors);
  if(!span(key.t,0,1)||key.t<=previous)errors.push(at+'.t: times must increase strictly in [0, 1]');
  if(!span(key.value,min,max))errors.push(at+'.value: out of range');
  if(key.ease!==undefined&&!['linear','smooth','hold'].includes(key.ease))errors.push(at+'.ease: expected linear, smooth, or hold');
  if(span(key.t,0,1))previous=key.t;
 }
}
const animated={
 x:[-100000,100000], y:[-100000,100000], rotation:[-100000,100000],
 opacity:[0,1], scale:[.001,100], reveal:[0,1],
 phase:[-100000,100000], stride:[0,30], gesture:[-100000,100000], mouth:[-100000,100000]
};
const shapeFields={
 group:['children'],instance:['symbol'],puppet:['height','skin','shirt','trousers','hair','shoes','expression','outfit','facing','walk','wave'],polygon:['points','color'],glow:['radius','color'],
 rect:['width','height','color'],circle:['radius','color'],path:['points','stroke','color','reveal'],
 text:['text','size','color','face','bold'],image:['src','width','height'],
 actor:['height','skin','shirt','trousers','hair','shoes','expression','facing','phase','stride','gesture','mouth']
};
const common=['id','kind','x','y','scale','rotation','opacity'];
function validateObject(obj,path,errors,assetRoot,ids,stats,depth=1,symbols=null){
 if(depth>8){errors.push(path+': nested group depth exceeds eight');return;}
 if(++stats.total>256){errors.push(path+': scene graph exceeds 256 drawable objects');return;}
 if(!record(obj)){errors.push(path+': expected object');return;}
 if(!Object.hasOwn(shapeFields,obj.kind)){errors.push(path+'.kind: unsupported drawable');return;}
 exact(obj,[...common,...shapeFields[obj.kind]],path,errors);
 if(!id(obj.id))errors.push(path+'.id: expected safe unique identifier');
 else if(ids.has(obj.id))errors.push(path+'.id: duplicate identifier');
 else ids.add(obj.id);
 for(const k of ['x','y','scale','rotation','opacity'])
   if(obj[k]!==undefined)track(obj[k],path+'.'+k,errors,...animated[k]);
 for(const k of ['width','height','radius','stroke','size'])
   if(obj[k]!==undefined&&!span(obj[k],.001,16384))errors.push(path+'.'+k+': expected positive finite dimension');
 const required={puppet:['height','skin','shirt','trousers','hair','shoes'],instance:['symbol'],group:['children'],polygon:['points'],glow:['radius'],rect:['width','height'],circle:['radius'],path:['points','stroke'],text:['text','size'],image:['src','width','height'],actor:['height','skin','shirt','trousers','hair','shoes']};
 for(const k of required[obj.kind])if(obj[k]===undefined)errors.push(path+'.'+k+': required field');
 if(['rect','circle','path','text','polygon','glow'].includes(obj.kind)){
  if(!color(obj.color))errors.push(path+'.color: expected #RRGGBB');
 }
 if(obj.kind==='path'||obj.kind==='polygon'){
  const min=obj.kind==='polygon'?3:2;
  if(!Array.isArray(obj.points)||obj.points.length<min||obj.points.length>64||!obj.points.every(q=>Array.isArray(q)&&q.length===2&&q.every(v=>span(v,-100000,100000))))
    errors.push(path+'.points: expected '+min+'–64 finite coordinate pairs');
  if(obj.reveal!==undefined)track(obj.reveal,path+'.reveal',errors,...animated.reveal);
 }
 if(obj.kind==='instance'){
  if(!symbols || typeof obj.symbol!=='string' || !Object.hasOwn(symbols,obj.symbol))
   errors.push(path+'.symbol: unknown or prohibited reusable symbol');
  else {
   const walk=list=>list.reduce((n,part)=>n+1+(part.kind==='group'?walk(part.children||[]):0),0);
   stats.total+=walk(symbols[obj.symbol]);
   if(stats.total>256)errors.push(path+': expanded scene graph exceeds 256 drawable objects');
  }
 }
 if(obj.kind==='group'){
  if(!Array.isArray(obj.children)||obj.children.length<1||obj.children.length>64)
   errors.push(path+'.children: expected 1–64 nested objects');
  else obj.children.forEach((child,j)=>validateObject(child,path+'.children['+j+']',errors,assetRoot,ids,stats,depth+1,symbols));
 }
 if(obj.kind==='text'){
  if(!text(obj.text,200))errors.push(path+'.text: expected 1–200 characters');
  if(obj.face!==undefined&&!['serif','sans','mono'].includes(obj.face))errors.push(path+'.face: unsupported font family');
  if(obj.bold!==undefined&&typeof obj.bold!=='boolean')errors.push(path+'.bold: expected boolean');
 }
 if(obj.kind==='puppet'){
  stats.total+=48; // conservative bound for expanded articulated character parts
  if(stats.total>256)errors.push(path+': scene graph puppet budget exceeded');
  for(const k of ['skin','shirt','trousers','hair','shoes'])if(!color(obj[k]))errors.push(path+'.'+k+': expected #RRGGBB');
  if(!span(obj.height,40,500))errors.push(path+'.height: expected 40–500');
  if(obj.expression!==undefined&&!['neutral','happy','curious','concerned'].includes(obj.expression))errors.push(path+'.expression: unsupported expression');
  if(obj.outfit!==undefined&&!['villager','merchant','scholar'].includes(obj.outfit))errors.push(path+'.outfit: expected villager, merchant or scholar');
  if(obj.facing!==undefined&&!['left','right'].includes(obj.facing))errors.push(path+'.facing: expected left or right');
  if(obj.walk!==undefined){
   const q=obj.walk,a=path+'.walk';
   if(!record(q))errors.push(a+': expected action object');
   else{
    exact(q,['start','end','cycles','strength'],a,errors);
    if(!span(q.start,0,1)||!span(q.end,0,1)||q.end<=q.start)errors.push(a+': expected 0<=start<end<=1');
    if(!span(q.cycles,.25,10))errors.push(a+'.cycles: expected 0.25–10');
    if(!span(q.strength,0,1))errors.push(a+'.strength: expected 0–1');
   }
  }
  if(obj.wave!==undefined){
   const q=obj.wave,a=path+'.wave';
   if(!record(q))errors.push(a+': expected action object');
   else{
    exact(q,['start','end','cycles','arm'],a,errors);
    if(!span(q.start,0,1)||!span(q.end,0,1)||q.end<=q.start)errors.push(a+': expected 0<=start<end<=1');
    if(!span(q.cycles,.5,8))errors.push(a+'.cycles: expected 0.5–8');
    if(!['left','right'].includes(q.arm))errors.push(a+'.arm: expected left or right');
   }
  }
 }
 if(obj.kind==='actor'){
  for(const k of ['skin','shirt','trousers','hair','shoes'])if(!color(obj[k]))errors.push(path+'.'+k+': expected color');
  if(obj.expression!==undefined&&!['neutral','happy','curious','concerned'].includes(obj.expression))errors.push(path+'.expression: unsupported expression');
  if(obj.facing!==undefined&&!['left','right'].includes(obj.facing))errors.push(path+'.facing: expected left or right');
  for(const k of ['phase','stride','gesture','mouth'])if(obj[k]!==undefined)track(obj[k],path+'.'+k,errors,...animated[k]);
 }
 if(obj.kind==='image'){
  if(typeof obj.src!=='string'||!/\.(?:png|jpe?g)$/i.test(obj.src))errors.push(path+'.src: expected assets/... PNG or JPEG');
  else try{
   const file=resolveLocalAsset(obj.src,assetRoot);
   if(statSync(file).size>8*1024*1024)errors.push(path+'.src: AetherMotion image must be at most 8 MiB');
  }catch(e){errors.push(path+'.src: '+e.message);}
 }
}
export function validateSceneSymbols(symbols,errors,assetRoot){
 if(!record(symbols)){errors.push('scene_symbols: expected object catalog');return;}
 const entries=Object.entries(symbols);
 if(entries.length<1||entries.length>12){errors.push('scene_symbols: expected 1–12 named symbols');return;}
 for(const [name,parts] of entries){
  const p='scene_symbols.'+name;
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,23}$/.test(name))
   errors.push(p+': expected safe symbol name up to 24 characters');
  if(!Array.isArray(parts)||parts.length<1||parts.length>32){
   errors.push(p+': expected 1–32 reusable drawable parts');continue;
  }
  const ids=new Set(),stats={total:0};
  parts.forEach((part,j)=>validateObject(part,p+'['+j+']',errors,assetRoot,ids,stats,1,null));
 }
}
export function validateSceneGraphProps(props,p,errors,assetRoot,symbols={}){
 if(!record(props)){errors.push(p+': expected scene_graph props object');return;}
 exact(props,['background','style','camera','objects'],p,errors);
 if(!color(props.background))errors.push(p+'.background: expected #RRGGBB');
 if(props.style!==undefined){
  if(!record(props.style))errors.push(p+'.style: expected object');
  else{
   exact(props.style,['name','accent','ink','penWidth'],p+'.style',errors);
   if(!['cartoon','whiteboard','infographic'].includes(props.style.name))errors.push(p+'.style.name: invalid style');
   for(const k of ['accent','ink'])if(props.style[k]!==undefined&&!color(props.style[k]))errors.push(p+'.style.'+k+': expected color');
   if(props.style.penWidth!==undefined&&!span(props.style.penWidth,.1,100))errors.push(p+'.style.penWidth: invalid');
  }
 }
 if(props.camera!==undefined){
  if(!record(props.camera))errors.push(p+'.camera: expected object');
  else{
   exact(props.camera,['x','y','zoom'],p+'.camera',errors);
   for(const k of ['x','y'])if(props.camera[k]!==undefined)track(props.camera[k],p+'.camera.'+k,errors,-100000,100000);
   if(props.camera.zoom!==undefined)track(props.camera.zoom,p+'.camera.zoom',errors,.001,100);
  }
 }
 if(!Array.isArray(props.objects)||props.objects.length<1||props.objects.length>80){
  errors.push(p+'.objects: expected 1–80 independent objects');return;
 }
 const ids=new Set(),stats={total:0};
 for(const [i,obj] of props.objects.entries()){
  validateObject(obj,p+'.objects['+i+']',errors,assetRoot,ids,stats,1,symbols);
 }
}
