import { SITE, whatsappLink } from './site.js';

/**
 * The one switch that decides how people buy.
 *
 *   'whatsapp' — orders are agreed on WhatsApp (no online payment).
 *   'cashfree' — the built-in checkout: address → pay → confirmation.
 *
 * Flip it without touching code: set VITE_CHECKOUT_MODE=cashfree in Vercel
 * (Settings → Environment Variables) and redeploy. Leave it unset and the site
 * stays on WhatsApp, so a half-finished payment setup can never take money.
 *
 * Server code reads the same switch from CHECKOUT_MODE.
 */
const raw =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_CHECKOUT_MODE
    : typeof process !== 'undefined'
      ? process.env.CHECKOUT_MODE
      : '') || '';

export const CHECKOUT_MODE = raw.trim().toLowerCase() === 'cashfree' ? 'cashfree' : 'whatsapp';
export const isOnlineCheckout = CHECKOUT_MODE === 'cashfree';

/** WhatsApp message for a whole cart. */
export const whatsappOrderLink = (items = [], total = 0) => {
  const lines = items.map((i, n) => `${n + 1}. ${i.title?.trim()}${i.tagSize ? ` (tag ${i.tagSize})` : ''} — ₹${i.price}`);
  return whatsappLink(
    `Hi Thriftonyte! I'd like to claim ${items.length === 1 ? 'this piece' : 'these pieces'}:\n\n${lines.join('\n')}\n\nTotal: ₹${total}\n\nName:\nAddress:\nPincode:\n\nAre they still available?`,
  );
};

/** WhatsApp message for one piece, from the product page. */
export const whatsappPieceLink = (product) =>
  whatsappLink(
    `Hi Thriftonyte! I'd like to claim this piece:\n\n${product?.title?.trim()} — ₹${product?.price}${product?.tagSize ? `\nTag size: ${product.tagSize}` : ''}\n${SITE.url}/product/${product?.slug?.current || product?._id || ''}\n\nName:\nAddress:\nPincode:\n\nIs it still available?`,
  );
