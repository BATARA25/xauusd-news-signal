import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpush from 'web-push';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.NEWSXLEAK_BASE_URL || 'https://xauusd-news-signal-4i2p.vercel.app';
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:newsxleak@proton.me';
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');
const POLL_MS = 10000;
const WEB_ORIGIN = process.env.NEWSXLEAK_WEB_ORIGIN || 'https://newsxleak-web-production.up.railway.app';
const STATE_FILE = path.join(DATA_DIR, 'state.json');

if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required');
webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

async function readSubscriptions() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch { return []; }
}
async function writeSubscriptions(items) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2));
}
async function readState() { try { return JSON.parse(await fs.readFile(STATE_FILE, 'utf8')); } catch { return {}; } }
async function writeState(state) { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2)); }
async function addSubscription(subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) throw new Error('invalid_subscription');
  const items = await readSubscriptions();
  const map = new Map(items.map((item) => [item.endpoint, item]));
  map.set(subscription.endpoint, subscription);
  await writeSubscriptions([...map.values()]);
  return map.size;
}
async function sendSignal(signal) {
  const items = await readSubscriptions();
  if (!items.length) return 0;
  const payload = JSON.stringify({
    type: 'XAUUSD_SIGNAL',
    bias: signal.bias,
    confidence: signal.confidence,
    evidenceScore: signal.evidenceScore,
    phase: signal.phase,
    eventName: signal.eventName,
    signalKey: signal.bias + ':' + (signal.eventReleaseAt || signal.eventName || '') + ':' + signal.phase,
    sentAt: new Date().toISOString()
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
  if (keep.length !== items.length) await writeSubscriptions(keep);
  return sent;
}

let lastSignalKey = '';
let lastPollAt = 0;
let lastError = '';

async function poll() {
  lastPollAt = Date.now();
  try {
    const response = await fetch(BASE_URL + '/api/signal', {
      cache: 'no-store',
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error('signal_http_' + response.status);
    const signal = (await response.json())?.signal;
    if (!signal || (signal.bias !== 'BUY' && signal.bias !== 'SELL')) return;
    const key = signal.bias + ':' + (signal.eventReleaseAt || signal.eventName || '') + ':' + signal.phase;
    if (key === lastSignalKey) return;
    lastSignalKey = key;
    console.log('[signal] new', key, 'sent', await sendSignal(signal));
  } catch (error) {
    lastError = error?.message || String(error);
    console.error('[worker] poll failed', lastError);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      service: 'newsxleak-push-worker',
      subscribers: (await readSubscriptions()).length,
      lastPollAt: lastPollAt ? new Date(lastPollAt).toISOString() : null,
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
    if (req.headers.origin && req.headers.origin !== WEB_ORIGIN) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' })); return; }
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

  if (req.method === 'POST' && req.url === '/test') {
    const sent = await sendSignal({ bias: 'BUY', confidence: 100, phase: 'TEST', eventName: 'Push channel test' });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, sent }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

server.listen(PORT, () => {
  console.log('[worker] listening on', PORT, 'polling', BASE_URL, 'every', POLL_MS, 'ms');
  void poll();
  setInterval(() => void poll(), POLL_MS);
});