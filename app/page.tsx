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

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);

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
            {installPrompt && (
              <button className="install-button" onClick={() => void installApp()}>
                INSTALL APP
              </button>
            )}
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

        <section className="method">
          <div><span className="label">SIGNAL AUDIT</span><h2>Evidence & reaction</h2></div>
          <p>
            Sample {signal?.sampleSize ?? 0} · High impact {signal?.highImpactCount ?? 0} ·
            Context {percent(signal?.components?.context)} · Surprise {percent(signal?.components?.surprise)} ·
            Reaction {percent(signal?.components?.reaction)}
          </p>
        </section>

        <footer>
          <span>NewsXLeak</span>
          <span>Signal intelligence, not a profit guarantee.</span>
        </footer>
      </main>
    </div>
  );
}
