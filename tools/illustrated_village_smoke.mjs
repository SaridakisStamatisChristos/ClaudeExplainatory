#!/usr/bin/env node
// Real AetherMotion v0.1 renderer: two different shots, many independently animated
// objects, camera, 2D cartoon actor. Uses synthesized test tones, not Kokoro.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageMotionFilm} from '../src/motion/bridge.mjs';
const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const cli=resolve(process.env.AETHERMOTION_CLI||join(ROOT,'..','AetherMotion','dist','cli','main.js'));
if(!existsSync(cli))throw Error('Build AetherMotion and set AETHERMOTION_CLI');
const work=join(ROOT,'.reel-work','illustrated-smoke'),frames=join(work,'frames'),out=join(work,'illustrated.mp4');
await mkdir(frames,{recursive:true});
function call(bin,args,cwd=ROOT,timeout=180000){
 const r=spawnSync(bin,args,{cwd,encoding:'utf8',timeout,maxBuffer:4*1024*1024});
 if(r.status!==0)throw Error(bin+' '+args[0]+' failed: '+(r.stderr||r.stdout||r.error?.message||'').slice(-2800));
 return r.stdout;
}
const script=JSON.parse(await readFile(join(ROOT,'examples','illustrated_village.json'),'utf8'));
const timings=[];
for(const [i,duration] of [2.3,2.6].entries()){
 const file=join(work,'test-'+i+'.wav');
 call('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency='+String(280+i*130)+':sample_rate=48000',
   '-t','2','-c:a','pcm_s16le',file]);
 timings.push({duration,audioDuration:2,wav:file});
}
const staged=await stageMotionFilm(script,timings,work,{draft:true});
const collect=(node,ids=[])=>{ids.push(node.id);for(const c of node.children||[])collect(c,ids);return ids};
for(const shot of staged.film.scenes){
 const ids=shot.objects.flatMap(o=>collect(o));
 if(new Set(ids).size!==ids.length)throw Error('Artwork asset parts must have isolated IDs within '+shot.id);
}
const countImages=o=>(o.kind==='image'?1:0)+(o.children||[]).reduce((n,c)=>n+countImages(c),0);
const perShot=staged.film.scenes.map(s=>s.objects.reduce((n,o)=>n+countImages(o),0));
if(perShot.some(n=>n<9))throw Error('Expected a layered illustrated frame with imported transparent sprite parts');
if(Object.keys(staged.film.assets||{}).length<18)throw Error('Raster asset staging was skipped');
call(process.execPath,[cli,'validate',staged.path]);
call('rm',['-f',out]);
call(process.execPath,[cli,'render',staged.path,out,'--backend','native','--workers','2','--batch','2'],ROOT,220000);
call(process.execPath,[cli,'verify',staged.path,out]);
const probe=JSON.parse(call('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,nb_frames','-of','json',out]));
const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
if(v?.width!==540||v?.height!==960||v.codec_name!=='h264')throw Error('Missing portrait H.264 stream');
if(!a||a.codec_name!=='aac')throw Error('AetherMotion did not mix synthetic WAV cues into AAC');
if(v.avg_frame_rate!=='30/1'||Number(v.nb_frames)!==147)throw Error('Incorrect frame count or FPS');
if(Math.abs(Number(probe.format.duration)-4.9)>.1)throw Error('Unexpected film duration');
for(const [name,time] of [['scene0Early',.28],['scene0Late',1.9],['scene1Early',2.77],['scene1Late',4.35],['repeat',4.35]]){
 call('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',time.toFixed(2),'-i',out,
  '-frames:v','1',join(frames,name+'.png')]);
}
const hash=name=>createHash('sha256').update(readFileSync(join(frames,name+'.png'))).digest('hex');
if(hash('scene0Early')===hash('scene0Late'))throw Error('Village shot produced static frames');
if(hash('scene1Early')===hash('scene1Late'))throw Error('City shot produced static frames');
if(hash('scene1Late')!==hash('repeat'))throw Error('Same-timestamp frame extraction is nondeterministic');
console.log('PASS: AetherMotion 147 locally rendered illustrated frames with independent transparent image-part animation, 540x960 H.264/AAC');
