import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {animateBipedInstance} from '../src/motion/locomotion.mjs';
import {compileMotionFilm} from '../src/motion/bridge.mjs';
const art=JSON.parse(await readFile(new URL('../examples/illustrated_village.json',import.meta.url),'utf8'));
const timing=[{duration:2.3,audioDuration:2},{duration:2.6,audioDuration:2}];
const near=(a,b,e=.001)=>assert.ok(Math.abs(a-b)<=e,`${a} differs from ${b}`);
const get=(scene,id)=>scene.objects.find(o=>o.id===id);
const native=(track,f)=>track.find(p=>p.frame===f)?.value;
test('depth-0 backplate and title cancel camera panning; distant hills have reduced parallax',()=>{
 const v=checkScript(art,undefined,{targetSeconds:15});assert.equal(v.ok,true,v.errors.join('; '));
 const film=compileMotionFilm(art,timing).film,s=film.scenes[0],last=s.frames-1;
 assert.equal(film.durationFrames,147);
 const sky=get(s,'sky'),hills=get(s,'hills'),title=get(s,'masthead');
 near(native(sky.x,last)-native(s.camera.x,last),0);
 near(native(title.x,last)-native(s.camera.x,last),43);
 const skyMove=native(sky.x,last)-native(sky.x,0);
 const hillMove=native(hills.x,last)-native(hills.x,0);
 near(skyMove, -12);
 near(hillMove,-12*(1-.28)-7); // hills also have its own source pan -8 -> -15
 const actualHill=hillMove-(-12);
 assert.ok(Math.abs(actualHill)<Math.abs(-12),'background hills must respond less than uncorrected world');
 assert.equal(Object.hasOwn(sky,'depth'),false,'compiled AetherMotion contract never sees source-only depth');
});
test('foreground characters exaggerate camera parallax while keeping native bounds and controls',()=>{
 const film=compileMotionFilm(art,timing).film,s=film.scenes[0],last=s.frames-1;
 const person=get(s,'travelerA');
 assert.equal(person.kind,'group');
 const nativeTravel=native(person.x,last)-native(person.x,0),authorTravel=152;
 near(nativeTravel-authorTravel,(1-1.32)*-12);
 assert.ok(person.x.length>=60);
 const big=compileMotionFilm(art,timing,{draft:false}).film;
 assert.equal(big.width,1080);
 near(native(get(big.scenes[0],'sky').x,last),2*native(get(s,'sky').x,last));
});
test('sprite gait is linked to displacement rather than a fixed independent cycle',()=>{
 const source=art.scene_symbols.traveler, a=art.scenes[0].props.objects.find(o=>o.id==='travelerA');
 const before=JSON.stringify(source);
 const parts=animateBipedInstance(a,source,69),leg=parts.find(p=>p.id==='frontLeg'),arm=parts.find(p=>p.id==='frontArm');
 assert.notEqual(leg.rotation[12].value,leg.rotation[27].value);
 assert.ok(new Set(leg.rotation.map(q=>q.value)).size>20);
 assert.ok(arm.rotation.some(q=>q.value<0)&&arm.rotation.some(q=>q.value>0));
 assert.equal(leg.rotation[0].value,0);
 near(leg.rotation.at(-1).value,0);
 assert.equal(JSON.stringify(source),before,'shared symbol rig must remain immutable');
 const stationary={...a,x:180},rest=animateBipedInstance(stationary,source,69);
 assert.ok(rest.find(p=>p.id==='frontLeg').rotation.every(q=>q.value===0),'stationary figures must not walk in place');
});
test('travel speed easing eases the gait to a stop and can follow a slower/reverse character',()=>{
 const base=art.scenes[0].props.objects.find(o=>o.id==='travelerA');
 const o=structuredClone(base);
 o.x=[{t:0,value:40,ease:'linear'},{t:.6,value:200,ease:'hold'},{t:1,value:200}];
 const samples=animateBipedInstance(o,art.scene_symbols.traveler,101);
 const leg=samples.find(x=>x.id==='frontLeg');
 assert.ok(leg.rotation.some(q=>Math.abs(q.value)>5));
 assert.ok(leg.rotation.slice(75).every(q=>q.value===0),'gait must stop when travel stops');
 const reverse=structuredClone(o);reverse.x=[{t:0,value:200},{t:1,value:40}];
 const legs=animateBipedInstance(reverse,art.scene_symbols.traveler,101);
 assert.ok(legs.find(x=>x.id==='frontLeg').rotation.some(q=>Math.abs(q.value)>3));
});
test('top-level depth and locomotion reject hostile or incompatible source declarations',()=>{
 const invalid=structuredClone(art),scene=invalid.scenes[0].props;
 scene.objects[0].depth=9;
 assert.match(checkScript(invalid).errors.join(' '),/depth/);
 scene.objects[0].depth=0;
 invalid.scene_symbols.traveler[0].depth=.5;
 assert.match(checkScript(invalid).errors.join(' '),/only on top-level/);
 delete invalid.scene_symbols.traveler[0].depth;
 const p=scene.objects.find(x=>x.id==='travelerA');
 p.locomotion.stepLength=0;
 assert.match(checkScript(invalid).errors.join(' '),/stepLength/);
 p.locomotion.stepLength=70;
 p.locomotion.dynamic='eval';
 assert.match(checkScript(invalid).errors.join(' '),/unknown property/);
 delete p.locomotion.dynamic;
 p.symbol='oak';
 assert.match(checkScript(invalid).errors.join(' '),/sprite rig requires/);
});
test('compiled film has a persistent contact shadow and two independently driven walkers',()=>{
 const {film,imageSources}=compileMotionFilm(art,timing);
 assert.ok([...imageSources.values()].some(a=>a.includes('contact-shadow.png')));
 for(const shot of film.scenes){
  for(const root of shot.objects.filter(x=>x.id.startsWith('traveler'))){
   assert.ok(root.children.some(child=>child.kind==='image'),'sprite should contain PNG-grounded contact shadow');
   const legs=root.children.filter((child,index)=>['rearLeg','frontLeg'].includes(art.scene_symbols.traveler[index]?.id));
   assert.equal(legs.length,2);
   assert.ok(legs.every(leg=>Array.isArray(leg.rotation)));
  }
 }
});
