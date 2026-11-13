#!/usr/bin/env node
// Run: GEMINI_API_KEY=... GEMINI_MODEL=... npm run direct:graph -- "topic" out/plan.json
// Director is opt-in; exporting is local and no API is used when rendering.
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {directSceneGraph} from '../src/motion/director.mjs';
const args=process.argv.slice(2),pos=[];let model=process.env.GEMINI_MODEL,tokens=8192,retries=1;
for(let i=0;i<args.length;i++){
 const flag=args[i];
 if(flag==='--model')model=args[++i];
 else if(flag==='--tokens')tokens=Number(args[++i]);
 else if(flag==='--retries')retries=Number(args[++i]);
 else if(flag?.startsWith('--'))throw Error('Unknown director argument: '+flag);
 else pos.push(flag);
}
if(pos.length!==2)throw Error('Usage: direct:graph "TOPIC" out/script.json [--model MODEL] [--tokens 2048..32768] [--retries 0..2]');
const [topic,destination]=pos;
const result=await directSceneGraph(topic,{model,apiKey:process.env.GEMINI_API_KEY,tokens,retries});
const target=resolve(destination);
await mkdir(dirname(target),{recursive:true});
await writeFile(target,JSON.stringify(result.script,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:target,scenes:result.script.scenes.length,attempts:result.attempts,
 usage:result.usage,warnings:result.warnings},null,2));
