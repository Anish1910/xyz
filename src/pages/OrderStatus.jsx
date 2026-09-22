import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { invalidateProducts } from '../lib/productCache';
import { whatsappLink } from '../constants/site';
import { BUSINESS } from '../content/policies';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

const POLL_MS = 2500;
const MAX_POLLS = 8; // ~20s — UPI confirmations can lag a few seconds

/**
 * Where Cashfree sends the buyer after paying. The URL alone proves nothing,
 * so we ask our server, which asks Cashfree, before saying "it's yours".
 */
export default function OrderStatus() {
  const { orderId } = useParams();
  useDocumentMeta({ title: 'Your order', path: `/order/${orderId}`, noindex: true });
  const { cartItems, removeFromCart } = useCart();
  const [state, setState] = useState({ phase: 'checking' });
  const polls = useRef(0);
  const cleared = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const check = async () => {
      polls.current += 1;
      try {
        const res = await fetch(`/api/order-status?order_id=${encodeURIComponent(orderId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          if (res.status >= 500 && polls.current < MAX_POLLS) { timer = setTimeout(check, POLL_MS); return; }
          setState({ phase: res.status === 404 || res.status === 400 ? 'unknown' : 'error' });
          return;
        }
        if (data.status === 'pending' && polls.current < MAX_POLLS) {
          setState({ phase: 'checking', order: data });
          timer = setTimeout(check, POLL_MS);
          return;
        }
        setState({ phase: data.status || 'unknown', order: data });
      } catch {
        if (cancelled) return;
        if (polls.current < MAX_POLLS) timer = setTimeout(check, POLL_MS);
        else setState({ phase: 'error' });
      }
    };

    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [orderId]);

  // Once paid: take those pieces out of the cart and make the shop refetch so they show as sold.
  useEffect(() => {
    if (state.phase !== 'paid' || cleared.current) return;
    cleared.current = true;
    const ids = new Set((state.order?.items || []).map((i) => i.productId));
    cartItems.filter((i) => ids.has(i._id)).forEach((i) => removeFromCart(i._id));
    invalidateProducts();
    try { sessionStorage.removeItem('checkout-details'); } catch { /* ignore */ }
  }, [state, cartItems, removeFromCart]);

  const order = state.order;
  const help = whatsappLink(`Hi! About my order ${orderId}:`);

  const Shell = ({ icon, title, children }) => (
    <main className="min-h-[75vh] bg-neutral-white px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        {icon}
        <h1 className="mb-3 mt-5 text-2xl font-extrabold uppercase tracking-wide text-text-dark md:text-3xl">{title}</h1>
        {children}
      </div>
    </main>
  );

  if (state.phase === 'checking') {
    return (
      <Shell
        icon={<span className="h-12 w-12 animate-spin rounded-full border-[3px] border-neutral-light-beige border-t-accent-brown" aria-hidden="true" />}
        title="Confirming your payment…"
      >
        <p className="text-text-medium" aria-live="polite">This takes a few seconds. Please don't close this page.</p>
      </Shell>
    );
  }

  if (state.phase === 'paid') {
    return (
      <Shell
        icon={
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-green">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </span>
        }
        title="Claimed. It's yours."
      >
        <p className="mb-6 text-text-medium">
          {order?.firstName ? `Thank you, ${order.firstName}. ` : ''}Order <b className="text-text-dark">{orderId}</b> is confirmed and a receipt is on its way to your email.
          We'll message you on WhatsApp with tracking when it ships — usually within {BUSINESS.dispatchDays}.
        </p>
        {order?.items?.length > 0 && (
          <ul className="mb-8 w-full divide-y divide-neutral-light-beige rounded-lg border border-neutral-light-beige text-left text-sm">
            {order.items.map((i) => (
              <li key={i.productId || i.title} className="flex justify-between gap-4 px-4 py-3">
                <span className="text-text-dark">{i.title}{i.tagSize ? <span className="text-text-light"> · Tag {i.tagSize}</span> : null}</span>
                <b className="text-accent-brown">₹{i.price}</b>
              </li>
            ))}
            <li className="flex justify-between px-4 py-3 font-bold"><span>Total paid</span><span>₹{order.amount}</span></li>
          </ul>
        )}
        <Link to="/shop" className="rounded-minimal bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-text-dark">
          Keep browsing
        </Link>
      </Shell>
    );
  }

  if (state.phase === 'refunded') {
    return (
      <Shell icon={<span className="text-4xl" aria-hidden="true">↺</span>} title="Someone got there first">
        <p className="mb-8 text-text-medium">
          A piece in your order was paid for a moment before you. Every piece is one of one, so we've refunded your full payment
          of ₹{order?.amount} to the original payment method — it reaches you within {BUSINESS.refundDays}.
        </p>
        <Link to="/shop" className="rounded-minimal bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-text-dark">
          See what's still available
        </Link>
      </Shell>
    );
  }

  if (state.phase === 'failed' || state.phase === 'pending') {
    const stillPending = state.phase === 'pending';
    return (
      <Shell icon={<span className="text-4xl" aria-hidden="true">{stillPending ? '…' : '✕'}</span>} title={stillPending ? 'Payment still processing' : "Payment didn't go through"}>
        <p className="mb-8 text-text-medium">
          {stillPending
            ? "Your bank hasn't confirmed yet. If money left your account, the order will confirm on its own and you'll get an email — no need to pay again."
            : 'Nothing was charged. Your pieces are still in your cart, but they are not held — someone else can still buy them.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {stillPending ? (
            <button type="button" onClick={() => window.location.reload()} className="rounded-minimal bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-text-dark">
              Check again
            </button>
          ) : (
            <Link to="/checkout" className="rounded-minimal bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-text-dark">
              Try again
            </Link>
          )}
          <a href={help} target="_blank" rel="noopener noreferrer" className="rounded-minimal border-2 border-text-dark px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-text-dark hover:bg-neutral-off-white">
            WhatsApp us
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon={<span className="text-4xl" aria-hidden="true">?</span>} title={state.phase === 'unknown' ? "We can't find that order" : "We couldn't check your order"}>
      <p className="mb-8 text-text-medium">
        If you paid and money left your account, don't worry — message us with the order ID <b className="text-text-dark">{orderId}</b> and we'll sort it out.
      </p>
      <a href={help} target="_blank" rel="noopener noreferrer" className="rounded-minimal bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-text-dark">
        WhatsApp us
      </a>
    </Shell>
  );
}
