'use client';

import { useEffect, useRef, useState } from 'react';

type News = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  summary: string;
  sourceTier?: string;
  sourceQuality?: number;
  novelty?: number;
  marketMoving?: number;
};

type Signal = {
  symbol: 'XAUUSD';
  bias: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  evidenceScore: number;
  score: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  phase?: 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT';
  eventName?: string;
  eventReleaseAt?: string;
  components?: { context: number; confirmation: number; surprise: number; reaction: number };
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
};

type Price = { price: number; updatedAt: string; source: string; stale?: boolean };
type Audit = {
  id: string; timestamp: string; bias: 'BUY' | 'SELL'; eventName?: string; phase?: string;
  confidence: number; evidenceScore: number; entry: number;
  prices: Record<'5m' | '15m' | '30m' | '60m', number | null>;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function timeWIB(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function percent(value: number | undefined) {
  return value === undefined ? '—' : Math.round(value * 100) + '%';
}

export default function Home() {
  const [news, setNews] = useState<News[]>([]);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [live, setLive] = useState(false);
  const [alert, setAlert] = useState<'BUY' | 'SELL' | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [price, setPrice] = useState<Price | null>(null);
  const [notifications, setNotifications] = useState<NotificationPermission | 'unsupported'>('default');
  const [audits, setAudits] = useState<Audit[]>([]);
  const previousKey = useRef('WAIT:');
  const AUDIT_KEY = 'newsxleak-live-audit-v1';

  const saveAudits = (next: Audit[]) => {
    setAudits(next);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next.slice(0, 100)));
  };

  const notifySignal = async (bias: 'BUY' | 'SELL', next: Signal) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'SIGNAL_ALERT', bias, eventName: next.eventName ?? 'XAUUSD signal',
      confidence: next.confidence, phase: next.phase ?? 'CONTEXT',
    });
  };

  const refreshPrice = async () => {
    try {
      const response = await fetch('/api/price', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok && Number.isFinite(data.price)) setPrice(data);
    } catch {}
  };
  const previousKey = useRef('WAIT:');

  const refresh = async () => {
    try {
      const [newsResponse, signalResponse] = await Promise.all([
        fetch('/api/news', { cache: 'no-store' }),
        fetch('/api/signal', { cache: 'no-store' }),
      ]);

      if (newsResponse.ok) {
        const data = await newsResponse.json();
        setNews(data.news ?? []);
      }

      if (signalResponse.ok) {
        const data = await signalResponse.json();
        const next = data.signal as Signal | undefined;
        if (!next) return;

        setSignal(next);
        setLive(true);

        const key = next.bias + ':' + (next.eventReleaseAt ?? next.eventName ?? '');
        if ((next.bias === 'BUY' || next.bias === 'SELL') && key !== previousKey.current) {
          setAlert(next.bias);
          void notifySignal(next.bias, next);
          if (price && Number.isFinite(price.price)) {
            const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) ?? '[]') as Audit[];
            if (!existing.some((item) => item.id === key)) {
              saveAudits([{
                id: key, timestamp: new Date().toISOString(), bias: next.bias,
                eventName: next.eventName, phase: next.phase, confidence: next.confidence,
                evidenceScore: next.evidenceScore, entry: price.price,
                prices: { '5m': null, '15m': null, '30m': null, '60m': null },
              }, ...existing]);
            }
          }
        }
        previousKey.current = key;
      } else {
        setLive(false);
      }
    } catch {
      setLive(false);
    }
  };

  useEffect(() => {
    document.title = 'NewsXLeak — XAUUSD News Intelligence';
    const saved = localStorage.getItem(AUDIT_KEY);
    if (saved) { try { setAudits(JSON.parse(saved)); } catch {} }
    if ('Notification' in window) setNotifications(Notification.permission);
    else setNotifications('unsupported');

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    void refreshPrice();
    void refresh();
    const timer = window.setInterval(() => { void refresh(); void refreshPrice(); }, 15000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!alert) return;
    const timer = window.setTimeout(() => setAlert(null), 7000);
    return () => window.clearTimeout(timer);
  }, [alert]);

  useEffect(() => {
    if (!price || audits.length === 0) return;
    const now = Date.now();
    let changed = false;
    const next = audits.map((item) => {
      const elapsed = now - Date.parse(item.timestamp);
      const prices = { ...item.prices };
      for (const [label, minutes] of [['5m', 5], ['15m', 15], ['30m', 30], ['60m', 60]] as const) {
        if (elapsed >= minutes * 60000 && prices[label] === null) { prices[label] = price.price; changed = true; }
      }
      return { ...item, prices };
    });
    if (changed) saveAudits(next);
  }, [price, audits]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifications(permission);
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'TEST_NOTIFICATION' });
    }
  };

  const exportAudit = () => {
    const header = 'timestamp,bias,event,phase,confidence,evidence,entry,5m,15m,30m,60m\\n';
    const rows = audits.map((a) => [
      a.timestamp, a.bias, a.eventName ?? '', a.phase ?? '', a.confidence, a.evidenceScore,
      a.entry, a.prices['5m'] ?? '', a.prices['15m'] ?? '', a.prices['30m'] ?? '', a.prices['60m'] ?? '',
    ].map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'newsxleak-live-audit.csv'; anchor.click();
    URL.revokeObjectURL(url);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const bias = signal?.bias ?? 'WAIT';

  return (
    <div className="newsx-wrap">
      {alert && (
        <div className={'signal-toast ' + alert.toLowerCase()} role="status" aria-live="assertive">
          <span className="toast-dot" />
          <strong>{alert}</strong>
          <button onClick={() => setAlert(null)} aria-label="Close signal">×</button>
        </div>
      )}

      <main>
        <header className="site-header">
          <div>
            <div className="brand">NewsXLeak</div>
            <p>Real-time economic news intelligence for XAUUSD.</p>
          </div>
          <div className="header-actions">
            {installPrompt && <button className="install-button" onClick={() => void installApp()}>INSTALL APP</button>}
            <button className="install-button" onClick={() => void enableNotifications()}>
              {notifications === 'granted' ? 'ALERTS ON' : 'ENABLE ALERTS'}
            </button>
            <div className="live"><i className={live ? 'on' : ''} />{live ? 'LIVE' : 'CONNECTING'}</div>
          </div>
        </header>

        <section className="hero">
          <div>
            <span className="label">XAUUSD / NEWS SIGNAL</span>
            <h1>News that matters.<br /><em>Signal when it matters.</em></h1>
            <p className="hero-copy">A focused news terminal for high-impact economic releases. Built for fast reading, not information overload.</p>
          </div>
          <div className="hero-signal">
            <span className="label">CURRENT SIGNAL</span>
            <strong className={bias.toLowerCase()}>{bias}</strong>
            <span>{signal ? signal.confidence + '% confidence' : 'Waiting for live data'}</span>
          </div>
        </section>

        <section className="quickbar">
          <div><span>MARKET</span><strong>XAUUSD</strong></div>
          <div><span>PRICE</span><strong>{price ? price.price.toFixed(2) : '—'}</strong></div>
          <div><span>IMPACT</span><strong>{signal?.impact ?? '—'}</strong></div>
          <div><span>PHASE</span><strong>{signal?.phase ?? '—'}</strong></div>
          <div><span>EVIDENCE</span><strong>{signal ? signal.evidenceScore + '%' : '—'}</strong></div>
        </section>

        <section className="method">
          <div>
            <span className="label">ENGINE STATE</span>
            <h2>{signal?.eventName ?? 'Context monitoring'}</h2>
          </div>
          <p>
            {signal?.phase === 'PRE_RELEASE'
              ? '80:20 pre-release weighting: context 80%, high-impact confirmation 20%.'
              : signal?.phase === 'POST_RELEASE'
                ? '40:60 post-release weighting: surprise 40%, observed reaction 60%.'
                : 'Context mode: no active release window. The engine avoids forcing a directional macro call.'}
          </p>
        </section>

        <section className="section-head">
          <div><span className="label">LIVE FEED</span><h2>Latest market news</h2></div>
          <span className="feed-status">{news.length} monitored stories</span>
        </section>

        <section className="news-list">
          {news.length === 0 ? (
            <div className="empty">Waiting for live market news…</div>
          ) : (
            news.map((item) => (
              <article className="news-row" key={item.id}>
                <div className="news-meta">
                  <span className={'impact ' + item.impact.toLowerCase()}>{item.impact}</span>
                  <span>{item.source}</span>
                  <span>{timeWIB(item.publishedAt)}</span>
                </div>
                <div className="news-main">
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </div>
                <div className={'direction ' + item.direction.toLowerCase()}>{item.direction}</div>
              </article>
            ))
          )}
        </section>

        <section className="method audit-panel">
          <div><span className="label">LIVE AUDIT</span><h2>{audits.length} directional alerts recorded</h2></div>
          <div>
            <p>Captures price at signal and 5/15/30/60-minute reaction points. This is an observation log, not a fabricated WIN/LOSS result.</p>
            <div className="audit-actions">
              <button className="install-button" onClick={exportAudit}>EXPORT CSV</button>
              {price && <span className="feed-status">Spot {price.price.toFixed(2)} · {timeWIB(price.updatedAt)}</span>}
            </div>
          </div>
        </section>

        <section className="method">
          <div><span className="label">SIGNAL AUDIT</span><h2>Evidence & reaction</h2></div>
          <p>
            Sample {signal?.sampleSize ?? 0} · High impact {signal?.highImpactCount ?? 0} ·
            Context {percent(signal?.components?.context)} · Surprise {percent(signal?.components?.surprise)} ·
            Reaction {percent(signal?.components?.reaction)}
          </p>
        </section>

        <section className="news-list audit-list">
          {audits.length === 0 ? <div className="empty">No BUY/SELL event captured yet.</div> : audits.slice(0, 8).map((a) => (
            <article className="news-row" key={a.id}>
              <div className="news-meta"><span>{timeWIB(a.timestamp)}</span><span>{a.phase ?? '—'}</span></div>
              <div className="news-main">
                <h3>{a.bias} · {a.eventName ?? 'Signal'}</h3>
                <p>Entry {a.entry.toFixed(2)} · +5m {a.prices['5m']?.toFixed(2) ?? 'pending'} · +15m {a.prices['15m']?.toFixed(2) ?? 'pending'} · +30m {a.prices['30m']?.toFixed(2) ?? 'pending'} · +60m {a.prices['60m']?.toFixed(2) ?? 'pending'}</p>
              </div>
              <div className={'direction ' + a.bias.toLowerCase()}>{a.confidence}%</div>
            </article>
          ))}
        </section>

        <footer>
          <span>NewsXLeak</span>
          <span>Signal intelligence, not a profit guarantee.</span>
        </footer>
      </main>
    </div>
  );
}
