import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {directSceneGraph} from '../src/motion/director.mjs';
const good=JSON.parse(await readFile(new URL('../examples/scene_graph_village.json',import.meta.url),'utf8'));
const response=(script,reason='STOP')=>({ok:true,status:200,json:async()=>({candidates:[{finishReason:reason,content:{parts:[{text:JSON.stringify(script)}]}}],usageMetadata:{promptTokenCount:101,candidatesTokenCount:402}})});
test('Gemini generates inert, validated scene graph with explicit provider token cap',async()=>{
 const calls=[];
 const transport=async(url,options)=>{calls.push({url,options});return response(good)};
 const result=await directSceneGraph('A town grows',{model:'gemini-test',apiKey:'dummy',tokens:8192,retries:0,transport});
 assert.equal(result.script.scenes.length,2);
 assert.equal(result.attempts,1);
 assert.equal(result.usage[0].promptTokenCount,101);
 const x=calls[0];assert.match(x.url,/gemini-test:generateContent/);
 assert.equal(x.options.headers['x-goog-api-key'],'dummy');
 const body=JSON.parse(x.options.body);
 assert.equal(body.generationConfig.maxOutputTokens,8192);
 assert.equal(body.generationConfig.responseMimeType,'application/json');
 assert.match(body.contents[0].parts[0].text,/different|distinct/i);
});
test('Bad JSON is rejected before writing; bounded repair passes explicit validation feedback',async()=>{
 let attempts=0,first=structuredClone(good);
 first.scenes[0].props.objects[0].kind='javascript';
 const transport=async()=>response(++attempts===1?first:good);
 const result=await directSceneGraph('Growing towns',{model:'gemini-test',apiKey:'dummy',tokens:4096,retries:1,transport});
 assert.equal(attempts,2);assert.equal(result.attempts,2);
});
test('Never accepts fabricated unsafe scenes or an absent provider key',async()=>{
 const malicious=structuredClone(good);malicious.scenes[0].props.objects[0].src='https://evil.example/external';
 await assert.rejects(directSceneGraph('Town',{model:'gemini-test',apiKey:'dummy',tokens:8192,retries:0,transport:async()=>response(malicious)}),/validator/);
 await assert.rejects(directSceneGraph('Town',{model:'gemini-test',apiKey:'',tokens:8192,retries:0,transport:async()=>response(good)}),/GEMINI_API_KEY/);
});
test('Handles incomplete output and HTTP auth errors without hiding cause',async()=>{
 await assert.rejects(directSceneGraph('Town',{model:'gemini-test',apiKey:'dummy',retries:0,transport:async()=>response(good,'MAX_TOKENS')}),/token budget/);
 await assert.rejects(directSceneGraph('Town',{model:'gemini-test',apiKey:'dummy',retries:0,transport:async()=>({ok:false,status:401})}),/HTTP 401/);
});
