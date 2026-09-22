// POST /api/create-order
// Validates the cart against Sanity (prices and stock come from the server,
// never from the browser), records a pending order, and opens a Cashfree
// payment session. The browser then hands the session to Cashfree's checkout.
import crypto from 'node:crypto';
import { cashfree, cashfreeConfigured, cashfreeMode } from './_lib/cashfree.js';
import { sanity, sanityConfigured, orderDocId } from './_lib/sanityServer.js';

const POLICY_VERSION = '2026-09-22';
const SHIPPING_FEE = 0; // free shipping across India — change here if that changes
const MAX_ITEMS = 10;

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://www.thriftonyte.com';
const ALLOWED_ORIGINS = [
  'https://www.thriftonyte.com',
  'https://thriftonyte.com',
  'https://thriftonyte.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Where Cashfree should send the buyer back. Preview deployments return to
// themselves so the whole flow can be tested before going live.
function siteFor(req) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin;
  return SITE_URL;
}

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

function validate(body) {
  const errors = {};
  const c = body?.customer || {};
  const phone = String(c.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const customer = {
    name: clean(c.name, 80),
    phone,
    email: clean(c.email, 120).toLowerCase(),
    address: clean(c.address, 300),
    city: clean(c.city, 60),
    state: clean(c.state, 60),
    pincode: String(c.pincode || '').replace(/\D/g, ''),
  };
  if (customer.name.length < 2) errors.name = 'Please enter your full name.';
  if (!/^[6-9]\d{9}$/.test(customer.phone)) errors.phone = 'Enter a 10-digit Indian mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)) errors.email = 'Enter a valid email for your receipt.';
  if (customer.address.length < 8) errors.address = 'Add your flat, street and area.';
  if (customer.city.length < 2) errors.city = 'Enter your city.';
  if (customer.state.length < 2) errors.state = 'Choose your state.';
  if (!/^[1-9]\d{5}$/.test(customer.pincode)) errors.pincode = 'Enter a 6-digit pincode.';

  const ids = Array.isArray(body?.items) ? [...new Set(body.items.filter((x) => typeof x === 'string' && x.length < 100))] : [];
  if (!ids.length) errors.items = 'Your cart is empty.';
  if (ids.length > MAX_ITEMS) errors.items = `At most ${MAX_ITEMS} pieces per order.`;
  if (body?.policyAccepted !== true) errors.policy = 'Please confirm you understand all sales are final.';

  return { errors, customer, ids };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Belt and braces: even with keys present, the site's own switch has to be on.
  if (process.env.CHECKOUT_MODE?.toLowerCase() !== 'cashfree') {
    return res.status(503).json({ error: 'Online payment is not switched on. Please message us on WhatsApp to order.' });
  }

  if (!cashfreeConfigured() || !sanityConfigured()) {
    console.error('Checkout not configured: set CASHFREE_APP_ID, CASHFREE_SECRET_KEY and SANITY_WRITE_TOKEN.');
    return res.status(503).json({ error: 'Online payment is being set up. Please message us on WhatsApp to order.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const { errors, customer, ids } = validate(body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the highlighted fields.', fields: errors });

  try {
    const client = sanity();
    const products = await client.fetch(
      `*[_type == "product" && _id in $ids]{ _id, title, price, status, tagSize }`,
      { ids },
    );
    const missing = ids.filter((id) => !products.some((p) => p._id === id));
    const sold = products.filter((p) => p.status === 'sold_out').map((p) => p._id);
    if (missing.length || sold.length) {
      return res.status(409).json({
        error: 'Some pieces in your cart have just been sold.',
        unavailable: [...missing, ...sold],
      });
    }

    const items = ids.map((id) => {
      const p = products.find((x) => x._id === id);
      return { _key: id.slice(-12), productId: id, title: (p.title || '').trim(), price: Number(p.price) || 0, tagSize: p.tagSize || '' };
    });
    const amount = items.reduce((sum, i) => sum + i.price, 0) + SHIPPING_FEE;
    if (amount < 1) return res.status(400).json({ error: 'Order total is invalid.' });

    const d = new Date();
    const stamp = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    const orderId = `TN${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await client.create({
      _id: orderDocId(orderId),
      _type: 'order',
      orderId,
      status: 'pending',
      amount,
      items,
      customer,
      policyAck: { acceptedAt: new Date().toISOString(), policyVersion: POLICY_VERSION },
    });

    const site = siteFor(req);
    const cf = await cashfree('/orders', {
      method: 'POST',
      idempotencyKey: orderId,
      body: {
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: `c${customer.phone}`,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
        },
        order_meta: {
          return_url: `${site}/order/${orderId}`,
          notify_url: `${SITE_URL}/api/cashfree-webhook`,
        },
        order_note: items.map((i) => i.title).join(', ').slice(0, 200),
      },
    });

    await client.patch(orderDocId(orderId)).set({ cfOrderId: String(cf.cf_order_id || '') }).commit().catch(() => {});

    return res.status(200).json({
      orderId,
      amount,
      paymentSessionId: cf.payment_session_id,
      mode: cashfreeMode(),
    });
  } catch (err) {
    console.error('create-order failed:', err.message, err.data || '');
    return res.status(502).json({ error: "We couldn't start the payment. Please try again in a minute." });
  }
}
