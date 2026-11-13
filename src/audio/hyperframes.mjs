// Speech is delegated to HyperFrames' local Kokoro TTS and word-level transcription.
// No Python Kokoro, faster-whisper, API calls, or guessed word timings.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const ADAPTER_VERSION='hyperframes-kokoro-transcribe-v2';
const LANGUAGES={a:'en',b:'en',e:'es',f:'fr',h:'hi',i:'it',j:'ja',p:'pt',z:'zh'};
const asrModel=voice=>LANGUAGES[voice?.[0]]==='en'?'small.en':'small';
const clean=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export const cacheKey=(text,voice)=>createHash('sha256')
  .update(JSON.stringify({text,voice,engine:ADAPTER_VERSION,model:asrModel(voice),speed:1}))
  .digest('hex');

export function alignSpeech(text,transcript,duration) {
  if(!Array.isArray(transcript)||transcript.length===0)
    throw new Error('HyperFrames transcript.json has no word-level entries');
  if(!(Number.isFinite(duration)&&duration>0))
    throw new Error('Narration WAV has no measurable duration');
  const expected=String(text).trim().split(/\s+/);
  const actual=transcript.map((token,i)=>{
    const start=Number(token?.start),end=Number(token?.end);
    const word=token?.text ?? token?.word;
    if(typeof word!=='string'||!clean(word)||
        !Number.isFinite(start)||!Number.isFinite(end)||
        start<0||end<=start||end>duration+.25)
      throw new Error('HyperFrames transcript contains invalid word timestamp at index '+i);
    return {word,start,end};
  });
  for(let i=1;i<actual.length;i++){
    if(actual[i].start+.015<actual[i-1].start)
      throw new Error('HyperFrames word timestamps are not in chronological order');
  }
  const aligned=[];
  for(let i=0;i<expected.length;i++){
    const word=expected[i],target=clean(word);
    if(!target)throw new Error('Script contains a word with no spoken characters: '+word);
    if(i>=actual.length)
      throw new Error('HyperFrames transcription does not match scripted word "'+word+'" at index '+i+
        ': transcript ended after '+actual.length+' words; no captions were fabricated');
    if(clean(actual[i].word)!==target)
      throw new Error('HyperFrames transcription does not match scripted word "'+word+'" at index '+i+
        ': recognized "'+actual[i].word+'"; unexpected or missing speech must be reviewed');
    aligned.push({word,start:actual[i].start,end:actual[i].end});
  }
  if(actual.length>expected.length)
    throw new Error('HyperFrames transcription contains '+(actual.length-expected.length)+
      ' unexpected extra word(s) after the script: "'+actual.slice(expected.length).map(x=>x.word).join(' ')+'"');
  return aligned;
}

export async function synthesizeSpeech(text,voice,{root,cli,exec}) {
  if(typeof text!=='string'||!text.trim()||typeof voice!=='string'||!voice.trim())
    throw new Error('Narration text and voice must be nonempty');
  if(typeof root!=='string'||typeof cli!=='string'||typeof exec!=='function')
    throw new Error('Speech bridge needs project root, HyperFrames executable and runner');
  const language=LANGUAGES[voice[0]];
  if(!language)throw new Error('Unsupported Kokoro voice prefix: '+voice);
  const key=cacheKey(text,voice),folder=join(root,'.cache','voices',key);
  const wav=join(folder,'narration.wav'),json=join(folder,'timing.json');
  await mkdir(folder,{recursive:true});
  const expected=text.trim().split(/\s+/);
  if(existsSync(wav)&&existsSync(json)){
    try {
      const cached=JSON.parse(await readFile(json,'utf8'));
      const audio=await readFile(wav);
      const fingerprint=createHash('sha256').update(audio).digest('hex');
      if(audio.length>44 && cached.adapterVersion===ADAPTER_VERSION &&
        cached.audioSha256===fingerprint && cached.voice===voice &&
        cached.provider==='hyperframes-kokoro' && Array.isArray(cached.words) &&
        cached.words.length===expected.length && Number.isFinite(cached.duration) &&
        cached.duration>0 && cached.words.every((w,i)=>clean(w.word)===clean(expected[i])&&
          Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start&&
          w.start>=0&&w.end<=cached.duration+.25))
        return {wav,...cached};
    } catch {
      // Corrupt or incomplete cache entries must be rebuilt, never silently trusted.
    }
  }
  const transcriptPath=join(folder,'transcript.json');
  await rm(transcriptPath,{force:true});
  await rm(wav,{force:true});
  const scriptFile=join(folder,'script.txt');
  await writeFile(scriptFile,text,'utf8');
  await exec(cli,['tts',scriptFile,'--voice',voice,'--speed','1','--output',wav],{cwd:folder});
  if(!existsSync(wav))throw new Error('HyperFrames TTS completed without creating narration.wav');
  const audio=await readFile(wav);
  if(audio.length<=44)throw new Error('HyperFrames TTS did not produce a complete WAV');
  const probe=await exec('ffprobe',['-v','error','-show_entries','format=duration','-of','json',wav]);
  let duration;
  try{duration=Number(JSON.parse(probe.out).format.duration);}
  catch{throw new Error('Unable to read duration of HyperFrames narration.wav using ffprobe');}
  if(!Number.isFinite(duration)||duration<=0)
    throw new Error('HyperFrames narration.wav has no positive measured duration');
  await exec(cli,['transcribe',wav,'--dir',folder,'--engine','whisper',
    '--model',asrModel(voice),'--language',language,'--json'],{cwd:folder});
  if(!existsSync(transcriptPath))
    throw new Error('HyperFrames transcribe did not write transcript.json (word-level timing required)');
  let transcript;
  try{transcript=JSON.parse(await readFile(transcriptPath,'utf8'));}
  catch{throw new Error('HyperFrames transcript.json is not valid JSON');}
  const words=alignSpeech(text,transcript,duration);
  const meta={duration:Math.round(duration*100000)/100000,words,voice,
    provider:'hyperframes-kokoro',adapterVersion:ADAPTER_VERSION,
    audioSha256:createHash('sha256').update(audio).digest('hex')};
  await writeFile(json,JSON.stringify(meta)+'\n');
  return {wav,...meta};
}
