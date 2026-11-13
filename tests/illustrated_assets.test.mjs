import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {checkScript} from '../src/spec.mjs';
import {compileMotionFilm} from '../src/motion/bridge.mjs';
const ROOT=new URL('../',import.meta.url);
const read=async p=>readFile(new URL(p,ROOT));
const manifest=JSON.parse(await read('assets/artwork/medieval/manifest.json'));
const evidence=JSON.parse(await read('assets/generated/medieval/manifest.json'));
const script=JSON.parse(await read('examples/illustrated_village.json'));
const timings=[{duration:2.3,audioDuration:2},{duration:2.6,audioDuration:2}];
test('all 11 editable vector masters rasterize to matching dimensioned PNG files',async()=>{
 assert.equal(manifest.assets.length,11);
 assert.equal(evidence.assets.length,11);
 for(const item of manifest.assets){
  const svg=String(await read('assets/artwork/medieval/'+item.src));
  assert.match(svg,/^<svg/);
  const filename='assets/generated/medieval/'+item.name+'.png';
  const png=await read(filename);
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),item.width);
  assert.equal(png.readUInt32BE(20),item.height);
  const row=evidence.assets.find(x=>x.name===item.name);
  assert.equal(row.sha256,createHash('sha256').update(png).digest('hex'));
  assert.ok((await stat(new URL(filename,ROOT))).size<8*1024*1024);
 }
});
test('illustrated JSON is reusable and valid with independent moving image layers',()=>{
 const checked=checkScript(script,undefined,{targetSeconds:15});
 assert.equal(checked.ok,true,checked.errors.join('; '));
 const {film,imageSources}=compileMotionFilm(script,timings);
 assert.equal(film.durationFrames,147);
 assert.ok(imageSources.size>16);
 assert.ok(script.scene_symbols.traveler.some(o=>o.kind==='group'));
 const first=film.scenes[0].objects.find(o=>o.id==='travelerA');
 const second=film.scenes[1].objects.find(o=>o.id==='travelerB');
 assert.equal(first.kind,'group');
 assert.equal(second.kind,'group');
 assert.notEqual(first.x[0].value,first.x[1].value);
 assert.ok(first.children.some(x=>x.kind==='group'&&Array.isArray(x.rotation)));
});
test('unsafe asset paths and missing source are rejected by the existing guarded validator',()=>{
 const unsafe=structuredClone(script);
 unsafe.scene_symbols.traveler[0].children[0].src='assets/../secret.png';
 assert.match(checkScript(unsafe).errors.join(' '),/expected relative assets|traversal/);
 const unknown=structuredClone(script);
 unknown.scene_symbols.cottage[0].src='assets/generated/medieval/does-not-exist.png';
 assert.match(checkScript(unknown).errors.join(' '),/no such file|ENOENT|not found/i);
});
