// POST /api/cashfree-webhook
// Cashfree calls this after a payment, even if the buyer closed the tab before
// returning to the site — so an order is never paid-but-unrecorded.
// Set the same URL in Cashfree dashboard → Developers → Webhooks as a backup.
import { verifyWebhookSignature } from './_lib/cashfree.js';
import { finalizeOrder } from './_lib/orders.js';

// The signature is computed over the exact raw bytes, so don't let anything parse them first.
export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let raw = '';
  try { raw = await readRaw(req); } catch { raw = ''; }

  const ok = verifyWebhookSignature(raw, req.headers['x-webhook-timestamp'], req.headers['x-webhook-signature']);
  if (!ok) return res.status(401).json({ error: 'Bad signature' });

  let payload;
  try { payload = JSON.parse(raw); } catch { return res.status(400).end(); }
  const orderId = payload?.data?.order?.order_id;
  if (!orderId) return res.status(200).json({ ignored: true });

  try {
    // Don't trust the payload's status — finalizeOrder asks Cashfree itself.
    await finalizeOrder(orderId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook finalize failed:', err.message);
    return res.status(500).json({ error: 'retry' }); // Cashfree retries on non-2xx
  }
}
