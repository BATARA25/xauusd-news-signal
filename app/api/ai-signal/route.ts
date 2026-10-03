import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';
import { getMarketSnapshot } from '@/src/market';
import { buildSignal } from '@/src/signal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

type AISignal = {
  symbol: 'XAUUSD';
  bias: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  macroRegime: string;
  reasoning: string;
  bullishFactors: string[];
  bearishFactors: string[];
  keyRisks: string[];
  invalidation: string;
  keyEvents: string[];
  generatedAt: string;
};

function extractJson(value: string): AISignal | null {
  try {
    return JSON.parse(value) as AISignal;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]) as AISignal; } catch { return null; }
  }
}

function deterministicResponse(deterministic: ReturnType<typeof buildSignal>, provider: string, model?: string | null) {
  return {
    symbol: 'XAUUSD' as const,
    bias: deterministic.bias,
    confidence: deterministic.confidence,
    macroRegime: deterministic.regime,
    reasoning: 'Deterministic institutional engine is authoritative; external AI is used only as a reasoning layer.',
    bullishFactors: deterministic.bias === 'BUY' ? deterministic.drivers : [],
    bearishFactors: deterministic.bias === 'SELL' ? deterministic.drivers : [],
    keyRisks: deterministic.bias === 'WAIT' ? ['Evidence is insufficient or conflicting.'] : ['External AI validation is unavailable.'],
    invalidation: deterministic.intradaySetup.trigger,
    keyEvents: deterministic.eventName ? [deterministic.eventName] : [],
    generatedAt: new Date().toISOString(),
    provider,
    model: model ?? null,
  };
}

export async function GET() {
  try {
    const [news, market] = await Promise.all([
      collectNews({ realtime: true }),
      getMarketSnapshot().catch((error) => {
        console.error('[ai-signal] market snapshot failed', error);
        return undefined;
      }),
    ]);

    const deterministic = buildSignal(news, Date.now(), market);
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        provider: 'deterministic',
        signal: deterministicResponse(deterministic, 'deterministic'),
        fallback: deterministic,
      });
    }

    const context = news.slice(0, 15).map((n) => ({
      title: n.title,
      source: n.source,
      publishedAt: n.publishedAt,
      impact: n.impact,
      direction: n.direction,
      score: n.score,
      summary: n.summary,
    }));

    const prompt = [
      'You are the macro-news reasoning engine for BATARA CAPITAL XAUUSD NEWS SIGNAL.',
      'Analyze only the supplied news, deterministic signal and market context.',
      'Do not invent prices, levels, events or data. Treat headlines as evidence, not certainty.',
      'Return ONLY valid JSON with keys: symbol,bias,confidence,macroRegime,reasoning,bullishFactors,bearishFactors,keyRisks,invalidation,keyEvents,generatedAt.',
      'Confidence is evidence strength, not win probability.',
      'Preserve WAIT when the deterministic gate is WAIT or evidence conflicts.',
      'Never claim guaranteed profit.',
      '',
      'DETERMINISTIC SIGNAL:',
      JSON.stringify(deterministic),
      '',
      'MARKET:',
      JSON.stringify(market ?? null),
      '',
      'NEWS:',
      JSON.stringify(context),
    ].join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://xauusd-news-signal.vercel.app',
        'X-Title': 'BATARA CAPITAL XAUUSD NEWS SIGNAL',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a disciplined financial macro-news classifier. Output strict JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 900,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[ai-signal] provider failed', response.status, detail.slice(0, 500));
      return NextResponse.json({
        ok: true,
        provider: 'deterministic-fallback',
        providerStatus: response.status,
        model: MODEL,
        signal: deterministicResponse(deterministic, 'deterministic-fallback', MODEL),
        fallback: deterministic,
      });
    }

    const data = await response.json();
    const ai = extractJson(data.choices?.[0]?.message?.content || '');

    if (!ai) {
      return NextResponse.json({
        ok: true,
        provider: 'deterministic-fallback',
        model: MODEL,
        signal: deterministicResponse(deterministic, 'deterministic-fallback', MODEL),
        fallback: deterministic,
      });
    }

    return NextResponse.json({
      ok: true,
      provider: 'openrouter',
      model: MODEL,
      signal: {
        ...ai,
        symbol: 'XAUUSD',
        // LLM cannot override the deterministic hard gate.
        bias: deterministic.bias,
        confidence: Math.min(
          deterministic.confidence,
          Math.max(0, Math.min(100, Number(ai.confidence) || 0)),
        ),
        generatedAt: new Date().toISOString(),
      },
      fallback: deterministic,
    });
  } catch (error) {
    console.error('[ai-signal] failed', error);
    return NextResponse.json({ ok: false, error: 'ai_signal_unavailable' }, { status: 500 });
  }
}
