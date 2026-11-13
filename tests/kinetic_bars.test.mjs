import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {buildHTML} from '../src/composition.mjs';
const script=JSON.parse(await readFile(new URL('../examples/kinetic_bars.example.json',import.meta.url),'utf8'));
const timeline=script.scenes.map((s,i)=>({start:i*2.3,duration:2.3,audioDuration:2.1,
 words:s.say.trim().split(/\s+/).map((word,j)=>({word,start:j*.23,end:(j+1)*.23}))}));
test('chart validates and emits full-canvas animated bars',()=>{
 const result=checkScript(script,undefined,{targetSeconds:15});
 assert.equal(result.ok,true,result.errors.join('; '));
 const html=buildHTML(script,timeline,{draft:true});
 assert.match(html,/data-type="kinetic_bars"/);
 assert.equal((html.match(/data-kb-row="\d+"/g)||[]).length,3);
 assert.match(html,/scaleX:value\/100/);
 assert.match(html,/onUpdate:update/);
 assert.doesNotMatch(html,/ed-player-chrome|ed-play-icon|ed-progress-fill/);
});
test('rejects bad metrics and duplicate/unsafe fields',()=>{
 const b=structuredClone(script);
 b.scenes[0].props.bars[0].value=101;
 assert.match(checkScript(b).errors.join(' '),/integer in \[0, 100\]/);
 b.scenes[0].props.bars[0].value=25;b.scenes[0].props.bars[1].label='Start';
 assert.match(checkScript(b).errors.join(' '),/duplicate label/);
 b.scenes[0].props.bars[1].label='Middle';b.scenes[0].props.tone='neon';
 assert.match(checkScript(b).errors.join(' '),/midnight or parchment/);
 b.scenes[0].props.tone='midnight';b.scenes[0].props.bars[0].rogue=true;
 assert.match(checkScript(b).errors.join(' '),/unknown property/);
});
test('escapes user text and supports parchment and zero',()=>{
 const s=structuredClone(script);s.scenes[0].props.heading='<script>alert(0)</script>';
 s.scenes[0].props.bars[0].label='<b>Hello</b>';
 s.scenes[0].props.tone='parchment';s.scenes[0].props.bars[0].value=0;
 assert.equal(checkScript(s).ok,true);
 const html=buildHTML(s,timeline);
 assert.match(html,/&lt;script&gt;alert\(0\)&lt;\/script&gt;/);
 assert.match(html,/&lt;b&gt;Hello&lt;\/b&gt;/);
 assert.match(html,/kb-tone-parchment/);
});
