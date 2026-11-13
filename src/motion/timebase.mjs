// Frame drift diagnostics for AetherMotion MP4 strict verification.
// Never suppress errors: permit only bounded container timestamp defects and
// always rerender/re-verify a newly declared film before publishing.
export const DIAGNOSTIC='Encoded video differs from scene spec: ';
export function inspectTimebaseDrift(error,film){
 const msg=String(error?.message??error);
 const idx=msg.indexOf(DIAGNOSTIC);
 if(idx<0)return null;
 let video;
 try{video=JSON.parse(msg.slice(idx+DIAGNOSTIC.length).split('\n')[0].trim());}
 catch{return null;}
 const fps=film.fps,expect=film.durationFrames/fps;
 const actual=Number(video.nb_read_frames),seconds=Number(video.duration);
 const avg=String(video.avg_frame_rate||'').split('/').map(Number);
 const actualFps=avg.length===2&&avg[1]>0?avg[0]/avg[1]:NaN;
 if(video.codec_name!=='h264'||video.pix_fmt!=='yuv420p'||
    video.width!==film.width||video.height!==film.height||
    actualFps!==fps||!Number.isFinite(actual)||!Number.isFinite(seconds)||
    actual<film.durationFrames-1||actual>film.durationFrames||
    Math.abs(seconds-expect)>1/fps+.002)return null;
 return {expectedFrames:film.durationFrames,encodedFrames:actual,
   expectedDuration:expect,encodedDuration:seconds,deltaSeconds:seconds-expect};
}
export function appendSingleVerifiedHold(film,{draft=true}={}){
 if(!film||!Array.isArray(film.scenes)||film.scenes.length===0||
    !Number.isInteger(film.durationFrames)||film.fps!==30)throw Error('Invalid frame-indexed film');
 if(draft&&(film.durationFrames+1)/film.fps>10)
   throw Error('Cannot repair timing without exceeding the 10-second draft cap');
 // Extending the last shot only preserves the position of every existing narration cue,
 // the transitions, and all existing keyframes. Newly added final frame holds the pose.
 const out=structuredClone(film);
 out.scenes.at(-1).frames++;
 out.durationFrames++;
 return out;
}
