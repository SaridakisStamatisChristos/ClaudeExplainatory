// Optional Gemini scene director. Only user-commanded generation contacts a model.
// The model writes inert JSON; the existing strict spec validator owns acceptance.
import {checkScript} from '../spec.mjs';
const MODEL_RE=/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const briefPrompt=(topic,errors='')=>`You are the animation director for ClaudeExplainatory. Turn this brief into a
complete, production-minded JSON script; exactly matching schema_version 2 and
mode editorial_illustrated, with ONLY scene_graph scenes. Each scene must contain:
template:"scene_graph", say (4–11 spoken words, at most 16), highlight (exact
substring of say), illustrative:true, sfx:"none", props with background (#RRGGBB),
style:{name:"cartoon"}, camera and objects. Top-level fields: schema_version:2,
mode:"editorial_illustrated", title, handle:"@claudeexplainatory", voice:"af_heart",
accent:"#E4B765", caption, hashtags:["#animation"], scenes.

Plan two or three VISUALLY DISTINCT scenes, with ~7-18 layered OBJECTS per scene.
Every scene must have actual movement (do not fake it with static illustrations).
All scene coordinates are native 540x960 pixels; y down. Make ground near y=700,
headline text near y=220-300, people near y=720, and keep most action clear of the
bottom caption area. Compose genuine actions using distinct objects with keyed
properties, NOT prepackaged 'bars' or 'diagram_reveal' templates.
Supported object kinds:
* rect: id,kind,width,height,color and optional x,y,scale,opacity,rotation
* circle: id,kind,radius,color and optional x,y,scale,opacity,rotation
* path: id,kind,points:[[x,y],[x,y]],stroke,color, optional x,y,reveal
* text: id,kind,text,size,color, optional x,y,face:"serif"|"sans"|"mono",bold
* puppet: id,kind,height (40..500),skin,shirt,trousers,hair,shoes (all #RRGGBB),
  optional x,y,scale,opacity,rotation, expression:"happy"|"curious"|"neutral"|
  "concerned",outfit:"villager"|"merchant"|"scholar",facing:"left"|"right";
  walk:{"start":0,"end":0.8,"cycles":2.5,"strength":0.8}, optional
  wave:{"start":0.35,"end":0.85,"cycles":2,"arm":"right"}.
  Unlike simple actor, puppet compiles articulated multi-part limbs/head/torso
  with gait and arm gesture keyframes and is better for foreground characters.
* actor: id,kind,height,skin,shirt,trousers,hair,shoes (all #RRGGBB); optional
  x,y,phase,stride (0–30),gesture,mouth,expression:"happy"|"curious"|"neutral"|
  "concerned",facing:"left"|"right".
For richer reusability you MAY define top-level scene_symbols as a map from
safe symbol names to arrays of relative-coordinate objects (rect, circle,
path, polygon, glow, text, group, actor). Scene objects can then use
{"kind":"instance","id":"safeId","symbol":"name","x":120,"y":650,
"scale":[{"t":0,"value":0.1},{"t":1,"value":1}]}.
The runtime expands an instance as a nested group; it evaluates its motion
independently per frame and can reuse the same symbol in multiple scenes.
Symbols cannot reference other symbols and all internal drawable IDs must
be unique within a symbol; keep relative offsets within 200 pixels.
Other useful kinds: polygon with 3+ coordinate pairs and color, glow with
radius and color, group with nested children and its own animated x/y/scale.
Other object kinds or free-form properties are forbidden. NO image URLs or
imaginary local file paths. Use procedural vector composition; detailed artwork
would need separate provided assets.
Reusable motion: ANY object, instance, group, puppet or symbol part can use
a behaviors array of 1–4 deterministic motion modifiers. These are designed
to avoid verbose frame-by-frame positions; use them where the animation's subject
would naturally move.
* {"kind":"float","axis":"y","amplitude":8,"cycles":1.5,"phase":0}
  gently oscillates position (clouds, hanging lanterns, water details).
* {"kind":"sway","degrees":3,"cycles":1.2} rocks a parent group (trees, flags).
* {"kind":"pulse","amount":0.035,"cycles":1.5} gently scales an object
  (lantern glow or emphasis; keep amounts small for characters).
* {"kind":"orbit","radiusX":38,"radiusY":18,"cycles":1.5}
  traces a bounded ellipse around the author's x/y position.
* {"kind":"path","points":[[0,0],[65,-18],[130,-8],[220,10]],
   "start":0,"end":1,"ease":"smooth","orient":false}
  moves along a LOCAL OFFSET path with arc-length parameterization.
  Optional orient:true rotates the object to point in the path direction;
  prefer it for flying objects, NOT upright people.
All behaviors run at 30 fps using the actual spoken scene length.
Periodic modifiers optionally use start/end (0–1), cycles (0.25–12),
phase (0–1). The motion envelope fades in and out, returning the object
to its authored pose at both ends of the scene. Paths hold their start/end
positions instead. An author may mix a path with float or sway on the SAME
object, but do not add more than one path to a single object.
For shots with camera pan/zoom, top-level scene objects can declare numeric
depth: 0 makes an item screen-locked (sky plate and readable editorial text),
0.25 for distant hills, 0.7 for buildings, 1 for normal world motion,
or 1.2–1.4 for close foreground details. Only root scene objects may use
depth; do not put it on nested symbol parts or groups. Depth does not
generate a background automatically; it merely changes camera translation.
Do not animate close foreground characters with independent aimless floating
if their walking/foot placement should look natural.
For cloud movement, choose float; for birds, choose a path plus gentle float;
for a walking character, use puppet.walk and x keyframes or a local path.
Keep floating amplitudes under about 12 px and tree sway under 4 degrees
unless a dramatic event warrants otherwise. Avoid unnecessary random motion.
Use 2+ meaningful behaviors across most dynamic shots when appropriate.
An animatable property accepts a number OR an array of keys,
[{"t":0,"value":10,"ease":"smooth"},{"t":1,"value":240}].
t is relative progress (0-1) through the ACTUAL narration-timed scene; values
are finite. Use strictly increasing t, maximum 48 keys, ease linear/smooth/hold.
At least two independent objects per scene should visibly MOVE or SCALE.
For growth, animate building scale and opacity and roof path reveal in sync;
do not show detached roofs in empty space. Actor walking requires x keys and
phase/stride keys, but do not animate the mouth as verified lip sync.
Camera x/y/zoom may animate with the same tracks; keep zoom close to 1.
ID regex: [A-Za-z][A-Za-z0-9_-]*, unique within each scene. Each scene contains
1–80 objects. The whole production is 2–3 shots and under 10 seconds when
narrated as a first draft. Do not claim fabricated numeric values are measured
facts. Every object, word, and position must support the specified topic.
If no supported visual construction is possible for an idea, depict a clearly
conceptual metaphor rather than invent external photographic assets.
Return only a valid JSON object, no Markdown or extra commentary.

Topic: ${JSON.stringify(topic)}
${errors?'Fix all these strict local validation errors from the previous attempt: '+errors:''}`;
const parseResponse=json=>{
 const c=json?.candidates?.[0];
 if(c?.finishReason==='MAX_TOKENS')throw Error('Gemini output token budget reached; increase --tokens or shorten the topic');
 if(c?.finishReason!=='STOP')throw Error('Gemini did not return a complete JSON script: '+(c?.finishReason??'empty'));
 const value=c.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('')||'';
 try{return JSON.parse(value)}catch{throw Error('Gemini returned malformed JSON');}
};
export function validateDirectorOptions({model,apiKey,tokens=8192,retries=1}){
 if(!apiKey||typeof apiKey!=='string')throw Error('Set GEMINI_API_KEY for optional directing');
 if(typeof model!=='string'||!MODEL_RE.test(model))throw Error('Set GEMINI_MODEL or --model to an available Gemini JSON-output model');
 if(!Number.isInteger(tokens)||tokens<2048||tokens>32768)throw Error('Token cap must be 2048–32768');
 if(!Number.isInteger(retries)||retries<0||retries>2)throw Error('Retries must be 0, 1, or 2');
}
export async function directSceneGraph(topic,{model,apiKey,tokens=8192,retries=1,transport=fetch,targetSeconds=15}={}){
 validateDirectorOptions({model,apiKey,tokens,retries});
 if(typeof topic!=='string'||!topic.trim()||topic.length>1500)throw Error('Topic must be 1–1500 characters');
 let errors='',usage=[];
 for(let attempt=0;attempt<=retries;attempt++){
  let response;
  try{
   response=await transport('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
    signal:AbortSignal.timeout(60000),
    body:JSON.stringify({contents:[{role:'user',parts:[{text:briefPrompt(topic,errors)}]}],
      generationConfig:{maxOutputTokens:tokens,responseMimeType:'application/json',temperature:.45}})
   });
  }catch{if(attempt===retries)throw Error('Gemini transport failed after bounded retries');await sleep(250*(attempt+1));continue;}
  if(!response.ok){
   if((response.status===429||response.status>=500)&&attempt<retries){await sleep(250*(attempt+1));continue;}
   throw Error('Gemini HTTP '+response.status+' for '+model+'; check model access, quotas, or key');
  }
  const data=await response.json();
  usage.push(data.usageMetadata??null);
  try{
   const script=parseResponse(data);
   const v=checkScript(script,undefined,{targetSeconds});
   if(!v.ok)throw Error(v.errors.join('; ').slice(0,1200));
   if(!script.scenes.every(s=>s.template==='scene_graph'))throw Error('All scenes must use scene_graph');
   if(script.scenes.length<2||script.scenes.length>3)throw Error('Director must return 2–3 scenes');
   return {script,usage,attempts:attempt+1,warnings:v.warnings};
  }catch(e){
   errors=String(e.message).slice(0,1300);
   if(attempt===retries)throw Error('Gemini script rejected by local validator: '+errors);
  }
 }
 throw Error('No accepted scene-graph script');
}
