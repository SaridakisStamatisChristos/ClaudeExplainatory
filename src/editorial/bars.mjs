// JSON-controlled full-screen kinetic charts: no embedded player/card or API calls.
export const KINETIC_BARS_CSS=[
 '.ed-scene[data-type="kinetic_bars"]{background:#0c1825;color:#f5eedc}',
 '.ed-scene .visual.kinetic_bars{position:absolute;inset:0;display:block;width:1080px;height:1920px;overflow:hidden;margin:0;padding:0;transform:none;text-align:left}',
 '.kb-root{position:absolute;inset:0;padding:255px 88px 260px;overflow:hidden;background:radial-gradient(ellipse at 93% 7%,#31526c 0%,#142b3d 33%,#0b1725 77%);color:#f7f0df}',
 '.kb-root:before{content:"";position:absolute;inset:0;opacity:.19;background:repeating-linear-gradient(90deg,transparent 0,transparent 175px,#f7e6be40 177px,transparent 180px);pointer-events:none}',
 '.kb-light-ray{position:absolute;inset:-350px -200px;opacity:.32;background:radial-gradient(ellipse at 45% 50%,#65a0c222,transparent 55%);pointer-events:none}',
 '.kb-kicker{position:relative;font:700 24px/1.3 Arial,sans-serif;letter-spacing:5px;text-transform:uppercase;color:#b8d2d8}',
 '.kb-kicker:before{content:"";display:inline-block;width:12px;height:12px;margin-right:18px;border-radius:50%;background:var(--accent)}',
 '.kb-heading{position:relative;margin:34px 0 100px;font:600 86px/1.08 Georgia,serif;letter-spacing:-2px;max-width:890px;overflow-wrap:break-word}',
 '.kb-heading:after{content:"";display:block;margin-top:32px;width:110px;height:7px;background:var(--accent)}',
 '.kb-chart{position:relative;display:flex;flex-direction:column;gap:43px;z-index:1}',
 '.kb-row{position:relative;opacity:0;display:grid;grid-template-columns:190px 1fr 114px;align-items:center;gap:28px;min-height:112px}',
 '.kb-label{font:700 34px/1.12 Arial,sans-serif;overflow-wrap:anywhere;letter-spacing:-.6px}',
 '.kb-track{position:relative;width:100%;height:43px;border:1px solid #c6e2e83d;border-radius:999px;overflow:hidden;background:#fff2}',
 '.kb-track:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent 24.2%,#c3dded57 24.4%,transparent 24.8%);pointer-events:none}',
 '.kb-bar-fill{display:block;position:absolute;inset:0;width:100%;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),#f9e2ab);box-shadow:0 0 22px #f8dc8a55;transform:scaleX(0);transform-origin:left center}',
 '.kb-value{font:800 42px/1 Arial,sans-serif;text-align:right;font-variant-numeric:tabular-nums;letter-spacing:-1px}',
 '.kb-note{position:absolute;bottom:276px;left:90px;right:90px;padding-top:24px;border-top:2px solid #ffffff40;font:500 26px/1.35 Arial,sans-serif;letter-spacing:.3px;color:#bcd2d8}',
 '.kb-tone-parchment{background:radial-gradient(ellipse at 95% 8%,#fef3df,#e9ddc6 56%,#dbcdb5);color:#2b2a29}',
 '.kb-tone-parchment .kb-kicker,.kb-tone-parchment .kb-note{color:#655540}',
 '.kb-tone-parchment .kb-track{background:#55402d15;border-color:#826c5160}',
 '.kb-tone-parchment .kb-track:after{background:repeating-linear-gradient(90deg,transparent 0,transparent 24.2%,#77614566 24.4%,transparent 24.8%)}',
 '.ed-scene[data-type="kinetic_bars"] .captions{color:#fff6ea;text-shadow:0 2px 10px #000c}',
 '.ed-scene[data-type="kinetic_bars"]:has(.kb-tone-parchment) .captions{color:#29221e;text-shadow:none}',
 '.ed-scene[data-type="kinetic_bars"] .word.emph{color:var(--accent)}'
].join('\n');

export function renderKineticBars(scene,escape){
 const p=scene.props,tone=p.tone==='parchment'?'parchment':'midnight';
 const suffix=p.unit==='percent'?'%':'';
 const rows=p.bars.map((bar,i)=>
   '<div class="kb-row" data-kb-row="'+i+'"><span class="kb-label">'+escape(bar.label)+'</span>'+
   '<div class="kb-track"><div class="kb-bar-fill" data-kb-fill="'+i+'"></div></div>'+
   '<strong class="kb-value" data-kb-value="'+i+'">0'+suffix+'</strong></div>'
 ).join('');
 return '<div class="kb-root kb-tone-'+tone+'"><div class="kb-light-ray"></div>'+
   '<div class="kb-kicker">'+escape(p.kicker||'EXPLAINED VISUALLY')+'</div>'+
   '<h1 class="kb-heading">'+escape(p.heading)+'</h1><div class="kb-chart">'+rows+'</div>'+
   '<div class="kb-note">'+escape(p.note||'Illustrative data')+'</div></div>';
}
