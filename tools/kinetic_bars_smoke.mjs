#!/usr/bin/env node
// Real HyperFrames short animation (synthetic timestamps, not Kokoro narration).
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeComposition} from '../src/composition.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const work=join(root,'.reel-work','bars-smoke'),frames=join(work,'frames');
const bin=join(root,'node_modules','.bin','hyperframes'),mp4=join(work,'kinetic-bars.mp4');
if(!existsSync(bin))throw Error('Run npm install first');
const script=JSON.parse(await readFile(join(root,'examples','kinetic_bars.example.json'),'utf8'));
const timing=script.scenes.map((s,i)=>({start:i*2.5,duration:2.5,audioDuration:2.2,
 words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.2,end:(j+1)*.2}))}));
await mkdir(frames,{recursive:true});
await writeComposition(work,script,timing,{draft:true,baseDir:root});
function run(cmd,args){
 const p=spawnSync(cmd,args,{cwd:work,encoding:'utf8',maxBuffer:4*1024*1024,timeout:180000});
 if(p.status!==0)throw Error(cmd+' failed: '+(p.stderr||p.stdout||p.error?.message||'').slice(-2400));
 return p.stdout;
}
run(bin,['lint']);
run(bin,['render','--output',mp4,'--end','2.0','--fps','30','--quality','draft']);
const media=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_type','-of','json',mp4]));
if(!media.streams.some(s=>s.width===540&&s.height===960))throw Error('Incorrect portrait dimensions');
if(Math.abs(Number(media.format.duration)-2)>.1)throw Error('Incorrect two-second duration');
for(const [name,time] of [['early',.22],['late',1.78],['repeat',1.78]]){
 run('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',time.toFixed(2),'-i',mp4,
  '-frames:v','1',join(frames,name+'.png')]);
}
const sha=name=>createHash('sha256').update(readFileSync(join(frames,name+'.png'))).digest('hex');
if(sha('late')!==sha('repeat'))throw Error('Repeat frame changed at identical timestamp');
if(sha('early')===sha('late'))throw Error('Chart lacked observable frame changes');
console.log('PASS: 2-second HyperFrames animated bar video, deterministic frames, 540x960');
