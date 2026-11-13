import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {compileMotionFilm,sceneGraphOnly} from '../src/motion/bridge.mjs';
const example=JSON.parse(await readFile(new URL('../examples/scene_graph_village.json',import.meta.url),'utf8'));
const timing=example.scenes.map((s,i)=>({duration:i===0?2.3:2.6,audioDuration:2.0,wav:'/tmp/unused.wav'}));
test('scene graph is validated and remains independent of fixed chart templates',()=>{
 const r=checkScript(example,undefined,{targetSeconds:15});
 assert.equal(r.ok,true,r.errors.join('; '));
 assert.equal(sceneGraphOnly(example),true);
 assert.ok(example.scenes.some(s=>s.props.objects.some(o=>o.kind==='actor')));
});
test('shot and narration durations compile from measured audio, with normalized keyframes',()=>{
 const {film}=compileMotionFilm(example,timing);
 assert.equal(film.version,'0.1');assert.equal(film.engine,'canvas2d');
 assert.equal(film.width,540);assert.equal(film.height,960);
 assert.equal(film.durationFrames,147);
 assert.equal(film.scenes[0].frames,69);assert.equal(film.scenes[1].frames,78);
 assert.equal(film.audio[1].startFrame,69);
 const actor=film.scenes[0].objects.find(o=>o.id==='walking_builder');
 assert.equal(actor.x[0].frame,0);
 assert.equal(actor.x[1].frame,58);
 assert.equal(actor.x[1].value,346);
 assert.equal(film.scenes[0].camera.zoom[0].value,1);
});
test('high-resolution compile scales geometry, not object motion phases',()=>{
 const {film}=compileMotionFilm(example,timing,{draft:false});
 assert.equal(film.width,1080);assert.equal(film.height,1920);
 const actor=film.scenes[0].objects.find(o=>o.id==='walking_builder');
 assert.equal(actor.x[1].value,692);
 assert.equal(actor.height,224);
 assert.equal(actor.phase[1].value,5.2);
});
test('reject mixed engine, duplicate ids, invalid tracks and props injection',()=>{
 const mixed=structuredClone(example);mixed.scenes[1].template='counter';
 assert.match(checkScript(mixed).errors.join(' '),/graph-only/);
 const duplicate=structuredClone(example);
 duplicate.scenes[0].props.objects[1].id=duplicate.scenes[0].props.objects[0].id;
 assert.match(checkScript(duplicate).errors.join(' '),/duplicate identifier/);
 const bad=structuredClone(example);bad.scenes[0].props.objects[0].x=[{t:0,value:10},{t:0,value:40}];
 assert.match(checkScript(bad).errors.join(' '),/times must increase strictly/);
 bad.scenes[0].props.objects[0].x=2;
 bad.scenes[0].props.unsafe='javascript:alert(1)';
 assert.match(checkScript(bad).errors.join(' '),/unknown property/);
});
test('keyframe collisions become a clear explicit error before rendering',()=>{
 const altered=structuredClone(example);
 altered.scenes[0].props.camera.x=[{t:0,value:0},{t:.0001,value:1}];
 assert.equal(checkScript(altered).ok,true);
 assert.throws(()=>compileMotionFilm(altered,timing),/collapse onto the same source frame/);
});

test('nested grouped artwork and native fade-through-color compile without changing frame count',()=>{
  const r=checkScript(example,undefined,{targetSeconds:15});
  assert.equal(r.ok,true,r.errors.join('; '));
  const {film}=compileMotionFilm(example,timing);
  assert.equal(film.durationFrames,147);
  assert.deepEqual(film.scenes[0].fade,{color:'#1C2937',outFrames:8});
  assert.deepEqual(film.scenes[1].fade,{color:'#1C2937',inFrames:8});
  const group=film.scenes[1].objects.find(o=>o.id==='market_stall');
  assert.equal(group.kind,'group');
  assert.ok(group.children.some(o=>o.kind==='polygon'));
  assert.ok(group.children.some(o=>o.kind==='group'));
  assert.ok(film.scenes[0].objects.some(o=>o.kind==='glow'));
});
test('nested identifiers, bad polygons, excessive depth and mismatched transition are rejected',()=>{
  const dupe=structuredClone(example);
  dupe.scenes[1].props.objects.find(o=>o.id==='market_stall').children[1].id=dupe.scenes[1].props.objects.find(o=>o.id==='market_stall').children[0].id;
  assert.match(checkScript(dupe).errors.join(' '),/duplicate identifier/);
  const poly=structuredClone(example);
  poly.scenes[1].props.objects.find(o=>o.id==='market_stall').children[3].points=[[0,0],[2,2]];
  assert.match(checkScript(poly).errors.join(' '),/3–64 finite coordinate pairs/);
  const invalid=structuredClone(example);
  invalid.scene_transition.kind='crossfade';
  assert.match(checkScript(invalid).errors.join(' '),/expected fade/);
  const short=structuredClone(example);
  assert.throws(()=>compileMotionFilm(short,[{duration:.2,audioDuration:.1},{duration:2.6,audioDuration:2}]),/transitions exceed/);
});

test('reusable symbol catalog expands into native hierarchical groups with unique child IDs',()=>{
 const r=checkScript(example,undefined,{targetSeconds:15});
 assert.equal(r.ok,true,r.errors.join('; '));
 const {film}=compileMotionFilm(example,timing);
 const first=film.scenes[0].objects.find(o=>o.id==='fresh_cottage');
 const second=film.scenes[1].objects.find(o=>o.id==='distant_cottage');
 assert.equal(first.kind,'group');
 assert.equal(second.kind,'group');
 assert.equal(first.children.length,6);
 assert.equal(second.children.length,6);
 assert.notEqual(first.children[0].id,second.children[0].id);
 assert.ok(first.children.some(c=>c.kind==='polygon'));
 assert.equal(first.x,264);
 assert.equal(first.scale[1].value,.95);
});
test('unknown reusable symbol and recursively injected symbol are rejected at script validation',()=>{
 const unknown=structuredClone(example);
 unknown.scenes[0].props.objects.at(-1).symbol='does_not_exist';
 assert.match(checkScript(unknown).errors.join(' '),/unknown or prohibited reusable symbol/);
 const rec=structuredClone(example);
 rec.scene_symbols.oak_tree.push({kind:'instance',id:'loop',symbol:'oak_tree'});
 assert.match(checkScript(rec).errors.join(' '),/unknown or prohibited reusable symbol/);
 const duplicate=structuredClone(example);
 duplicate.scene_symbols.cottage[1].id='wall';
 assert.match(checkScript(duplicate).errors.join(' '),/duplicate identifier/);
 const malicious=structuredClone(example);
 malicious.scene_symbols.cottage[0].color='javascript:evil';
 assert.match(checkScript(malicious).errors.join(' '),/expected #RRGGBB/);
});
