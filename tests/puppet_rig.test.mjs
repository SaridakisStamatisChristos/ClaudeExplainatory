import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildPuppetGroup} from '../src/motion/puppet.mjs';
import {compileMotionFilm} from '../src/motion/bridge.mjs';
import {checkScript} from '../src/spec.mjs';
const example=JSON.parse(await readFile(new URL('../examples/scene_graph_puppets.json',import.meta.url),'utf8'));
const timings=[{duration:2.3,audioDuration:2},{duration:2.6,audioDuration:2}];
const descendants=o=>[o,...(o.children||[]).flatMap(descendants)];
test('puppet scene validates and compiles multiple unique articulated character rigs',()=>{
 const r=checkScript(example,undefined,{targetSeconds:15});
 assert.equal(r.ok,true,r.errors.join('; '));
 const {film}=compileMotionFilm(example,timings);
 assert.equal(film.durationFrames,147);
 assert.equal(film.scenes[0].objects.find(o=>o.id==='walking_builder')?.kind,'group');
 assert.equal(film.scenes[1].objects.find(o=>o.id==='vendor')?.kind,'group');
 const ids=film.scenes[1].objects.flatMap(descendants).map(o=>o.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(film.scenes[1].objects.some(o=>o.id==='visitor'));
});
test('generated characters have moving legs, waving hands, and head tracks',()=>{
 const p=example.scenes[1].props.objects.find(o=>o.id==='vendor');
 const obj=buildPuppetGroup(p,78);
 const nodes=descendants(obj);
 const legs=nodes.filter(x=>x.id==='leg_left'||x.id==='leg_right');
 assert.equal(legs.length,2);
 assert.notDeepEqual(legs[0].rotation,legs[1].rotation);
 assert.ok(new Set(legs[0].rotation.map(x=>x.value)).size>3);
 const hand=nodes.find(x=>x.id==='arm_right');
 assert.ok(hand.rotation.some(k=>k.value< -45));
 assert.ok(nodes.some(x=>x.id==='head'));
 assert.ok(nodes.length>=35);
});
test('animation tracks are legal frame-indexed native AetherMotion key arrays',()=>{
 const film=compileMotionFilm(example,timings).film;
 for(const shot of film.scenes)for(const node of shot.objects.flatMap(descendants)){
  for(const k of ['x','y','opacity','scale','rotation']){
   const v=node[k];if(!Array.isArray(v))continue;
   assert.ok(v.length>0&&v.length<=256);
   for(let i=0;i<v.length;i++){
    assert.ok(Number.isInteger(v[i].frame) && v[i].frame>=0 && v[i].frame<shot.frames);
    if(i)assert.ok(v[i].frame>v[i-1].frame);
   }
  }
 }
});
test('invalid walk/wave bounds, unsupported costume and hostile keys fail strict validation',()=>{
 const bad=structuredClone(example),p=bad.scenes[1].props.objects.find(o=>o.id==='vendor');
 p.walk.cycles=Infinity;
 assert.match(checkScript(bad).errors.join(' '),/cycles/);
 p.walk.cycles=3;p.wave.arm='javascript';
 assert.match(checkScript(bad).errors.join(' '),/left or right/);
 p.wave.arm='right';p.outfit='laser';
 assert.match(checkScript(bad).errors.join(' '),/villager, merchant or scholar/);
 p.outfit='merchant';p.eval='evil';
 assert.match(checkScript(bad).errors.join(' '),/unknown property/);
});
test('puppet cycles adapt to shot length but the source script stays unchanged',()=>{
 const before=JSON.stringify(example);
 const a=compileMotionFilm(example,timings).film;
 const b=compileMotionFilm(example,[{duration:3.2,audioDuration:2},{duration:3.6,audioDuration:2}]).film;
 assert.equal(a.scenes[0].frames,69);
 assert.equal(b.scenes[0].frames,96);
 assert.equal(JSON.stringify(example),before);
 assert.notEqual(a.scenes[0].objects.find(o=>o.id==='walking_builder').children[1].rotation.length,
   b.scenes[0].objects.find(o=>o.id==='walking_builder').children[1].rotation.length);
});
