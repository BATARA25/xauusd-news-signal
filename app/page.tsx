// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';

type News = { id: string; title: string; source: string; publishedAt: string; impact: 'HIGH' | 'MEDIUM' | 'LOW'; direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; summary: string };
type Signal = { symbol: 'XAUUSD'; bias: 'BUY' | 'SELL' | 'WAIT'; confidence: number; evidenceScore: number; impact: 'HIGH' | 'MEDIUM' | 'LOW'; phase?: 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT'; eventName?: string; eventReleaseAt?: string; updatedAt: string; drivers: string[]; highImpactCount: number; sampleSize: number };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };

const PUSH_WORKER_URL = 'https://newsxleak-push-worker-production.up.railway.app';
const VAPID_PUBLIC_KEY = 'BMIMkJMz2bK8vLx0pXimADNcTfsrwdsPzDX1zzl70Hgo67s7Sef4tNoo4AChkYle90IYil4DuzhjdcpiL_RSUMI';

function timeWIB(value: string) { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)); }
function decodeKey(value: string) { const padding = '='.repeat((4 - (value.length % 4)) % 4); const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); }

export default function Home() {
  const [news, setNews] = useState<News[]>([]);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [live, setLive] = useState(false);
  const [alert, setAlert] = useState<'BUY' | 'SELL' | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [notifications, setNotifications] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushConnected, setPushConnected] = useState(false);
  const [latency, setLatency] = useState<{ analysisMs: number; signalMs: number } | null>(null);
  const previousKey = useRef('WAIT:');

  const registerPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    setNotifications(permission);
    if (permission !== 'granted') return false;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(VAPID_PUBLIC_KEY) });
    const response = await fetch(PUSH_WORKER_URL + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
    if (!response.ok) throw new Error('push_registration_failed');
    setPushConnected(true);
    return true;
  };

  const enableNotifications = async () => {
    try {
      if (await registerPush()) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: 'TEST_NOTIFICATION' });
      }
    } catch { setPushConnected(false); }
  };

  const refresh = async () => {
    try {
      const [newsResponse, signalResponse] = await Promise.all([fetch('/api/news', { cache: 'no-store' }), fetch('/api/signal', { cache: 'no-store' })]);
      if (newsResponse.ok) setNews((await newsResponse.json()).news ?? []);
      if (!signalResponse.ok) { setLive(false); return; }
      const payload = await signalResponse.json();
      const next = payload.signal as Signal | undefined;
      if (!next) return;
      setSignal(next); setLive(true);
      if (Number.isFinite(payload.analysisLatencyMs) && Number.isFinite(payload.signalLatencyMs)) setLatency({ analysisMs: payload.analysisLatencyMs, signalMs: payload.signalLatencyMs });
      const key = next.bias + ':' + (next.eventReleaseAt ?? next.eventName ?? 'CONTEXT');
      if ((next.bias === 'BUY' || next.bias === 'SELL') && key !== previousKey.current) setAlert(next.bias);
      previousKey.current = key;
    } catch { setLive(false); }
  };

  useEffect(() => {
    document.title = 'NewsXLeak — XAUUSD Signal Engine';
    if ('Notification' in window) setNotifications(Notification.permission); else setNotifications('unsupported');
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const onInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { window.removeEventListener('beforeinstallprompt', onInstallPrompt); window.clearInterval(timer); };
  }, []);

  useEffect(() => { if (!alert) return; const timer = window.setTimeout(() => setAlert(null), 7000); return () => window.clearTimeout(timer); }, [alert]);

  const installApp = async () => { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); };
  const bias = signal?.bias ?? 'WAIT';

  return (
    <div className="newsx-wrap">
      {alert && <div className={'signal-toast ' + alert.toLowerCase()} role="status" aria-live="assertive"><span className="toast-dot" /><strong>{alert} XAUUSD</strong><button onClick={() => setAlert(null)} aria-label="Close signal">×</button></div>}
      <main>
        <header className="site-header">
          <div><div className="brand">NewsXLeak</div><p>Fast macro-news signal engine for manual XAUUSD analysis.</p></div>
          <div className="header-actions">
            {installPrompt && <button className="install-button" onClick={() => void installApp()}>INSTALL</button>}
            <button className="install-button" onClick={() => void enableNotifications()}>{pushConnected ? 'PUSH ON' : notifications === 'granted' ? 'ENABLE PUSH' : 'ALERTS'}</button>
            <div className="live"><i className={live ? 'on' : ''} />{live ? 'LIVE' : 'CONNECTING'}</div>
          </div>
        </header>

        <section className="hero">
          <div><span className="label">XAUUSD NEWS ENGINE</span><h1>News → <em>Signal.</em></h1><p className="hero-copy">No chart timeframes. No technical indicators. Just macro news, impact analysis and a fast directional alert for manual execution.</p></div>
          <div className="hero-signal"><span className="label">CURRENT</span><strong className={bias.toLowerCase()}>{bias}</strong><span>{signal ? signal.confidence + '% confidence' : 'Waiting for live data'}</span></div>
        </section>

        <section className="quickbar">
          <div><span>EVENT</span><strong>{signal?.eventName ?? '—'}</strong></div>
          <div><span>IMPACT</span><strong>{signal?.impact ?? '—'}</strong></div>
          <div><span>PHASE</span><strong>{signal?.phase ?? '—'}</strong></div>
          <div><span>PUSH</span><strong>{pushConnected ? 'READY' : 'OFF'}</strong></div>
          <div><span>ANALYSIS</span><strong>{latency ? (latency.analysisMs / 1000).toFixed(2) + 's' : '—'}</strong></div>
          <div><span>SIGNAL</span><strong>{latency ? (latency.signalMs / 1000).toFixed(2) + 's' : '—'}</strong></div>
        </section>

        <section className="method"><div><span className="label">ENGINE</span><h2>{signal?.eventName ?? 'Monitoring high-impact macro news'}</h2></div><p>{signal?.phase === 'PRE_RELEASE' ? 'Pre-release: 80% macro context + 20% high-impact confirmation.' : signal?.phase === 'POST_RELEASE' ? 'Post-release: 40% release surprise + 60% observed news reaction.' : 'Context mode: no active release window. The engine avoids forcing a directional call.'}</p></section>

        <section className="section-head"><div><span className="label">NEWS FEED</span><h2>Latest relevant news</h2></div><span className="feed-status">{news.length} stories</span></section>
        <section className="news-list">
          {news.length === 0 ? <div className="empty">Waiting for live news…</div> : news.slice(0, 8).map((item) => <article className="news-row" key={item.id}><div className="news-meta"><span className={'impact ' + item.impact.toLowerCase()}>{item.impact}</span><span>{item.source}</span><span>{timeWIB(item.publishedAt)}</span></div><div className="news-main"><h3>{item.title}</h3><p>{item.summary}</p></div><div className={'direction ' + item.direction.toLowerCase()}>{item.direction}</div></article>)}
        </section>

        <section className="method"><div><span className="label">SYSTEM</span><h2>Manual analysis accelerator</h2></div><p>NewsXLeak surfaces macro-news direction quickly. It does not execute trades, and BUY/SELL signals are directional intelligence that should be verified against the underlying release and live market conditions.</p></section>
        <footer><span>NewsXLeak</span><span>Signal intelligence, not a profit guarantee.</span></footer>
      </main>
    </div>
  );
}
