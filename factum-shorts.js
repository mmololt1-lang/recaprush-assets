/* Factum Shorts: catalog maintained in factum-shorts.json. */
(() => {
  const PERIOD = 14400000;
  let catalog = [{"id":"gqc4F6_Nu4E","title":"How MrBeast Became YouTube's Creator 🚀"},{"id":"_vkWQp9tsE0","title":"How JISOO Went From YG Trainee to CEO"},{"id":"36_zHqeIajM","title":"MrBeast Counted to 100,000… Then Everything Changed"},{"id":"WDRm3s_UKVo","title":"Before MrBeast Was Famous… Nobody Watched His Videos"},{"id":"UwCj0kia5hQ","title":"BTS Is Back! The Reunion ARMY Waited For 💜"},{"id":"aoiF2PJia4o","title":"How BTS Made Billboard History 💜"},{"id":"4Crt3ZG126g","title":"Before BTS Became Global Legends 💜"},{"id":"2Xn3hbCJfdI","title":"How BLACKPINK Conquered the World 🖤💗"},{"id":"gYNPQLTygpw","title":"BLACKPINK: The Years of Training Nobody Saw 🖤💗"},{"id":"v2RbYZdCkTU","title":"BLACKPINK: From Trainees to Global Icons 🖤💗"},{"id":"o8uwxhoAxD4","title":"Four 16 Year Old Boys, One Murder"},{"id":"JubOPjqRgWQ","title":"몸으로 그림을 그리는 화가 😳🎨 | 정말 독특한 기법을 가진 예술가"}];
  let lastSlot = -1;
  const choose = (rows, slot) => {
    const pool = [...rows], groups = Math.ceil(pool.length / 4);
    let seed = (Math.floor(slot / groups) ^ 0x9e3779b9) >>> 0;
    for (let i=pool.length-1;i>0;i--) {
      seed = (Math.imul(seed,1664525)+1013904223)>>>0;
      const j=Math.floor(seed/4294967296*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    return Array.from({length:Math.min(4,pool.length)},(_,i)=>pool[((slot%groups)*4+i)%pool.length]);
  };
  async function refresh() {
    const grids=[...document.querySelectorAll('.rr-factum-grid')];
    if(!grids.length) return;
    const slot=Math.floor(Date.now()/PERIOD);
    if(slot===lastSlot || document.activeElement?.tagName==='IFRAME') return;
    try {
      const r=await fetch('https://raw.githubusercontent.com/mmololt1-lang/recaprush-assets/main/factum-shorts.json?period='+slot,{signal:AbortSignal.timeout(6000)});
      if(r.ok) {
        const data=await r.json(), seen=new Set();
        const valid=Array.isArray(data)?data.filter(v=>v&&/^[\w-]{11}$/.test(v.id)&&typeof v.title==='string'&&v.title.length<300&&!seen.has(v.id)&&seen.add(v.id)):[];
        if(valid.length>=4) catalog=valid;
      }
    } catch {}
    const picks=choose(catalog,slot);
    for(const grid of grids) {
      if([...grid.querySelectorAll('[data-factum-id]')].map(x=>x.dataset.factumId).join()===picks.map(v=>v.id).join()) continue;
      const cards=picks.map(v=>{
        const card=document.createElement('article');card.className='rr-factum-card';
        const player=document.createElement('div');player.className='rr-factum-player';player.dataset.factumId=v.id;
        const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+v.id+'?rel=0&playsinline=1';frame.title=v.title+' — Factum Short';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;player.append(frame);
        const h=document.createElement('h3');h.textContent=v.title;
        const a=document.createElement('a');a.className='rr-factum-fallback';a.href='https://www.youtube.com/shorts/'+v.id;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Watch on YouTube ↗';card.append(player,h,a);return card;
      });
      grid.replaceChildren(...cards);
    }
    lastSlot=slot;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',refresh,{once:true}); else refresh();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) void refresh();});
})();
