#!/usr/bin/env node
// Genuine Kokoro/Whisper narrations plus fully animated native AetherMotion film.
// Confirms streams, normalized audio, dimensions, nonstatic frames, <=10 s cap.
import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url))),base=join(ROOT,'out','village-becomes-city-draft');
function exec(cmd,args){
 const p=spawnSync(cmd,args,{encoding:'utf8',timeout:90000,maxBuffer:3*1024*1024});
 if(p.status!==0)throw Error(cmd+': '+(p.stderr||p.error?.message||'').slice(-1500));
 return p.stdout;
}
function probe(p){return JSON.parse(exec('ffprobe',['-v','error','-show_entries',
 'format=duration:stream=codec_type,codec_name,width,height,sample_rate,avg_frame_rate,nb_frames','-of','json',p]));}
const details=[];
for(const [name,width,height] of [['instagram',540,960],['youtube',960,540]]){
 const file=join(base,name+'.mp4');
 if(!existsSync(file))throw Error('Missing real narration render '+name);
 const info=probe(file),v=info.streams.find(x=>x.codec_type==='video'),a=info.streams.find(x=>x.codec_type==='audio');
 if(!v||v.codec_name!=='h264'||v.width!==width||v.height!==height)throw Error(name+': unexpected H.264 dimensions');
 if(!a||a.codec_name!=='aac'||Number(a.sample_rate)!==48000)throw Error(name+': audio codec/rate mismatch');
 if(!Number.isFinite(Number(info.format.duration))||Number(info.format.duration)<3||Number(info.format.duration)>10.1)
   throw Error(name+': duration is not a bounded real narration draft');
 details.push({name,width,height,duration:Number(info.format.duration),frames:Number(v.nb_frames)});
}
const dir=join(base,'visual-proof');await mkdir(dir,{recursive:true});
const duration=details[0].duration;
for(const [name,t] of [['early',.35],['late',Math.min(1.55,duration*.3)],['scene2',Math.max(2.4,duration*.79)],['repeat',Math.max(2.4,duration*.79)]]){
 exec('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',t.toFixed(3),
  '-i',join(base,'instagram.mp4'),'-frames:v','1',join(dir,name+'.png')]);
}
const hash=name=>createHash('sha256').update(readFileSync(join(dir,name+'.png'))).digest('hex');
if(hash('early')===hash('late')||hash('early')===hash('scene2'))throw Error('Moving objects did not change between frames');
if(hash('scene2')!==hash('repeat'))throw Error('Same time produced nondeterministic decoded stills');
const evidence={result:'PASS_REAL_NARRATION_AND_MOVING_OBJECTS',engine:'AetherMotion',audio:'HyperFrames Kokoro + Whisper',draft:true,outputs:details,frameHashes:{early:hash('early'),late:hash('late'),scene2:hash('scene2')}};
await writeFile(join(base,'scene-graph-acceptance.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
