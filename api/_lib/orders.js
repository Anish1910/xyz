// Order lifecycle shared by /api/order-status (buyer returns from Cashfree)
// and /api/cashfree-webhook (Cashfree tells us server-to-server). Either can
// arrive first, or both at once, so finalizeOrder() is idempotent and uses
// Sanity revision checks so a piece can never be sold twice.
import nodemailer from 'nodemailer';
import { cashfree } from './cashfree.js';
import { sanity, orderDocId } from './sanityServer.js';
import { BUSINESS } from '../../src/content/policies.js';

const OWNER_EMAIL = process.env.ORDER_NOTIFY_EMAIL || 'support@thriftonyte.com';
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://www.thriftonyte.com';

const getOrder = (orderId) =>
  sanity().fetch(`*[_id == $id][0]`, { id: orderDocId(orderId) });

/** Minimal, non-sensitive view of an order for the confirmation page. */
export const publicView = (doc) =>
  doc
    ? {
        orderId: doc.orderId,
        status: doc.status,
        amount: doc.amount,
        firstName: (doc.customer?.name || '').trim().split(/\s+/)[0] || '',
        items: (doc.items || []).map(({ productId, title, price, tagSize }) => ({ productId, title, price, tagSize })),
      }
    : null;

export async function finalizeOrder(orderId) {
  const client = sanity();

  // 1) What does Cashfree say? (The only source of truth for "paid".)
  let cf;
  try {
    cf = await cashfree(`/orders/${encodeURIComponent(orderId)}`);
  } catch (err) {
    if (err.status === 404) return { status: 'unknown' };
    throw err;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const order = await getOrder(orderId);
    if (!order) return { status: 'unknown' };
    if (order.status === 'paid' || order.status === 'refunded') return { order };

    if (cf.order_status !== 'PAID') {
      if (['EXPIRED', 'TERMINATED'].includes(cf.order_status) && order.status !== 'failed') {
        await client.patch(order._id).set({ status: 'failed' }).commit().catch(() => {});
        return { order: { ...order, status: 'failed' } };
      }
      return { order };
    }

    // 2) Paid. Are all pieces still available?
    const ids = (order.items || []).map((i) => i.productId);
    const products = await client.fetch(
      `*[_id in $ids]{ _id, _rev, status }`,
      { ids },
    );
    const drafts = await client.fetch(`*[_id in $ids]._id`, { ids: ids.map((id) => `drafts.${id}`) });
    const soldElsewhere = products.filter((p) => p.status === 'sold_out').map((p) => p._id);

    if (soldElsewhere.length || products.length !== ids.length) {
      // Someone else paid for a piece in this order first. Refund in full,
      // exactly as the Terms promise, and don't touch the other pieces.
      try {
        await cashfree(`/orders/${encodeURIComponent(orderId)}/refunds`, {
          method: 'POST',
          idempotencyKey: `refund-${orderId}`,
          body: {
            refund_amount: Number(cf.order_amount),
            refund_id: `R-${orderId}`.slice(0, 40),
            refund_note: 'Piece already sold to another buyer',
          },
        });
      } catch (err) {
        console.error('Auto-refund failed — refund manually from the Cashfree dashboard:', err.message);
      }
      try {
        await client.patch(order._id).ifRevisionId(order._rev).set({
          status: 'refunded',
          paidAt: new Date().toISOString(),
          note: `Auto-refunded: already sold (${soldElsewhere.join(', ') || 'item missing'})`,
        }).commit();
      } catch (err) {
        if (err.statusCode === 409) continue; // raced with another finaliser — re-read
        throw err;
      }
      notify({ ...order, status: 'refunded' }).catch(() => {});
      return { order: { ...order, status: 'refunded' } };
    }

    // 3) Mark the pieces sold and the order paid in ONE transaction. Every
    //    patch is pinned to the revision we just read, so if anything changed
    //    in between (another order, a Studio edit) the whole thing fails and we
    //    go round again with fresh data.
    const tx = client.transaction();
    products.forEach((p) => tx.patch(client.patch(p._id).ifRevisionId(p._rev).set({ status: 'sold_out' })));
    // A pending Studio draft would otherwise put the piece back on sale when published.
    drafts.forEach((id) => tx.patch(client.patch(id).set({ status: 'sold_out' })));
    tx.patch(client.patch(order._id).ifRevisionId(order._rev).set({
      status: 'paid',
      paidAt: new Date().toISOString(),
      fulfilment: 'to_ship',
    }));
    try {
      await tx.commit();
    } catch (err) {
      if (err.statusCode === 409) continue;
      throw err;
    }
    const paid = { ...order, status: 'paid' };
    await notify(paid).catch((e) => console.error('Order email failed:', e.message));
    return { order: paid };
  }

  return { order: await getOrder(orderId) };
}

