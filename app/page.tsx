'use client';

import { useEffect, useState } from 'react';

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
};

type Signal = {
  symbol: 'XAUUSD';
  bias: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  score: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
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

  const refreshSignal = async () => {
    try {
      const response = await fetch('/api/signal', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const next = data.signal as Signal | undefined;
      setSignal(next ?? null);
      if (next?.bias === 'BUY' || next?.bias === 'SELL') setAlert(next.bias);
    } catch {
      // Keep the previous signal during transient network failures.
    }
  };

  useEffect(() => {
    document.title = 'NewsXLeak — XAUUSD News Intelligence';

    const loadNews = async () => {
      try {
        const response = await fetch('/api/news', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setNews(data.news ?? []);
      } catch {
        // The SSE stream can recover the feed.
      }
    };

    void loadNews();
    void refreshSignal();

    const source = new EventSource('/api/news/stream');
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        const item = JSON.parse(event.data) as News;
        setNews((current) => [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 50));
      } catch {
        // Ignore malformed individual SSE events.
      }
    };

    const timer = window.setInterval(() => void refreshSignal(), 15000);

    return () => {
      source.close();
      window.clearInterval(timer);
    };
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
          <div><span>EVENTS</span><strong>{signal?.highImpactCount ?? '—'}</strong></div>
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
          <p>NewsXLeak separates news context from market confirmation. The engine weighs fundamental news first, then validates direction against subsequent market reaction.</p>
        </section>

        <footer>
          <span>NewsXLeak</span>
          <span>Signal intelligence, not a profit guarantee.</span>
        </footer>
      </main>
    </div>
  );
}
