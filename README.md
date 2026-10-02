# NewsXLeak

> Real-time economic news intelligence for XAUUSD.

Production URL: https://xauusd-news-signal-4i2p.vercel.app

NewsXLeak is a focused macro-news dashboard for monitoring high-impact economic releases and translating validated news context into a simple **BUY / SELL / WAIT** directional signal for XAUUSD.

The product is designed around one principle: **reduce the time between an important economic release and a clear, auditable market signal without turning the interface into a crowded trading terminal.**

## Product

- XAUUSD-first macro news monitoring
- Normalized RSS/news collection
- Gold-relevance filtering
- Deterministic macro classification
- 80:20 pre-news context framework
- 40:60 post-release fundamental/market-confirmation framework
- BUY / SELL / WAIT signal states
- Short-polling live news feed with shared server-side cache
- Compact floating BUY / SELL notification
- Mobile-first, low-clutter interface
- Health and API endpoints for deployment monitoring

## Architecture

```text
News Sources
    │
    ▼
Collector / Normalizer
    │
    ▼
Gold Relevance + Macro Classification
    │
    ├──────────────► Live News Feed
    │
    ▼
Signal Engine
    │
    ├── Pre-news: 80 / 20
    └── Post-release: 40 / 60
    │
    ▼
XAUUSD Signal
    │
    ├── Dashboard
    └── Floating BUY / SELL Alert
```

### Signal model

**Pre-news:** 80% macro/news context + 20% market context.

This produces an internal bias. It is not treated as a confirmed trade signal before the release.

**Post-release:** 40% fundamental surprise + 60% market confirmation.

The weighting model is a product rule, not a guarantee of future performance.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- RSS Parser
- Short-interval API polling
- Node.js
- Docker/Railway-compatible deployment

## Project structure

```text
.
├── app/
│   ├── api/
│   │   ├── health/
│   │   ├── news/
│   │   └── signal/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── src/
├── docs/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── CONTRIBUTING.md
│   └── SECURITY.md
├── .env.example
├── Dockerfile
├── package.json
└── README.md
```

## Getting started

### Requirements

- Node.js 20+
- npm 10+

### Install

```bash
git clone https://github.com/BATARA25/xauusd-news-signal.git
cd xauusd-news-signal
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

### Production

```bash
npm run build
npm run start
```

### Quality checks

```bash
npm run typecheck
npm run build
```

## API

| Endpoint | Purpose |
|---|---|
| `GET /` | NewsXLeak dashboard |
| `GET /api/health` | Service health |
| `GET /api/news` | Latest normalized news |
| `GET /api/signal` | Current XAUUSD signal |

## Runtime reliability\n\nThe production dashboard is served from the Vercel project URL above. The dashboard polls the APIs every 15 seconds. The news collector uses a short in-process cache and request coalescing so `/api/news` and `/api/signal` do not independently hammer upstream RSS feeds when they refresh at the same time. This cache is intentionally small and non-authoritative; each deployment instance may have its own cache.\n\n## Engineering principles

1. Signal integrity over visual noise.
2. Server-side secrets only.
3. Deterministic behavior before model complexity.
4. Production signals should be observable and auditable.
5. No profit guarantees or fabricated performance claims.
6. Graceful degradation when a provider is unavailable.
7. Small, reviewable commits and pull requests.

## Security

Never commit API keys, provider tokens, database credentials, or deployment secrets.

Use `.env.local` for local secrets and configure production secrets through the deployment platform. See [SECURITY.md](.github/SECURITY.md).

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Disclaimer

NewsXLeak is software for market information and research. Signals are informational and are not financial advice or a guarantee of profit. Historical or simulated performance does not guarantee future results.

## License

The repository is currently maintained as a proprietary product codebase. No open-source license is granted unless a license file is added by the owner.
