import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const news = await collectNews();
    return NextResponse.json({ ok: true, news, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, news: [], error: 'collector_failed' }, { status: 502 });
  }
}
