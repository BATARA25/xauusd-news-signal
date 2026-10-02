# XAUUSD Institutional Engine V2

## Objective
Convert NewsXLeak from a headline-driven signal app into a multi-factor market-intelligence engine. The system must prefer WAIT over low-quality directional calls.

## Decision stack
1. Source validation
2. Novelty / deduplication
3. Event identification
4. Macro classification
5. Cross-asset confirmation
6. Gold market regime
7. Volatility regime
8. Evidence consensus
9. Signal gating
10. Risk-aware setup
11. Outcome logging
12. Calibration

## Required market factors
- XAUUSD/GC futures price and returns
- DXY direction
- US 2Y/10Y yield direction
- VIX / risk regime
- Gold trend: EMA20/EMA50
- Gold volatility: ATR14
- Event surprise: actual vs forecast vs previous
- News source quality and independence

## Signal model
The directional score is not a probability.

NEWS_CONTEXT = weighted directional evidence
HIGH_IMPACT_CONFIRMATION = weighted high-impact evidence
SURPRISE = normalized actual-vs-consensus surprise
REACTION = post-release market response
MARKET_REGIME = trend state of gold
MACRO_ALIGNMENT = cross-asset confirmation

CONTEXT:
  65% news context
  20% gold regime
  15% cross-asset alignment

PRE_RELEASE:
  context + high-impact confirmation
POST_RELEASE:
  surprise + observed market reaction
CONTEXT MODE:
  news context + market regime + macro alignment

## Hard gates
- Minimum 3 directional evidence items for normal BUY/SELL
- Minimum 2 independent directional sources
- Minimum 60% directional agreement
- Strong cross-asset conflict => WAIT
- Stale evidence => WAIT
- Missing price/market regime => no forced execution setup
- Structured official release may override the normal source-count gate only when actual and forecast are both available

## Confidence
Confidence is an evidence-strength metric, not a claimed win probability.
It is reduced when source quality, source diversity, agreement, recency, or market confirmation is weak.

## Execution setup
Entry, stop and targets must adapt to current volatility. ATR-based distance is preferred over fixed percentage bands.

Minimum target profile:
- TP1 >= 1.25R
- TP2 >= 2R

The system must never imply guaranteed profit.

## Validation layer
Every emitted signal should be persisted with:
- timestamp
- signal side
- confidence
- evidence score
- source count
- event
- market regime
- volatility regime
- price
- entry / SL / TP
- subsequent 1m / 5m / 15m / 30m / 60m outcome
- MFE / MAE
- invalidation reason

## Calibration
Evaluate BUY/SELL only with:
WIN / (WIN + LOSS)

WAIT is excluded from the win-rate denominator.

Track separately:
- coverage
- precision
- average R
- expectancy
- false-signal rate
- calibration error
- performance by event class
- performance by volatility regime
- performance by market session

The 80:20 and 40:60 ratios may be used as research allocation frameworks, but they are never treated as win rates.

## Institutional principle
The engine should not attempt to predict every move. Its job is to identify when independent information aligns strongly enough to justify directional attention, and to suppress calls when the evidence is contradictory.
