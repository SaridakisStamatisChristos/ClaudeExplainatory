#!/usr/bin/env node
// Build editable original vector artwork into local PNG layers; never call an AI API.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const srcRoot=join(ROOT,'assets','artwork','medieval');
const output=join(ROOT,'assets','generated','medieval');
const manifest=JSON.parse(await readFile(join(srcRoot,'manifest.json'),'utf8'));
const names=new Set();
if(manifest.pack!=='medieval-editorial-v1'||manifest.assets?.length!==12)
 throw Error('Unexpected illustration pack manifest');
const convert=process.env.RSVG_CONVERT||'rsvg-convert';
const evidence=[];
await mkdir(output,{recursive:true});
for(const e of manifest.assets){
 if(!/^[a-z]+(?:-[a-z]+)*$/.test(e.name)||names.has(e.name))throw Error('Unsafe or duplicate asset name');
 names.add(e.name);
 if(e.src!==e.name+'.svg'||!Number.isInteger(e.width)||!Number.isInteger(e.height)||
   e.width<32||e.width>1200||e.height<32||e.height>1200)throw Error('Invalid asset descriptor');
 const source=await readFile(join(srcRoot,e.src),'utf8');
 // Sources are repository-authored vectors, not untrusted downloaded SVG. Refuse
 // active content, external references, font/images and entity expansions anyway.
 if(source.length>350000||!/\<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(source)||
    /<!DOCTYPE|<!ENTITY|<script|<foreignObject|<image\b|<use\b|\bon\w+\s*=|href\s*=|url\(\s*https?:|@import|<style/i.test(source))
   throw Error('Unsafe SVG: '+e.src);
 const outfile=join(output,e.name+'.png');
 const p=spawnSync(convert,['--width',String(e.width),'--height',String(e.height),'-o',outfile,join(srcRoot,e.src)],{encoding:'utf8',timeout:30000});
 if(p.status!==0)throw Error('rsvg-convert '+e.src+': '+(p.stderr||p.error?.message||'unknown failure').slice(0,700));
 const png=await readFile(outfile);
 if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
   png.readUInt32BE(16)!==e.width||png.readUInt32BE(20)!==e.height)
   throw Error('Invalid PNG header or dimensions: '+e.name);
 if(png.length>8*1024*1024)throw Error('PNG exceeds safe source budget: '+e.name);
 evidence.push({name:e.name,src:'assets/artwork/medieval/'+e.src,path:'assets/generated/medieval/'+e.name+'.png',
   width:e.width,height:e.height,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')});
}
await writeFile(join(output,'manifest.json'),JSON.stringify({pack:manifest.pack,license:manifest.license,renderer:'rsvg-convert',assets:evidence},null,2)+'\n');
console.log('PASS: rasterized '+evidence.length+' authored illustration assets; '+evidence.reduce((n,e)=>n+e.bytes,0)+' bytes');
