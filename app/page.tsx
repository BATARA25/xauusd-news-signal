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
  score: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  phase?: 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT';
  eventName?: string;
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
};

function timeWIB(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export default function Home() {
  const [news, setNews] = useState<News[]>([]);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [live, setLive] = useState(false);
  const [alert, setAlert] = useState<'BUY' | 'SELL' | null>(null);
  const previousBias = useRef<Signal['bias']>('WAIT');

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

        if (next.bias === 'BUY' || next.bias === 'SELL') {
          if (next.bias !== previousBias.current) {
            setAlert(next.bias);
          }
        }
        previousBias.current = next.bias;
      } else {
        setLive(false);
      }
    } catch {
      setLive(false);
    }
  };

  useEffect(() => {
    document.title = 'NewsXLeak — XAUUSD News Intelligence';
    void refresh();

    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!alert) return;
    const timer = window.setTimeout(() => setAlert(null), 7000);
    return () => window.clearTimeout(timer);
  }, [alert]);

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
          <div className="live">
            <i className={live ? 'on' : ''} />
            {live ? 'LIVE' : 'CONNECTING'}
          </div>
        </header>

        <section className="hero">
          <div>
            <span className="label">XAUUSD / NEWS SIGNAL</span>
            <h1>News that matters.<br /><em>Signal when it matters.</em></h1>
            <p className="hero-copy">
              A focused news terminal for high-impact economic releases. Built for fast reading, not information overload.
            </p>
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
          <div><span>UPDATED</span><strong>{signal ? timeWIB(signal.updatedAt) : '—'}</strong></div>
        </section>

        <section className="section-head">
          <div>
            <span className="label">LIVE FEED</span>
            <h2>Latest market news</h2>
          </div>
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
          <div>
            <span className="label">SIGNAL ENGINE</span>
            <h2>80:20 → 40:60</h2>
          </div>
          <p>Pre-release context uses the 80:20 weighting. After a structured release, the engine shifts to 40:60 surprise versus reaction.</p>
        </section>

        <footer>
          <span>NewsXLeak</span>
          <span>Signal intelligence, not a profit guarantee.</span>
        </footer>
      </main>
    </div>
  );
}
