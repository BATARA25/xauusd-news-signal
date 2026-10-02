import { collectNews } from '@/src/news';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = async () => {
        if (closed) return;
        try {
          const items = await collectNews();
          for (const item of items.slice(0, 10)) {
            controller.enqueue(encoder.encode('data: ' + JSON.stringify(item) + '\n\n'));
          }
        } catch {
          // Keep the SSE connection alive; the next cycle can recover.
        }
      };

      void send();
      const timer = setInterval(() => void send(), 15000);

      return () => {
        closed = true;
        clearInterval(timer);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
