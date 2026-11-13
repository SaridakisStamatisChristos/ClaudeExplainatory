#!/usr/bin/env node
// Optional real-model smoke test: never replaces deterministic/mock tests.
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesizeSpeech} from '../src/audio/hyperframes.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=join(root,'node_modules','.bin','hyperframes');
const folder=join(root,'out','real-model-smoke');
const say='A river brings people together.';
if(!existsSync(cli))throw Error('BLOCKED: Run npm install to obtain HyperFrames');

async function run(command,args,{cwd=root}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe'],
      env:{...process.env,HF_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'}});
    let out='',err='';
    child.stdout.on('data',b=>{out=(out+b.toString()).slice(-200000);});
    child.stderr.on('data',b=>{err=(err+b.toString()).slice(-200000);});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve({out,err}):
      reject(Error(command+' failed (exit '+code+'): '+(err||out).slice(-2000))));
  });
}
try{
  const v=await synthesizeSpeech(say,'af_heart',{root,cli,exec:run});
  if(!(v.duration>0&&v.duration<=10))
    throw Error('Speech sample duration must be within (0, 10] seconds');
  if(v.words.length!==say.split(/\s+/).length)throw Error('Word alignment incomplete');
  const probe=await run('ffprobe',['-v','error','-show_entries',
    'format=duration:stream=codec_type,codec_name','-of','json',v.wav]);
  const media=JSON.parse(probe.out);
  if(!media.streams.some(s=>s.codec_type==='audio'))
    throw Error('Generated WAV has no audio stream');
  const levels=await run('ffmpeg',['-hide_banner','-i',v.wav,'-af',
    'volumedetect','-f','null','-']);
  const match=levels.err.match(/max_volume:\s*(-?[0-9.]+)\s*dB/);
  if(!match||Number(match[1])<=-58)throw Error('WAV is silent or near-silent');
  const cached=await synthesizeSpeech(say,'af_heart',{root,cli,exec:async()=>{
    throw Error('Validated warm cache not reused');
  }});
  if(v.audioSha256!==cached.audioSha256)throw Error('Warm cache fingerprint mismatch');
  await mkdir(folder,{recursive:true});
  await copyFile(v.wav,join(folder,'narration.wav'));
  const evidence={classification:'PASS_REAL_KOKORO_WHISPER',text:say,voice:'af_heart',
    durationSeconds:v.duration,peakDbfs:Number(match[1]),words:v.words,
    audioSha256:v.audioSha256,adapterVersion:v.adapterVersion,
    warmCacheVerified:true,generatedAt:new Date().toISOString()};
  await writeFile(join(folder,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS: real Kokoro WAV, local Whisper word alignment, non-silent audio, and warm cache');
}catch(error){
  console.error('REAL_MODEL_AUDIO_NOT_PASSED: '+error.message);
  process.exitCode=1;
}