// ---------------------------------------------------------------------------
// Emails (best effort — an email failure never fails the order)
// ---------------------------------------------------------------------------
function transporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function notify(order) {
  const t = transporter();
  if (!t) return;
  const c = order.customer || {};
  const lines = (order.items || []).map((i) => `• ${i.title}${i.tagSize ? ` (tag ${i.tagSize})` : ''} — ₹${i.price}`).join('\n');

  if (order.status === 'refunded') {
    await t.sendMail({
      from: `"Thriftonyte Orders" <${process.env.SMTP_USER}>`,
      to: OWNER_EMAIL,
      subject: `Auto-refunded ${order.orderId} — piece already sold`,
      text: `Order ${order.orderId} was paid but a piece had already sold, so it was refunded automatically.\n\n${lines}\n\nCheck the refund in the Cashfree dashboard.`,
    });
    if (c.email) {
      await t.sendMail({
        from: `"Thriftonyte" <${process.env.SMTP_USER}>`,
        to: c.email,
        subject: `Your Thriftonyte order ${order.orderId} has been refunded`,
        text: `Hi ${c.name || ''},\n\nSomeone paid for a piece in your order a moment before you did. Every piece is one of one, so we've refunded your full payment of ₹${order.amount} to the original payment method. It reaches you within ${BUSINESS.refundDays}.\n\nSorry about that — there's plenty more at ${SITE_URL}/shop\n\nThriftonyte`,
      });
    }
    return;
  }

  await t.sendMail({
    from: `"Thriftonyte Orders" <${process.env.SMTP_USER}>`,
    to: OWNER_EMAIL,
    subject: `New order ${order.orderId} — ₹${order.amount}`,
    text: [
      `New paid order ${order.orderId} — ₹${order.amount}`,
      '',
      lines,
      '',
      'Ship to:',
      c.name, c.phone, c.email,
      c.address, `${c.city}, ${c.state} ${c.pincode}`,
      '',
      `Policy accepted: ${order.policyAck?.acceptedAt || '—'} (v${order.policyAck?.policyVersion || '—'})`,
    ].join('\n'),
  });

  if (c.email) {
    await t.sendMail({
      from: `"Thriftonyte" <${process.env.SMTP_USER}>`,
      to: c.email,
      subject: `It's yours — order ${order.orderId}`,
      html: `<p>Hi ${esc(c.name)},</p>
<p>Payment received — thank you! Here's what you claimed:</p>
<ul>${(order.items || []).map((i) => `<li>${esc(i.title)} — ₹${esc(i.price)}</li>`).join('')}</ul>
<p><b>Total: ₹${esc(order.amount)}</b></p>
<p>Shipping to:<br>${esc(c.address)}<br>${esc(c.city)}, ${esc(c.state)} ${esc(c.pincode)}</p>
<p>We'll send tracking on WhatsApp once it ships.</p>
<p style="color:#717171;font-size:13px">All sales are final. If your piece arrives damaged, isn't as described, or is the wrong item, message us within ${esc(BUSINESS.claimWindow)} of delivery — <a href="${SITE_URL}/policies/refund">refund policy</a>.</p>
<p>— Thriftonyte</p>`,
    });
  }
}
