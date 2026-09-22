// Cashfree Payment Gateway helpers (server-side only — never import from src/).
//
// Env vars (Vercel → Project → Settings → Environment Variables):
//   CASHFREE_APP_ID       App ID from the Cashfree dashboard (Developers → API keys)
//   CASHFREE_SECRET_KEY   Secret key from the same page
//   CASHFREE_ENV          "sandbox" (default) or "production"
//   CASHFREE_API_VERSION  optional, defaults to the version below
import crypto from 'node:crypto';

const API_VERSION = process.env.CASHFREE_API_VERSION || '2025-01-01';

export const cashfreeMode = () =>
  (process.env.CASHFREE_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';

const baseUrl = () =>
  cashfreeMode() === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

export const cashfreeConfigured = () =>
  Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

export async function cashfree(path, { method = 'GET', body, idempotencyKey } = {}) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': process.env.CASHFREE_APP_ID,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Cashfree ${method} ${path} failed: ${res.status} ${data?.message || text}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Webhook signature: base64( HMAC-SHA256( timestamp + rawBody, secretKey ) ).
 * Must be computed over the raw body exactly as received.
 */
export function verifyWebhookSignature(rawBody, timestamp, signature) {
  if (!rawBody || !timestamp || !signature || !process.env.CASHFREE_SECRET_KEY) return false;
  const expected = crypto
    .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
