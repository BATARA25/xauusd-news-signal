export async function GET() {
  return Response.json({
    ok: true,
    service: 'newsxleak',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
}
