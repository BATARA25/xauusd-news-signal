import { NextResponse } from 'next/server';

export async function POST() {
  const workerUrl = process.env.NEWSXLEAK_PUSH_WORKER_URL || 'https://newsxleak-push-worker-production.up.railway.app';
  const secret = process.env.PUSH_TEST_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'push_test_not_configured' }, { status: 503 });

  try {
    const response = await fetch(workerUrl + '/test', {
      method: 'POST',
      headers: { 'x-newsxleak-test-secret': secret },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => ({ ok: false, error: 'invalid_worker_response' }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'push_worker_unreachable' }, { status: 502 });
  }
}
