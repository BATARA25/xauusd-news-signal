import Parser from 'rss-parser';

export type News = { id:string; title:string; url:string; source:string; publishedAt:string; impact:'HIGH'|'MEDIUM'|'LOW'; direction:'BULLISH'|'BEARISH'|'NEUTRAL'; score:number; summary:string };
const parser=new Parser();
const feeds=[
 ['Google News','https://news.google.com/rss/search?q=XAUUSD%20OR%20gold%20OR%20Federal%20Reserve%20OR%20FOMC&hl=en-US&gl=US&ceid=US:en'],
 ['Federal Reserve','https://www.federalreserve.gov/feeds/press_all.xml']
] as const;
const bullish=['rate cut','rate cuts','dovish','lower rates','lower yield','weaker dollar','weak dollar','recession','slowing inflation'];
const bearish=['rate hike','rate hikes','hawkish','higher rates','higher yield','strong dollar','strong usd','sticky inflation'];
const high=['fomc','fed decision','interest rate','rate decision','cpi','nfp','nonfarm payroll','ppi','inflation'];
export async function collectNews():Promise<News[]> { const all:News[]=[]; await Promise.all(feeds.map(async([source,url])=>{try{const f=await parser.parseURL(url); for(const x of (f.items||[]).slice(0,30)){const title=x.title||''; const text=(title+' '+(x.contentSnippet||x.content||'')).toLowerCase(); if(!/(gold|xauusd|xau\/usd|federal reserve|fed|fomc|inflation|cpi|ppi|nfp|nonfarm|dollar|treasury|yield|interest rate)/i.test(text)) continue; const bull=bullish.filter(k=>text.includes(k)).length, bear=bearish.filter(k=>text.includes(k)).length; const direction=bull>bear?'BULLISH':bear>bull?'BEARISH':'NEUTRAL'; const impact=high.some(k=>text.includes(k))?'HIGH':(bull+bear?'MEDIUM':'LOW'); const score=Math.min(100,Math.round(50+(bull-bear)*18+(impact==='HIGH'?20:impact==='MEDIUM'?8:0))); const publishedAt=x.isoDate||x.pubDate||new Date().toISOString(); all.push({id:x.guid||x.link||`${source}-${publishedAt}-${title}`,title,url:x.link||'#',source,publishedAt,impact,direction,score,summary:(x.contentSnippet||'').replace(/\s+/g,' ').slice(0,220)}); }}catch{}})); return all.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,50); }
