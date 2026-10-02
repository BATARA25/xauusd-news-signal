import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpush from 'web-push';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.NEWSXLEAK_BASE_URL || 'https://newsxleak-web-production.up.railway.app';
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:newsxleak@proton.me';
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const NORMAL_POLL_MS = 10_000;
const RAPID_POLL_MS = 1_000;
const RAPID_WINDOW_MS = 10 * 60_000;

const HIGH_IMPACT_RELEASES_2026 = [
  '2026-10-02T08:30:00-04:00',
  '2026-10-14T08:30:00-04:00',
  '2026-10-15T08:30:00-04:00',
  '2026-10-28T14:00:00-04:00',
  '2026-10-29T08:30:00-04:00',
  '2026-11-06T08:30:00-05:00',
  '2026-11-10T08:30:00-05:00',
  '2026-11-13T08:30:00-05:00',
  '2026-11-17T08:30:00-05:00',
  '2026-11-25T08:30:00-05:00',
  '2026-12-04T08:30:00-05:00',
  '2026-12-09T14:00:00-05:00',
  '2026-12-10T08:30:00-05:00',
  '2026-12-15T08:30:00-05:00',
  '2026-12-16T08:30:00-05:00',
  '2026-12-23T08:30:00-05:00',
];

if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error('VAPID keys are required');
webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, value) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
async function readSubscriptions() { return readJson(DATA_FILE, []); }
async function readState() { return readJson(STATE_FILE, {}); }

async function addSubscription(subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('invalid_subscription');
  }
  const items = await readSubscriptions();
  const map = new Map(items.map((item) => [item.endpoint, item]));
  map.set(subscription.endpoint, subscription);
  await writeJson(DATA_FILE, [...map.values()]);
  return map.size;
}

function signalKey(signal) {
  return signal.bias + ':' + (signal.eventReleaseAt || signal.eventName || 'CONTEXT');
}

function rapidWindow(now = Date.now()) {
  return HIGH_IMPACT_RELEASES_2026.some((release) => {
    const delta = Math.abs(Date.parse(release) - now);
    return Number.isFinite(delta) && delta <= RAPID_WINDOW_MS;
  });
}

async function sendSignal(signal, detectedAt) {
  const items = await readSubscriptions();
  if (!items.length) return 0;

  const pushSentAt = new Date().toISOString();
  const payload = JSON.stringify({
    type: 'XAUUSD_SIGNAL',
    bias: signal.bias,
    confidence: signal.confidence,
    evidenceScore: signal.evidenceScore,
    phase: signal.phase,
    eventName: signal.eventName,
    eventReleaseAt: signal.eventReleaseAt,
    signalKey: signalKey(signal),
    detectedAt,
    pushSentAt,
    analysisLatencyMs: Number.isFinite(signal.analysisLatencyMs) ? signal.analysisLatencyMs : Math.max(0, Date.parse(signal.updatedAt) - Date.parse(detectedAt)),
    signalLatencyMs: Number.isFinite(signal.signalLatencyMs) ? signal.signalLatencyMs : Math.max(0, Date.parse(signal.updatedAt) - Date.parse(detectedAt)),
    totalServerLatencyMs: Math.max(0, Date.parse(pushSentAt) - Date.parse(detectedAt)),
    sentAt: pushSentAt
  });

  const keep = [];
  let sent = 0;
  for (const subscription of items) {
    try {
      await webpush.sendNotification(subscription, payload);
      keep.push(subscription);
      sent += 1;
    } catch (error) {
      const status = error?.statusCode;
      if (status !== 404 && status !== 410) keep.push(subscription);
      console.error('[push] send failed', status || error?.message || error);
    }
  }
  if (keep.length !== items.length) await writeJson(DATA_FILE, keep);
  return sent;
}

let state = await readState();
let lastSignalKey = state.lastSignalKey || '';
let lastPollAt = 0;
let lastError = '';
let polling = false;

async function poll() {
  if (polling) return;
  polling = true;
  const pollStartedAt = Date.now();
  lastPollAt = pollStartedAt;

  try {
    const rapid = rapidWindow(pollStartedAt);
    const suffix = rapid ? '?realtime=1' : '';
    const response = await fetch(BASE_URL + '/api/signal' + suffix, {
      cache: 'no-store',
      signal: AbortSignal.timeout(9000),
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('signal_http_' + response.status);

    const responsePayload = await response.json();
    const signal = responsePayload?.signal;
    if (!signal || (signal.bias !== 'BUY' && signal.bias !== 'SELL')) return;

    const key = signalKey(signal);
    if (key === lastSignalKey) return;

    const detectedAt = new Date(pollStartedAt).toISOString();
    lastSignalKey = key;
    state = { ...state, lastSignalKey: key, lastSignalAt: detectedAt };
    await writeJson(STATE_FILE, state);

    const sent = await sendSignal({ ...signal, updatedAt: responsePayload.analyzedAt || signal.updatedAt, analysisLatencyMs: responsePayload.analysisLatencyMs, signalLatencyMs: responsePayload.signalLatencyMs }, detectedAt);
    console.log('[signal] new', key, 'rapid', rapid, 'sent', sent);
  } catch (error) {
    lastError = error?.message || String(error);
    console.error('[worker] poll failed', lastError);
  } finally {
    polling = false;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEWSXLEAK_WEB_ORIGIN || 'https://newsxleak-web-production.up.railway.app');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      service: 'newsxleak-push-worker',
      subscribers: (await readSubscriptions()).length,
      rapidMode: rapidWindow(),
      lastPollAt: lastPollAt ? new Date(lastPollAt).toISOString() : null,
      lastSignalKey,
      lastError
    }));
    return;
  }

  if (req.method === 'GET' && req.url === '/vapid-public-key') {
    res.setHeader('Content-Type', 'text/plain');
    res.end(PUBLIC_KEY);
    return;
  }

  if (req.method === 'POST' && req.url === '/subscribe') {
    if (req.headers.origin && req.headers.origin !== (process.env.NEWSXLEAK_WEB_ORIGIN || 'https://newsxleak-web-production.up.railway.app')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' }));
      return;
    }
    try {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const count = await addSubscription(JSON.parse(raw));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, subscribers: count }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error?.message || 'subscribe_failed' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

server.listen(PORT, () => {
  console.log('[worker] listening', { baseUrl: BASE_URL, normalPollMs: NORMAL_POLL_MS, rapidPollMs: RAPID_POLL_MS });
  void poll();
});

async function scheduler() {
  await poll();
  setTimeout(scheduler, rapidWindow() ? RAPID_POLL_MS : NORMAL_POLL_MS);
}
void scheduler();
