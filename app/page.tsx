'use client';

import { useEffect, useState } from 'react';

type News = { id: string; title: string; url: string; source: string; publishedAt: string; impact: 'HIGH'|'MEDIUM'|'LOW'; direction: 'BULLISH'|'BEARISH'|'NEUTRAL'; score: number; summary: string };

function timeWIB(value: string) { return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'medium'}).format(new Date(value)); }

export default function Home() {
  const [news,setNews] = useState<News[]>([]); const [live,setLive] = useState(false);
  useEffect(() => { fetch('/api/news').then(r=>r.json()).then(d=>setNews(d.news||[])).catch(()=>{}); const es=new EventSource('/api/news/stream'); es.onopen=()=>setLive(true); es.onerror=()=>setLive(false); es.onmessage=e=>{ try { const item=JSON.parse(e.data); setNews(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,50)); } catch {} }; return ()=>es.close(); },[]);
  return <main><header><div><span className="eyebrow">BATARA CAPITAL</span><h1>XAUUSD NEWS SIGNAL</h1><p>Real-time macro intelligence for Gold.</p></div><div className="live"><i className={live?'on':''}/> {live?'LIVE':'CONNECTING'}</div></header><section className="bar"><span>{news.length} monitored events</span><span>Timezone: WIB</span><span>Auto refresh: 15s</span></section><section className="grid">{news.length===0?<div className="empty">Waiting for market news...</div>:news.map(n=><article className="card" key={n.id}><div className="top"><span className={'impact '+n.impact.toLowerCase()}>{n.impact}</span><span>{timeWIB(n.publishedAt)}</span></div><h2>{n.title}</h2><p>{n.summary}</p><div className="signal"><strong className={n.direction.toLowerCase()}>{n.direction}</strong><span>Impact score {n.score}</span><span>{n.source}</span></div><a href={n.url} target="_blank" rel="noreferrer">Open source ↗</a></article>)}</section></main>;
}
