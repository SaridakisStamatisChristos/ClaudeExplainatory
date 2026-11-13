#!/usr/bin/env node
// A narrated video acceptance step, not a synthetic-audio video test.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const folder=join(root,'out','what-a-river-connects-draft');
const proof=join(root,'out','real-model-smoke','evidence.json');
function probe(file){
  const r=spawnSync('ffprobe',['-v','error','-show_entries',
    'format=duration:stream=codec_name,codec_type,width,height,sample_rate','-of','json',file],
    {encoding:'utf8',timeout:30000});
  if(r.status!==0)throw Error('ffprobe failed: '+(r.stderr||r.error?.message));
  return JSON.parse(r.stdout);
}
try{
  const audio=JSON.parse(await readFile(proof,'utf8'));
  if(audio.classification!=='PASS_REAL_KOKORO_WHISPER')
    throw Error('Missing genuine-model audio proof');
  const outputs=[];
  for(const [name,width,height] of [['instagram.mp4',540,960],['youtube.mp4',960,540]]){
    const path=join(folder,name);
    if(!existsSync(path))throw Error('Missing '+name);
    const p=probe(path),duration=Number(p.format.duration);
    const v=p.streams.find(s=>s.codec_type==='video');
    const a=p.streams.find(s=>s.codec_type==='audio');
    if(!v||!a||v.width!==width||v.height!==height)
      throw Error('Incorrect MP4 streams or dimensions: '+name);
    if(v.codec_name!=='h264'||a.codec_name!=='aac'||Number(a.sample_rate)!==48000)
      throw Error('Incorrect MP4 codecs: '+name);
    if(!(duration>0&&duration<=10.12))
      throw Error('MP4 must be a draft <=10s: '+name+' ('+duration+')');
    outputs.push({name,width,height,duration,videoCodec:v.codec_name,audioCodec:a.codec_name});
  }
  const result={classification:'PASS_MACHINE_VIDEO_ACCEPTANCE',outputs,
    source:'real-model-smoke/evidence.json',
    limitation:'Human visual and intelligibility review is still pending.',
    generatedAt:new Date().toISOString()};
  await writeFile(join(folder,'video-acceptance.json'),JSON.stringify(result,null,2)+'\n');
  console.log('PASS: real-model narrated portrait and landscape MP4 streams');
}catch(error){
  console.error('REAL_MODEL_VIDEO_NOT_PASSED: '+error.message);
  process.exitCode=1;
}
