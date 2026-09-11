'use client';

import { useEffect, useState } from 'react';

type News = { id: string; title: string; url: string; source: string; publishedAt: string; impact: 'HIGH'|'MEDIUM'|'LOW'; direction: 'BULLISH'|'BEARISH'|'NEUTRAL'; score: number; summary: string };
type Signal = { symbol: 'XAUUSD'; bias: 'BUY'|'SELL'|'WAIT'; confidence: number; score: number; impact: 'HIGH'|'MEDIUM'|'LOW'; updatedAt: string; drivers: string[]; highImpactCount: number; sampleSize: number };

function timeWIB(value: string) { return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'medium'}).format(new Date(value)); }

export default function Home() {
  const [news,setNews] = useState<News[]>([]); const [signal,setSignal] = useState<Signal|null>(null); const [live,setLive] = useState(false);
  const refreshSignal = () => fetch('/api/signal').then(r=>r.json()).then(d=>setSignal(d.signal||null)).catch(()=>{});
  useEffect(() => { fetch('/api/news').then(r=>r.json()).then(d=>setNews(d.news||[])).catch(()=>{}); refreshSignal(); const es=new EventSource('/api/news/stream'); es.onopen=()=>setLive(true); es.onerror=()=>setLive(false); es.onmessage=e=>{ try { const item=JSON.parse(e.data); setNews(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,50)); } catch {} }; const timer=setInterval(refreshSignal,15000); return ()=>{es.close();clearInterval(timer)}; },[]);
  return <main><header><div><span className="eyebrow">BATARA CAPITAL</span><h1>XAUUSD NEWS SIGNAL</h1><p>Real-time macro intelligence for Gold.</p></div><div className="live"><i className={live?'on':''}/> {live?'LIVE':'CONNECTING'}</div></header><section className="bar"><span>{news.length} monitored events</span><span>Timezone: WIB</span><span>Auto refresh: 15s</span></section>
    {signal && <section className="signal-panel"><div><small>AGGREGATE MARKET BIAS</small><strong className={signal.bias.toLowerCase()}>{signal.bias}</strong></div><div><small>CONFIDENCE</small><strong>{signal.confidence}%</strong></div><div><small>MACRO SCORE</small><strong>{signal.score}/100</strong></div><div><small>HIGH IMPACT</small><strong>{signal.highImpactCount}</strong></div><div><small>STATUS</small><strong>{signal.impact}</strong></div></section>}
    {signal?.drivers.length ? <section className="drivers"><small>TOP MACRO DRIVERS</small>{signal.drivers.map((x,i)=><div key={i}>{x}</div>)}</section> : null}
    <section className="grid">{news.length===0?<div className="empty">Waiting for market news...</div>:news.map(n=><article className="card" key={n.id}><div className="top"><span className={'impact '+n.impact.toLowerCase()}>{n.impact}</span><span>{timeWIB(n.publishedAt)}</span></div><h2>{n.title}</h2><p>{n.summary}</p><div className="signal"><strong className={n.direction.toLowerCase()}>{n.direction}</strong><span>Impact score {n.score}</span><span>{n.source}</span></div><a href={n.url} target="_blank" rel="noreferrer">Open source ↗</a></article>)}</section></main>;
}
