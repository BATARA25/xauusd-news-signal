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

export default function Home() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [live, setLive] = useState(false);
  const [alert, setAlert] = useState<'BUY' | 'SELL' | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [notifications, setNotifications] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushConnected, setPushConnected] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const [latency, setLatency] = useState<{ analysisMs: number; signalMs: number } | null>(null);
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
    document.title = 'NewsXLeak — Daily & Intraday XAUUSD';
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

  return (
    <div className="newsx-wrap">
      {alert && (
        <div className={'signal-toast ' + alert.toLowerCase()} role="status" aria-live="assertive">
          <span className="toast-dot" /><strong>{alert} XAUUSD</strong>
          <button onClick={() => setAlert(null)} aria-label="Close signal">×</button>
        </div>
      )}

      <main>
        <header className="site-header">
          <div>
            <div className="brand">NewsXLeak</div>
            <p>Daily bias → intraday setup → macro catalyst alerts.</p>
          </div>
          <div className="header-actions">
            {installPrompt && <button className="install-button" onClick={() => void installApp()}>INSTALL</button>}
            <button className="install-button" onClick={() => void enableNotifications()}>
              {pushTesting ? 'TESTING…' : pushConnected ? 'PUSH ON' : notifications === 'granted' ? 'ENABLE PUSH' : 'ALERTS'}
            </button>
            <div className="live"><i className={live ? 'on' : ''} />{live ? 'LIVE' : 'CONNECTING'}</div>
          </div>
        </header>

        <section className="hero">
          <div>
            <span className="label">XAUUSD DAILY SIGNAL</span>
            <h1>Daily <em>Bias.</em></h1>
            <p className="hero-copy">The daily layer reads the macro/news regime and produces one directional bias. Intraday execution is separated into a setup layer so the two decisions do not get mixed.</p>
          </div>
          <div className="hero-signal">
            <span className="label">TODAY</span>
            <strong className={bias.toLowerCase()}>{bias}</strong>
            <span>{signal ? signal.confidence + '% confidence' : 'Waiting for live data'}</span>
          </div>
        </section>

        <section className="quickbar">
          <div><span>PRICE</span><strong>{money(signal?.price)}</strong></div>
          <div><span>EVENT</span><strong>{signal?.eventName ?? '—'}</strong></div>
          <div><span>IMPACT</span><strong>{signal?.impact ?? '—'}</strong></div>
          <div><span>PUSH</span><strong>{pushConnected ? 'READY' : 'OFF'}</strong></div>
          <div><span>ANALYSIS</span><strong>{latency ? (latency.analysisMs / 1000).toFixed(2) + 's' : '—'}</strong></div>
        </section>

        <section className="signal-focus">
          <span className="label">DAILY BIAS</span>
          <div className={'focus-bias ' + bias.toLowerCase()}>{bias}</div>
          <p>{signal?.phase === 'PRE_RELEASE' ? 'Macro event window: pre-release context is active.' : signal?.phase === 'POST_RELEASE' ? 'Macro event window: post-release reaction is active.' : 'No active major release window.'}</p>
        </section>

        <section className="setup-panel">
          <div className="setup-head">
            <div><span className="label">INTRADAY SETUP</span><h2>{setup?.status === 'ACTIVE' ? setup.side + ' execution framework' : 'WAIT — no forced setup'}</h2></div>
            <span className={'setup-status ' + (setup?.status === 'ACTIVE' ? 'active' : 'wait')}>{setup?.status ?? 'WAIT'}</span>
          </div>

          <div className="setup-grid">
            <div><span>ENTRY ZONE</span><strong>{money(setup?.entryLow)} — {money(setup?.entryHigh)}</strong></div>
            <div><span>STOP LOSS</span><strong>{money(setup?.stopLoss)}</strong></div>
            <div><span>TP1</span><strong>{money(setup?.takeProfit1)}</strong></div>
            <div><span>TP2</span><strong>{money(setup?.takeProfit2)}</strong></div>
          </div>

          <p className="setup-trigger">{setup?.trigger ?? 'Waiting for signal.'}</p>
          <p className="setup-note">{setup?.note ?? 'Intraday setup will appear after daily direction and price are available.'}</p>
        </section>

        <section className="method">
          <div><span className="label">MACRO ENGINE</span><h2>{signal?.eventName ?? 'Monitoring the macro regime'}</h2></div>
          <p>Daily bias uses news direction, source quality, novelty, impact, event context and release surprise when structured actual/forecast data exists. Intraday levels are dynamic volatility buffers around the live XAUUSD price; they are not claimed as technical support/resistance.</p>
        </section>

        <section className="method">
          <div><span className="label">SYSTEM</span><h2>Two layers. One workflow.</h2></div>
          <p><b>Daily:</b> establish directional bias. <b>Intraday:</b> wait for price to enter the setup zone while the bias remains valid. <b>News:</b> recalculate immediately around high-impact releases. <b>WAIT:</b> no forced trade setup.</p>
        </section>

        <footer><span>NewsXLeak</span><span>Decision support, not a profit guarantee.</span></footer>
      </main>
    </div>
  );
}
