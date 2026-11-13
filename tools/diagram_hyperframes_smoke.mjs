#!/usr/bin/env node
// Genuine HyperFrames vector-diagram animation; captions use synthetic timing (no speech).
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeComposition} from '../src/composition.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const work=join(root,'.reel-work','diagram-smoke'),frames=join(work,'frames');
const bin=join(root,'node_modules','.bin','hyperframes'),mp4=join(work,'diagram.mp4');
if(!existsSync(bin))throw Error('Run npm install first');
const script=JSON.parse(await readFile(join(root,'examples','diagram_reveal.example.json'),'utf8'));
const timing=script.scenes.map((s,i)=>({start:i*2.5,duration:2.5,audioDuration:2.2,
  words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.25,end:(j+1)*.25}))}));
await mkdir(frames,{recursive:true});
await writeComposition(work,script,timing,{draft:true,baseDir:root});
function run(bin,args){
  const p=spawnSync(bin,args,{cwd:work,encoding:'utf8',maxBuffer:4*1024*1024,timeout:180000});
  if(p.status!==0)throw Error(bin+' failed: '+(p.stderr||p.stdout||p.error?.message||'').slice(-1600));
  return p.stdout;
}
run(bin,['lint']);
run(bin,['render','--output',mp4,'--end','2.0','--fps','30','--quality','draft']);
const media=JSON.parse(run('ffprobe',['-v','error','-show_entries',
  'format=duration:stream=width,height,codec_type','-of','json',mp4]));
if(!media.streams.some(s=>s.width===540&&s.height===960))
  throw Error('Rendered diagram has incorrect portrait dimensions');
if(Math.abs(Number(media.format.duration)-2)>.1)
  throw Error('Rendered diagram has incorrect duration');
for(const [name,time] of [['early',.22],['late',1.74],['repeat',1.74]]){
  run('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',time.toFixed(2),
    '-i',mp4,'-frames:v','1',join(frames,name+'.png')]);
}
const fingerprint=name=>createHash('sha256').update(readFileSync(join(frames,name+'.png'))).digest('hex');
if(fingerprint('late')!==fingerprint('repeat'))
  throw Error('Same timestamp was nondeterministic');
if(fingerprint('early')===fingerprint('late'))
  throw Error('Animation reveals no visible changes over time');
console.log('PASS: true HyperFrames 2s procedural diagram video, animated nodes/edges, deterministic frames');
