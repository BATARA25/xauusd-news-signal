# XAUUSD News Signal AI Agent

Real-time XAUUSD macro-news dashboard. Collects relevant RSS news, filters gold relevance, scores macro impact, classifies directional bias, and streams updates through SSE.

## Stack
- Next.js + TypeScript
- RSS Parser
- Server-Sent Events (15s polling)
- Railway-ready standalone Docker build

## Endpoints
- `/` dashboard
- `/api/news` latest normalized signals
- `/api/news/stream` realtime SSE stream
- `/api/health` health check

> Current signal engine is deterministic macro classification. AI-provider integration is separated for the next production phase.
