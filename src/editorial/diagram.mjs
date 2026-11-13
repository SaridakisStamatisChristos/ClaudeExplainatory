// Full-canvas, script-controlled educational diagram with deterministic GSAP reveals.
export const DIAGRAM_CSS = [
 '.ed-scene[data-type="diagram_reveal"]{background:#F0E7D7;color:#2e261e}',
 '.ed-scene .visual.diagram_reveal{position:absolute;inset:0;display:block;width:1080px;height:1920px;margin:0;padding:0;overflow:hidden;transform:none}',
 '.diagram-paper{position:absolute;inset:0;background:radial-gradient(circle at 15% 12%,#fff9ed,#e8ddca 76%)}',
 '.diagram-heading{position:absolute;top:255px;left:90px;right:90px;font:600 83px/1.08 Georgia,serif;letter-spacing:-2.1px;overflow-wrap:break-word}',
 '.diagram-heading:after{content:"";display:block;margin-top:27px;width:104px;height:6px;background:var(--accent)}',
 '.diagram-svg{position:absolute;inset:0;width:1080px;height:1920px;overflow:visible}',
 '.diagram-link{stroke:#9b7550;stroke-width:8;stroke-linecap:round;fill:none}',
 '.diagram-node{opacity:0}',
 '.diagram-disc{fill:#eacfa5;stroke:#6e533d;stroke-width:8}',
 '.diagram-centre{fill:#6e533d}',
 '.diagram-label{fill:#33291e;font:700 36px/1.18 Arial,sans-serif;text-anchor:middle}',
 '.ed-scene[data-type="diagram_reveal"] .captions{color:#32291f;text-shadow:none}',
 '.ed-scene[data-type="diagram_reveal"] .word.emph{color:#a47a3c}'
].join('\n');

const position=n=>({x:Math.round(164+752*n.x),y:Math.round(505+810*n.y)});
const textLines=label=>{
 const words=label.trim().split(/\s+/);
 return words.length<=2?[label]:[
   words.slice(0,Math.ceil(words.length/2)).join(' '),
   words.slice(Math.ceil(words.length/2)).join(' ')
 ];
};
export function renderDiagram(scene,escape){
 const p=scene.props;
 const points=new Map(p.nodes.map(n=>[n.id,position(n)]));
 const links=p.links.map((edge,i)=>{
   const a=points.get(edge.from),b=points.get(edge.to);
   const len=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y))+1;
   return '<line class="diagram-link" data-diagram-edge="'+i+'" data-length="'+len+
     '" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+
     '" style="stroke-dasharray:'+len+';stroke-dashoffset:'+len+'"/>';
 }).join('');
 const nodes=p.nodes.map((n,i)=>{
   const pt=points.get(n.id);
   const spans=textLines(n.label).map((line,j)=>
     '<tspan x="'+pt.x+'" dy="'+(j===0?0:42)+'">'+escape(line)+'</tspan>').join('');
   return '<g class="diagram-node" data-diagram-node="'+i+'">'+
     '<circle class="diagram-disc" cx="'+pt.x+'" cy="'+pt.y+'" r="58"/>'+
     '<circle class="diagram-centre" cx="'+pt.x+'" cy="'+pt.y+'" r="13"/>'+
     '<text class="diagram-label" x="'+pt.x+'" y="'+(pt.y+111)+'">'+spans+'</text></g>';
 }).join('');
 return '<div class="diagram-paper"></div><h1 class="diagram-heading">'+escape(p.heading)+
   '</h1><svg class="diagram-svg" viewBox="0 0 1080 1920" aria-label="'+
   escape(p.heading)+'" role="img">'+links+nodes+'</svg>';
}
