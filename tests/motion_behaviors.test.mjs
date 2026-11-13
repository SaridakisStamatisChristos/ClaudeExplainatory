import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileBehaviorTracks,sampleSource} from '../src/motion/behaviors.mjs';
import {compileMotionFilm} from '../src/motion/bridge.mjs';
import {checkScript} from '../src/spec.mjs';
const art=JSON.parse(await readFile(new URL('../examples/illustrated_village.json',import.meta.url),'utf8'));
const fake=[{duration:2.3,audioDuration:2},{duration:2.6,audioDuration:2}];
const near=(a,b,epsilon=.001)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
test('normalized source keys reproduce smooth/hold/linear semantics without time units',()=>{
 near(sampleSource([{t:0,value:10,ease:'smooth'},{t:1,value:50}],.25,0),16.25);
 near(sampleSource([{t:0,value:10,ease:'hold'},{t:1,value:50}],.5,0),10);
 near(sampleSource([{t:0,value:10},{t:1,value:50}],.5,0),30);
 near(sampleSource(undefined,.5,15),15);
});
test('float, sway and pulse combine with independent absolute tracks, seam-safe',()=>{
 const o={id:'tree',kind:'group',x:60,y:300,rotation:0,scale:1,behaviors:[
  {kind:'float',axis:'y',amplitude:10,cycles:1},
  {kind:'sway',degrees:10,cycles:1},
  {kind:'pulse',amount:.1,cycles:1}
 ]};
 const tracks=compileBehaviorTracks(o,101);
 assert.deepEqual(Object.keys(tracks).sort(),['rotation','scale','y']);
 near(tracks.y[0].value,300);near(tracks.y[25].value,310);near(tracks.y[75].value,290);near(tracks.y[100].value,300);
 near(tracks.rotation[25].value,10);near(tracks.scale[25].value,1.1);
 near(tracks.scale[75].value,.9);
});
test('path-following moves by arc-length and can orient child group along tangent',()=>{
 const o={id:'boat',kind:'group',x:7,y:20,rotation:0,behaviors:[
  {kind:'path',points:[[0,0],[100,0],[100,100]],ease:'linear',orient:true}
 ]};
 const r=compileBehaviorTracks(o,21);
 near(r.x[0].value,7);near(r.y[0].value,20);
 near(r.x[10].value,107);near(r.y[10].value,20);
 near(r.x[15].value,107);near(r.y[15].value,70);
 near(r.rotation[15].value,90);
 near(r.x[20].value,107);near(r.y[20].value,120);
});
test('orbit starts and ends at source origin; >256 frame samples remain legal',()=>{
 const r=compileBehaviorTracks({id:'satellite',x:10,y:20,behaviors:[{
  kind:'orbit',radiusX:38,radiusY:24,cycles:1,phase:0
 }]},540);
 assert.ok(r.x.length<=256&&r.x.length>=250);
 near(r.x[0].value,10);near(r.y[0].value,20);
 near(r.x.at(-1).value,10);near(r.y.at(-1).value,20);
 for(const k of ['x','y'])for(let i=1;i<r[k].length;i++)assert.ok(r[k][i].frame>r[k][i-1].frame);
});
test('native AetherMotion film supports behavior-driven sprites, instances and nested groups',()=>{
 const original=JSON.stringify(art),result=checkScript(art,undefined,{targetSeconds:15});
 assert.equal(result.ok,true,result.errors.join('; '));
 const film=compileMotionFilm(art,fake).film;
 assert.equal(JSON.stringify(art),original,'compilation must not mutate the authoring script');
 assert.equal(film.durationFrames,147);
 assert.equal(film.scenes[0].fade?.outFrames,7);
 const bird=film.scenes[0].objects.find(x=>x.id==='flockA');
 assert.equal(bird.kind,'group');
 assert.ok(bird.x.length>=60&&bird.y.length>=60);
 assert.ok(bird.x.at(-1).value>bird.x[0].value+300);
 const cloud=film.scenes[0].objects.find(x=>x.id==='cloudA');
 assert.ok(cloud.y.some(q=>q.value!==cloud.y[0].value));
 const traveler=film.scenes[0].objects.find(x=>x.id==='travelerA');
 assert.ok(traveler.y.some(q=>q.value!==traveler.y[0].value));
 const tree=film.scenes[1].objects.find(x=>x.id==='oakB');
 assert.ok(tree.rotation.some(q=>q.value!==tree.rotation[0].value));
 const shop=film.scenes[1].objects.find(x=>x.id==='marketStall');
 assert.ok(shop.scale.some(q=>q.value!==shop.scale[0].value));
});
test('malformed behaviors are strictly rejected before runtime, including adversarial keys',()=>{
 const base=structuredClone(art);
 const obj=base.scenes[0].props.objects.find(x=>x.id==='flockA');
 obj.behaviors=[{kind:'path',points:[[0,0],[0,0]],orient:true}];
 assert.match(checkScript(base).errors.join(' '),/consecutive coordinates must be distinct/);
 obj.behaviors=[{kind:'float',axis:'y',amplitude:Infinity,cycles:2}];
 assert.match(checkScript(base).errors.join(' '),/amplitude/);
 obj.behaviors=[{kind:'float',axis:'y',amplitude:4,cycles:1,eval:'execute'}];
 assert.match(checkScript(base).errors.join(' '),/unknown property/);
 obj.behaviors=[{kind:'path',points:[[0,0],[10,1]],start:0.95,end:0.97}];
 assert.match(checkScript(base).errors.join(' '),/at least 0.05/);
 obj.behaviors=[{kind:'orbit',radiusX:5,radiusY:5,cycles:-2}];
 assert.match(checkScript(base).errors.join(' '),/cycles/);
 obj.behaviors=[{kind:'path',points:[[0,0],[12,2]]},{kind:'path',points:[[0,0],[15,2]]}];
 assert.match(checkScript(base).errors.join(' '),/at most one path/);
});
test('behavior overflow fails explicitly instead of producing an invalid native film',()=>{
 const obj={id:'runaway',x:99999,y:20,behaviors:[{kind:'orbit',radiusX:20,radiusY:1,cycles:1}]};
 assert.throws(()=>compileBehaviorTracks(obj,101),/out of native renderer bounds/);
});
