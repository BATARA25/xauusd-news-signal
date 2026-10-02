# NewsXLeak Architecture

## Runtime flow

```text
HTTP / SSE request
      │
      ▼
Next.js API route
      │
      ▼
News collector
      │
      ├── normalize
      ├── deduplicate
      └── classify
      │
      ▼
Signal engine
      │
      ├── 80:20 pre-news context
      └── 40:60 post-release confirmation
      │
      ▼
JSON response / SSE event
      │
      ▼
NewsXLeak UI
```

## Boundaries

**Collector** acquires and normalizes news. It does not make UI decisions.

**Classifier** handles relevance, impact and directional classification.

**Signal engine** constructs deterministic signals and should remain independently testable.

**API layer** handles HTTP concerns, serialization and runtime errors.

**UI** handles presentation, accessibility and interaction. Secrets never belong in client code.

## Real-time behavior

The application uses polling for signal refresh and Server-Sent Events for the live news stream.

The floating notification is intentionally limited to BUY and SELL. WAIT remains visible in the dashboard but does not trigger a directional alert.

## Production hardening roadmap

- Unit tests for collector and signal engine
- Schema validation for provider payloads
- Persistent signal/event IDs
- Release timestamps and latency tracking
- Historical signal evaluation
- Rate limiting
- Structured logging
- Provider health and fallback handling
