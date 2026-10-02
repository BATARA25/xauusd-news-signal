'use client';

import { useEffect, useState } from 'react';

type News = {
  id: string; title: string; url: string; source: string; publishedAt: string;
  impact: 'HIGH'|'MEDIUM'|'LOW'; direction: 'BULLISH'|'BEARISH'|'NEUTRAL';
  score: number; summary: string;
};
type Signal = {
  symbol: 'XAUUSD'; bias: 'BUY'|'SELL'|'WAIT'; confidence: number; score: number;
  impact: 'HIGH'|'MEDIUM'|'LOW'; updatedAt: string; drivers: string[];
  highImpactCount: number; sampleSize: number;
};
function timeWIB(value: string) {
  return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'medium'}).format(new Date(value));
}
export default function Home() {
  const [news,setNews]=useState<News[]>([]);
  const [signal,setSignal]=useState<Signal|null>(null);
  const [live,setLive]=useState(false);
  const [alert,setAlert]=useState<'BUY'|'SELL'|null>(null);
  const refresh=()=>fetch('/api/signal',{cache:'no-store'}).then(r=>r.json()).then(d=>{
    const next=d.signal||null; setSignal(next);
    if(next?.bias==='BUY'||next?.bias==='SELL') setAlert(next.bias);
  }).catch(()=>{});
  useEffect(()=>{
    fetch('/api/news',{cache:'no-store'}).then(r=>r.json()).then(d=>setNews(d.news||[])).catch(()=>{});
    refresh();
    const es=new EventSource('/api/news/stream');
    es.onopen=()=>setLive(true); es.onerror=()=>setLive(false);
    es.onmessage=e=>{try{const item=JSON.parse(e.data);setNews(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,50));}catch{}};
    const timer=setInterval(refresh,15000);
    return()=>{es.close();clearInterval(timer)};
  },[]);
  useEffect(()=>{if(!alert)return;const timer=setTimeout(()=>setAlert(null),7000);return()=>clearTimeout(timer)},[alert]);
  return <div className="newsx-wrap"><main>
    {alert&&<div className={'signal-toast '+alert.toLowerCase()} role="status" aria-live="assertive"><span className="toast-dot"/><strong>{alert}</strong><button onClick={()=>setAlert(null)} aria-label="Close signal">×</button></div>}
    <header className="site-header">
      <div><div className="brand">NewsXLeak</div><p>Real-time economic news intelligence for XAUUSD.</p></div>
      <div className="live"><i className={live?'on':''}/>{live?'LIVE':'CONNECTING'}</div>
    </header>
    <section className="hero">
      <div><span className="label">XAUUSD / NEWS SIGNAL</span><h1>News that matters.<br/><em>Signal when it matters.</em></h1><p className="hero-copy">A focused news terminal for high-impact economic releases. Built for fast reading, not information overload.</p></div>
      <div className="hero-signal"><span className="label">CURRENT SIGNAL</span><strong className={(signal?.bias||'WAIT').toLowerCase()}>{signal?.bias||'WAIT'}</strong><span>{signal?signal.confidence+'% confidence':'Waiting for live data'}</span></div>
    </section>
    <section className="quickbar">
      <div><span>MARKET</span><strong>XAUUSD</strong></div><div><span>IMPACT</span><strong>{signal?.impact||'—'}</strong></div><div><span>EVENTS</span><strong>{signal?.highImpactCount??'—'}</strong></div><div><span>UPDATED</span><strong>{signal?timeWIB(signal.updatedAt):'—'}</strong></div>
    </section>
    <section className="section-head"><div><span className="label">LIVE FEED</span><h2>Latest market news</h2></div><span className="feed-status">{news.length} monitored stories</span></section>
    <section className="news-list">
      {news.length===0?<div className="empty">Waiting for live market news…</div>:news.map(n=><article className="news-row" key={n.id}>
        <div className="news-meta"><span className={'impact '+n.impact.toLowerCase()}>{n.impact}</span><span>{n.source}</span><span>{timeWIB(n.publishedAt)}</span></div>
        <div className="news-main"><h3>{n.title}</h3><p>{n.summary}</p></div>
        <div className={'direction '+n.direction.toLowerCase()}>{n.direction}</div>
      </article>)}
    </section>
    <section className="method"><div><span className="label">SIGNAL ENGINE</span><h2>80:20 → 40:60</h2></div><p>NewsXLeak separates news context from market confirmation. The signal engine weighs fundamental news first, then validates the direction against live market reaction.</p></section>
    <footer><span>NewsXLeak</span><span>Signal intelligence, not a profit guarantee.</span></footer>
  </main></div><style>{`.newsx-wrap{max-width:1180px;margin:auto;padding:22px 24px 60px;background:#07090c;min-height:100vh}.newsx-wrap .brand{font-size:24px;font-weight:760}.newsx-wrap .hero{display:grid;grid-template-columns:1fr 260px;gap:30px;padding:64px 0 46px;align-items:end}.newsx-wrap h1{font-size:clamp(38px,6vw,70px);line-height:.98;letter-spacing:-.065em;margin:12px 0 18px}.newsx-wrap h1 em{font-style:normal;color:#818a96}.newsx-wrap .hero-copy{max-width:560px;color:#8c95a1;line-height:1.6;font-size:14px}.newsx-wrap .hero-signal{border-left:1px solid #252b32;padding-left:25px}.newsx-wrap .hero-signal strong{display:block;font-size:44px;margin:8px 0}.newsx-wrap .buy{color:#4ee58d}.newsx-wrap .sell{color:#ff6978}.newsx-wrap .wait{color:#b8c0c9}.newsx-wrap .quickbar{display:grid;grid-template-columns:repeat(4,1fr)}.newsx-wrap .section-head{display:flex;justify-content:space-between;align-items:end;margin:52px 0 18px}.newsx-wrap .news-row{display:grid;grid-template-columns:155px 1fr 100px;gap:24px}.signal-toast{position:fixed!important;top:18px!important;right:18px!important;z-index:10000!important;width:220px!important;display:flex!important;align-items:center!important;gap:12px!important;padding:14px!important;border:1px solid #293038!important;border-radius:12px!important;background:rgba(12,15,19,.97)!important;box-shadow:0 14px 40px rgba(0,0,0,.38)!important}.signal-toast strong{font-size:22px!important}.signal-toast button{margin-left:auto!important;border:0!important;background:none!important;color:#77818d!important;font-size:20px!important}.signal-toast.buy{border-color:#255a40!important}.signal-toast.sell{border-color:#663039!important}.toast-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}.signal-toast.buy .toast-dot{background:#4ee58d}.signal-toast.sell .toast-dot{background:#ff6978}@media(max-width:720px){.newsx-wrap{padding:16px 15px 45px}.newsx-wrap .hero{grid-template-columns:1fr;padding:42px 0 30px}.newsx-wrap .hero-signal{border-left:0;border-top:1px solid #252b32;padding:18px 0 0}.newsx-wrap .quickbar{grid-template-columns:repeat(2,1fr)}.newsx-wrap .news-row{grid-template-columns:1fr;gap:10px}.signal-toast{top:12px!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;width:min(330px,calc(100vw - 24px))!important}}`}</style>;
}
