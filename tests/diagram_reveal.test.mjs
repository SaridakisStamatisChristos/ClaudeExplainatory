import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {buildHTML} from '../src/composition.mjs';

const script=JSON.parse(await readFile(new URL('../examples/diagram_reveal.example.json',import.meta.url),'utf8'));
const timeline=script.scenes.map((s,i)=>({start:i*2.4,duration:2.4,audioDuration:2.2,
  words:s.say.trim().split(/\s+/).map((word,j)=>({word,start:j*.24,end:(j+1)*.24}))}));

test('diagram_reveal supports declarative nodes and edges without media files',()=>{
  const result=checkScript(script,undefined,{targetSeconds:15});
  assert.equal(result.ok,true,result.errors.join('; '));
  const html=buildHTML(script,timeline,{draft:true});
  assert.match(html,/data-type="diagram_reveal"/);
  assert.match(html,/class="diagram-svg"/);
  assert.equal((html.match(/data-diagram-node="\d+"/g)||[]).length,3);
  assert.equal((html.match(/data-diagram-edge="\d+"/g)||[]).length,2);
  assert.match(html,/strokeDashoffset:0/);
  assert.match(html,/data-width="540"/);
  assert.doesNotMatch(html,/ed-player-chrome|ed-play-icon|ed-progress-fill/);
});
test('diagram_reveal rejects bad ids, dangling edges, unsafe coordinates and duplicates',()=>{
  const duplicate=structuredClone(script);
  duplicate.scenes[0].props.nodes[1].id='village';
  assert.match(checkScript(duplicate).errors.join(' '),/duplicate node identifier/);
  const missing=structuredClone(script);
  missing.scenes[0].props.links[0].from='not_a_node';
  assert.match(checkScript(missing).errors.join(' '),/distinct existing nodes/);
  const out=structuredClone(script);
  out.scenes[0].props.nodes[0].x=4;
  assert.match(checkScript(out).errors.join(' '),/normalized numbers/);
  const injection=structuredClone(script);
  injection.scenes[0].props.nodes[0].id='<script>';
  assert.match(checkScript(injection).errors.join(' '),/safe identifier/);
});
test('diagram_reveal escapes user-controlled SVG and HTML text',()=>{
  const s=structuredClone(script);
  s.scenes[0].props.nodes[0].label='<script>alert(1)</script>';
  const r=checkScript(s);
  assert.equal(r.ok,true,r.errors.join(' '));
  const html=buildHTML(s,timeline,{draft:true});
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
});
