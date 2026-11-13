import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTimebaseDrift,appendSingleVerifiedHold} from '../src/motion/timebase.mjs';
const film={version:'0.1',engine:'canvas2d',width:540,height:960,fps:30,durationFrames:137,
 scenes:[{id:'a',frames:62,objects:[]},{id:'b',frames:75,objects:[{id:'head',rotation:[{frame:0,value:0},{frame:74,value:5}]}]}],
 audio:[{startFrame:0,endFrame:50,role:'narration',file:'a.wav'},{startFrame:62,endFrame:130,role:'narration',file:'b.wav'}]};
const video={codec_name:'h264',pix_fmt:'yuv420p',width:540,height:960,avg_frame_rate:'30/1',
 nb_read_frames:'137',duration:'4.566016'};
const err=v=>new Error('node exited 1: Encoded video differs from scene spec: '+JSON.stringify(v));
test('only tiny real MP4 timebase defects are eligible for a bounded repair',()=>{
 const drift=inspectTimebaseDrift(err(video),film);
 assert.equal(drift.expectedFrames,137);
 assert.equal(drift.encodedFrames,137);
 assert.ok(Math.abs(drift.deltaSeconds)<.001);
 assert.equal(inspectTimebaseDrift(new Error('AetherMotion file is corrupt'),film),null);
 assert.equal(inspectTimebaseDrift(err({...video,nb_read_frames:'132'}),film),null);
 assert.equal(inspectTimebaseDrift(err({...video,width:666}),film),null);
 assert.equal(inspectTimebaseDrift(err({...video,duration:'4.2'}),film),null);
});
test('single held frame preserves all narration starts, other shots, and source data',()=>{
 const before=JSON.stringify(film),next=appendSingleVerifiedHold(film);
 assert.equal(next.durationFrames,138);
 assert.equal(next.scenes[0].frames,62);
 assert.equal(next.scenes[1].frames,76);
 assert.deepEqual(next.audio,film.audio);
 assert.equal(next.scenes[1].objects[0].rotation.at(-1).frame,74);
 assert.equal(JSON.stringify(film),before);
});
test('repair never permits a draft above 10 seconds',()=>{
 const near={...film,durationFrames:300};
 assert.throws(()=>appendSingleVerifiedHold(near),/10-second draft cap/);
 assert.equal(appendSingleVerifiedHold(near,{draft:false}).durationFrames,301);
});
