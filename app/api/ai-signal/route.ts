import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';
import { buildSignal } from '@/src/signal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

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

function extractJson(text: string): AISignal | null {
  try {
    return JSON.parse(text) as AISignal;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]) as AISignal; } catch { return null; }
  }
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY is not configured' }, { status: 503 });

  try {
    const news = await collectNews();
    const deterministic = buildSignal(news);
    const context = news.slice(0, 15).map((n) => ({
      title: n.title,
      source: n.source,
      publishedAt: n.publishedAt,
      impact: n.impact,
      direction: n.direction,
      score: n.score,
      summary: n.summary,
    }));

    const prompt = `You are the macro-news reasoning engine for BATARA CAPITAL XAUUSD NEWS SIGNAL.\nAnalyze only the supplied news context and deterministic signal. Do not invent market data, prices, technical levels, or events. Treat headlines as evidence, not certainty.\n\nReturn ONLY valid JSON with this exact shape:\n{\n  "symbol":"XAUUSD",\n  "bias":"BUY|SELL|WAIT",\n  "confidence":0,\n  "macroRegime":"string",\n  "reasoning":"string",\n  "bullishFactors":["string"],\n  "bearishFactors":["string"],\n  "keyRisks":["string"],\n  "invalidation":"string",\n  "keyEvents":["string"],\n  "generatedAt":"ISO timestamp"\n}\nRules: confidence 0-100; use WAIT when evidence is mixed, stale, or insufficient; distinguish gold-positive vs gold-negative macro pressure; prioritize HIGH-impact and recent items; never claim guaranteed profit or certainty.\n\nDETERMINISTIC SIGNAL:\n${JSON.stringify(deterministic)}\n\nNEWS CONTEXT:\n${JSON.stringify(context)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: 'system', content: 'You are a disciplined financial macro-news classifier. Output strict JSON only.' },
          { role: 'user', content: prompt },
        ],
        max_output_tokens: 900,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text();
      let providerCode: string | null = null;
      let providerType: string | null = null;
      let providerMessage: string | null = null;

      try {
        const parsed = JSON.parse(detail);
        providerCode = parsed?.error?.code ?? null;
        providerType = parsed?.error?.type ?? null;
        providerMessage = parsed?.error?.message ?? null;
      } catch {
        providerMessage = detail.slice(0, 300) || null;
      }

      console.error('OpenAI error:', response.status, detail.slice(0, 500));
      return NextResponse.json(
        {
          ok: false,
          error: 'AI provider request failed',
          providerStatus: response.status,
          providerCode,
          providerType,
          providerMessage,
          model: MODEL,
          fallback: deterministic,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((x: any) => x.content || []).map((x: any) => x.text || '').join('') || '';
    const ai = extractJson(text);
    if (!ai) return NextResponse.json({ ok: false, error: 'AI returned invalid JSON', fallback: deterministic }, { status: 502 });

    const signal: AISignal = {
      ...ai,
      symbol: 'XAUUSD',
      bias: ['BUY', 'SELL', 'WAIT'].includes(ai.bias) ? ai.bias : 'WAIT',
      confidence: Math.max(0, Math.min(100, Number(ai.confidence) || 0)),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, model: MODEL, signal, fallback: deterministic });
  } catch (error) {
    console.error('AI signal error:', error);
    return NextResponse.json({ ok: false, error: 'AI signal unavailable' }, { status: 500 });
  }
}
