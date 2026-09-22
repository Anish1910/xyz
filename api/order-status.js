// GET /api/order-status?order_id=TN...
// Called by the page Cashfree returns the buyer to. Confirms the payment with
// Cashfree directly (never trusts the URL), finalises the order, and returns a
// minimal, non-sensitive summary.
import { cashfreeConfigured } from './_lib/cashfree.js';
import { sanityConfigured } from './_lib/sanityServer.js';
import { finalizeOrder, publicView } from './_lib/orders.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const orderId = String(req.query?.order_id || '');
  if (!/^TN\d{6}-[A-F0-9]{8}$/.test(orderId)) return res.status(400).json({ error: 'Invalid order id' });
  if (!cashfreeConfigured() || !sanityConfigured()) return res.status(503).json({ error: 'Not configured' });

  try {
    const { order, status } = await finalizeOrder(orderId);
    if (!order) return res.status(404).json({ status: status || 'unknown' });
    return res.status(200).json(publicView(order));
  } catch (err) {
    console.error('order-status failed:', err.message);
    return res.status(502).json({ error: 'Could not confirm the payment yet.' });
  }
}
