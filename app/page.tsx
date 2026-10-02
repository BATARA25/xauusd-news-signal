// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';

type Setup = {
  status: 'ACTIVE' | 'WAIT';
  side: 'BUY' | 'SELL' | 'WAIT';
  entryLow?: number;
  entryHigh?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  trigger: string;
  note: string;
};

type Signal = {
  symbol: 'XAUUSD';
  bias: 'BUY' | 'SELL' | 'WAIT';
  dailyBias: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  evidenceScore: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  phase?: 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT';
  eventName?: string;
  eventReleaseAt?: string;
  price?: number;
  priceUpdatedAt?: string;
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
  intradaySetup: Setup;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const PUSH_WORKER_URL = 'https://newsxleak-push-worker-production.up.railway.app';
const VAPID_PUBLIC_KEY = 'BMIMkJMz2bK8vLx0pXimADNcTfsrwdsPzDX1zzl70Hgo67s7Sef4tNoo4AChkYle90IYil4DuzhjdcpiL_RSUMI';

function decodeKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function money(value?: number) {
  return Number.isFinite(value) ? Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

function relativeTime(value?: string) {
  if (!value) return 'just now';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return sec + 's ago';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  return Math.floor(min / 60) + 'h ago';
}

export default function Home() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [live, setLive] = useState(false);
  const [alert, setAlert] = useState<'BUY' | 'SELL' | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [notifications, setNotifications] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushConnected, setPushConnected] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const [latency, setLatency] = useState<{ analysisMs: number; signalMs: number } | null>(null);
  const [activeTopic, setActiveTopic] = useState('XAUUSD');
  const previousKey = useRef('WAIT:');

  const registerPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setNotifications(permission);
    if (permission !== 'granted') return false;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(VAPID_PUBLIC_KEY) });
    const response = await fetch(PUSH_WORKER_URL + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON())
    });
    if (!response.ok) throw new Error('push_registration_failed');
    setPushConnected(true);
    return true;
  };

  const enableNotifications = async () => {
    try {
      if (!await registerPush()) return;
      setPushTesting(true);
      const response = await fetch('/api/push-test', { method: 'POST', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.sent) throw new Error('push_test_failed');
    } catch {
      setPushConnected(false);
    } finally {
      setPushTesting(false);
    }
  };

  const refresh = async () => {
    try {
      const response = await fetch('/api/signal?realtime=1', { cache: 'no-store' });
      if (!response.ok) { setLive(false); return; }
      const payload = await response.json();
      const next = payload.signal as Signal | undefined;
      if (!next) return;
      setSignal(next);
      setLive(true);
      if (Number.isFinite(payload.analysisLatencyMs) && Number.isFinite(payload.signalLatencyMs)) {
        setLatency({ analysisMs: payload.analysisLatencyMs, signalMs: payload.signalLatencyMs });
      }
      const key = next.bias + ':' + (next.eventReleaseAt ?? next.eventName ?? 'CONTEXT');
      if ((next.bias === 'BUY' || next.bias === 'SELL') && key !== previousKey.current) setAlert(next.bias);
      previousKey.current = key;
    } catch { setLive(false); }
  };

  useEffect(() => {
    document.title = 'NewsXLeak — XAUUSD Intelligence';
    if ('Notification' in window) setNotifications(Notification.permission);
    else setNotifications('unsupported');
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js', { scope: '/' });

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    const syncPush = async () => {
      if (Notification.permission !== 'granted') return;
      try { await registerPush(); } catch {}
    };
    void syncPush();
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

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const bias = signal?.dailyBias ?? 'WAIT';
  const setup = signal?.intradaySetup;
  const topics = ['XAUUSD', 'BREAKING', 'HIGH IMPACT', 'USD', 'MACRO', 'CENTRAL BANKS'];

  return (
    <div className="newsx-app">
      {alert && (
        <div className={'signal-toast ' + alert.toLowerCase()} role="status" aria-live="assertive">
          <span className="toast-dot" /><strong>{alert} XAUUSD</strong>
          <span className="toast-copy">New signal detected</span>
          <button onClick={() => setAlert(null)} aria-label="Close signal">×</button>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand-mark" onClick={() => setActiveTopic('XAUUSD')} aria-label="NewsXLeak home">
            <span className="brand-x">X</span><span>NewsXLeak</span>
          </button>
          <div className="topbar-center">
            <span className={'status-pill ' + (live ? 'online' : '')}><i /> {live ? 'LIVE INTELLIGENCE' : 'CONNECTING'}</span>
          </div>
          <div className="topbar-actions">
            {installPrompt && <button className="ghost-btn" onClick={() => void installApp()}>Install</button>}
            <button className={'alert-btn ' + (pushConnected ? 'enabled' : '')} onClick={() => void enableNotifications()}>
              <span>♢</span>{pushTesting ? 'Testing…' : pushConnected ? 'Alerts on' : 'Alerts'}
            </button>
          </div>
        </div>
      </header>

      <div className="topic-strip">
        <div className="topic-inner">
          <button className="search-topic" aria-label="Search topics">⌕</button>
          {topics.map((topic) => (
            <button key={topic} onClick={() => setActiveTopic(topic)} className={'topic-chip ' + (activeTopic === topic ? 'active' : '')}>{topic}</button>
          ))}
        </div>
      </div>

      <main className="content">
        <section className="welcome-row">
          <div>
            <div className="eyebrow"><span className="live-dot" /> LIVE MARKET BRIEF</div>
            <h1>What matters for <span>XAUUSD</span> right now.</h1>
            <p>AI-filtered macro intelligence, short-form news context and an execution layer in one feed.</p>
          </div>
          <div className="updated">
            <span>UPDATED</span>
            <strong>{relativeTime(signal?.updatedAt)}</strong>
          </div>
        </section>

        <section className="ticker">
          <div><span>XAUUSD</span><strong>{money(signal?.price)}</strong></div>
          <div><span>DAILY BIAS</span><strong className={bias.toLowerCase()}>{bias}</strong></div>
          <div><span>IMPACT</span><strong>{signal?.impact ?? '—'}</strong></div>
          <div><span>EVENT</span><strong>{signal?.eventName ?? 'Monitoring'}</strong></div>
          <div><span>ENGINE</span><strong>{latency ? (latency.analysisMs / 1000).toFixed(2) + 's' : '—'}</strong></div>
        </section>

        <section className="section-title">
          <div><span>TOP STORIES</span><strong>{activeTopic}</strong></div>
          <span className="feed-note">AI summary · live context</span>
        </section>

        <article className="master-card">
          <div className="master-top">
            <div className="source-line"><span className="source-icon">N</span><span>NewsXLeak Intelligence</span><span>•</span><span>{relativeTime(signal?.updatedAt)}</span></div>
            <span className={'impact-tag ' + (signal?.impact ?? 'LOW').toLowerCase()}>{signal?.impact ?? 'LOW'} IMPACT</span>
          </div>
          <div className="master-grid">
            <div className="master-copy">
              <span className="card-kicker">MASTER SIGNAL · XAUUSD</span>
              <h2>{signal?.eventName ? signal.eventName : 'Macro regime is being monitored'}</h2>
              <p>{signal?.drivers?.[0] ?? 'The engine is waiting for structured macro/news evidence before creating a directional setup.'}</p>
              <div className="story-actions">
                <button onClick={() => setActiveTopic('XAUUSD')}>View signal</button>
                <button className="subtle" onClick={() => void enableNotifications()}>Enable alerts</button>
              </div>
            </div>
            <div className={'master-bias ' + bias.toLowerCase()}>
              <span>DAILY BIAS</span>
              <strong>{bias}</strong>
              <small>{signal ? signal.confidence + '% confidence' : 'Awaiting data'}</small>
            </div>
          </div>
        </article>

        <section className="feed-grid">
          <article className="news-card">
            <div className="card-head"><span className="card-kicker">AI SUMMARY</span><span>{signal?.phase?.replace('_', ' ') ?? 'CONTEXT'}</span></div>
            <h3>Why the market is reacting this way</h3>
            <p>{signal?.drivers?.slice(0, 2).join(' ') || 'News, source quality, novelty, impact and release context are combined before the signal layer responds.'}</p>
            <div className="card-foot"><span>Evidence {signal?.evidenceScore ?? '—'}</span><span>{signal?.highImpactCount ?? 0} high-impact / {signal?.sampleSize ?? 0} sampled</span></div>
          </article>

          <article className="news-card setup-card">
            <div className="card-head"><span className="card-kicker">INTRADAY SETUP</span><span className={'mini-status ' + (setup?.status === 'ACTIVE' ? 'active' : '')}>{setup?.status ?? 'WAIT'}</span></div>
            <h3>{setup?.status === 'ACTIVE' ? setup.side + ' execution framework' : 'WAIT — no forced setup'}</h3>
            <div className="levels">
              <div><span>ENTRY</span><strong>{money(setup?.entryLow)} — {money(setup?.entryHigh)}</strong></div>
              <div><span>SL</span><strong>{money(setup?.stopLoss)}</strong></div>
              <div><span>TP1</span><strong>{money(setup?.takeProfit1)}</strong></div>
              <div><span>TP2</span><strong>{money(setup?.takeProfit2)}</strong></div>
            </div>
            <p className="micro-note">{setup?.trigger ?? 'Waiting for a valid execution trigger.'}</p>
          </article>
        </section>

        <section className="feed-section">
          <div className="section-title"><div><span>MARKET CONTEXT</span><strong>Latest intelligence</strong></div></div>
          {(signal?.drivers?.length ? signal.drivers : ['No fresh driver has been classified yet.']).map((driver, index) => (
            <article className="story-row" key={index}>
              <div className="story-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="story-body">
                <div className="story-meta"><span>{index === 0 ? 'PRIMARY DRIVER' : 'SUPPORTING EVIDENCE'}</span><span>·</span><span>XAUUSD</span></div>
                <h3>{driver}</h3>
                <p>AI-classified market context used by the signal engine.</p>
              </div>
              <div className="story-arrow">›</div>
            </article>
          ))}
        </section>

        <section className="method-strip">
          <div><span>HOW NEWSXLEAK WORKS</span><strong>News → Validation → Impact → Cross-asset → Signal</strong></div>
          <p>Daily direction stays separate from intraday execution. High-impact releases trigger recalculation; when evidence is insufficient, the system remains WAIT.</p>
        </section>
      </main>

      <nav className="bottom-nav">
        <button className="selected"><span>⌂</span>Home</button>
        <button onClick={() => setActiveTopic('BREAKING')}><span>▤</span>News</button>
        <button onClick={() => setActiveTopic('XAUUSD')}><span>◈</span>Signal</button>
        <button onClick={() => void enableNotifications()}><span>♢</span>Alerts</button>
        <button><span>⋯</span>More</button>
      </nav>
    </div>
  );
}
