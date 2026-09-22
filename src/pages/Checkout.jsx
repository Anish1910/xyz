import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getImage } from '../lib/image';
import { productPath } from '../lib/productUrl';
import { invalidateProducts } from '../lib/productCache';
import { startCashfreeCheckout } from '../lib/cashfreeCheckout';
import { whatsappLink } from '../constants/site';
import { isOnlineCheckout, whatsappOrderLink } from '../constants/checkout';
import { INDIAN_STATES } from '../constants/indianStates';
import { BUSINESS } from '../content/policies';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

const FORM_KEY = 'checkout-details';
const EMPTY = { name: '', phone: '', email: '', address: '', pincode: '', city: '', state: '' };

const readSaved = () => {
  try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}') }; } catch { return EMPTY; }
};

// Same rules as the server, so most mistakes are caught before a round trip.
function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))) e.phone = 'Enter a 10-digit Indian mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email for your receipt.';
  if (f.address.trim().length < 8) e.address = 'Add your flat, street and area.';
  if (!/^[1-9]\d{5}$/.test(f.pincode.trim())) e.pincode = 'Enter a 6-digit pincode.';
  if (f.city.trim().length < 2) e.city = 'Enter your city.';
  if (!f.state) e.state = 'Choose your state.';
  return e;
}

function Field({ label, name, error, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-text-dark">{label}</span>
      {children}
      {error ? (
        <span id={`${name}-err`} className="mt-1 block text-xs font-medium text-red-700">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-text-light">{hint}</span>
      ) : null}
    </label>
  );
}

const inputCls = (err) =>
  `w-full rounded-minimal border bg-neutral-white px-3.5 py-3 text-base text-text-dark placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-accent-brown/30 ${
    err ? 'border-red-600' : 'border-neutral-light-beige focus:border-accent-brown'
  }`;

export default function Checkout() {
  useDocumentMeta({ title: 'Checkout', path: '/checkout', noindex: true });
  const navigate = useNavigate();
  const { cartItems, removeFromCart, getTotalPrice } = useCart();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(readSaved);
  const [errors, setErrors] = useState({});
  const [ack, setAck] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text, whatsapp? }
  const total = getTotalPrice();

  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  useEffect(() => {
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(form)); } catch { /* private mode */ }
  }, [form]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  // Online payment isn't switched on yet: this page just hands over to WhatsApp.
  if (!isOnlineCheckout && cartItems.length > 0) {
    return (
      <main className="min-h-[70vh] bg-neutral-white px-4 py-20 md:py-24">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-3 text-2xl font-extrabold uppercase tracking-wide text-text-dark md:text-3xl">
            Claim on WhatsApp
          </h1>
          <p className="mb-8 text-text-medium">
            We take orders on WhatsApp for now. Tap below and your pieces come through as a message —
            we'll confirm availability, take your address and share payment details there.
          </p>
          <ul className="mb-8 divide-y divide-neutral-light-beige rounded-lg border border-neutral-light-beige text-left text-sm">
            {cartItems.map((item) => (
              <li key={item._id} className="flex items-center gap-3 px-4 py-3">
                <img src={getImage(item.images?.[0], { width: 140, quality: 75 })} alt="" className="h-12 w-12 rounded-minimal bg-neutral-warm-beige object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate text-text-dark">{item.title?.trim()}</span>
                <b className="text-accent-brown">₹{item.price}</b>
              </li>
            ))}
            <li className="flex justify-between px-4 py-3 font-bold"><span>Total</span><span>₹{total}</span></li>
          </ul>
          <a
            href={whatsappOrderLink(cartItems, total)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full rounded-lg bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white shadow-soft hover:bg-text-dark"
          >
            Confirm on WhatsApp
          </a>
          <p className="mt-4 text-xs leading-relaxed text-text-light">
            One of one — not reserved until you confirm.{' '}
            <Link to="/policies/refund" className="underline underline-offset-2">All sales final</Link>.
          </p>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0 && !paying) {
    return (
      <main className="min-h-[70vh] bg-neutral-white px-4 py-24">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-3 text-2xl font-extrabold uppercase tracking-wide text-text-dark">Your cart is empty</h1>
          {notice && <p className="mb-4 text-sm text-red-700">{notice.text}</p>}
          <p className="mb-8 text-text-medium">Find something one of a kind first.</p>
          <Link to="/shop" className="inline-block rounded-minimal bg-accent-brown px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-accent-green">
            Go to shop
          </Link>
        </div>
      </main>
    );
  }

  const continueToPay = (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setNotice(null);
    setStep(1);
  };

  const pay = async () => {
    if (!ack || paying) return;
    setPaying(true);
    setNotice(null);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((i) => i._id),
          customer: form,
          policyAccepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && Array.isArray(data.unavailable)) {
        const gone = cartItems.filter((i) => data.unavailable.includes(i._id));
        gone.forEach((i) => removeFromCart(i._id));
        invalidateProducts();
        setNotice({
          tone: 'warn',
          text: `Sorry — ${gone.map((i) => i.title?.trim()).join(', ') || 'a piece'} just sold to someone else, so we've taken it out of your cart. Nothing was charged.`,
        });
        setPaying(false);
        return;
      }
      if (res.status === 400 && data.fields) {
        setErrors(data.fields);
        setStep(0);
        setPaying(false);
        return;
      }
      if (!res.ok || !data.paymentSessionId) {
        setNotice({ tone: 'error', text: data.error || "We couldn't start the payment. Please try again.", whatsapp: res.status === 503 });
        setPaying(false);
        return;
      }

      await startCashfreeCheckout({ paymentSessionId: data.paymentSessionId, mode: data.mode });
      // With redirectTarget "_self" the page navigates away; if we're still
      // here after a few seconds, something blocked it.
      setTimeout(() => setPaying(false), 8000);
    } catch (err) {
      console.error(err);
      setNotice({ tone: 'error', text: 'Network hiccup — please check your connection and try again.' });
      setPaying(false);
    }
  };

  const orderText = `Hi! I'd like to order:\n${cartItems.map((i) => `• ${i.title?.trim()} — ₹${i.price}`).join('\n')}\nTotal ₹${total}`;

  return (
    <main className="min-h-screen bg-neutral-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14 lg:px-8">
        <button
          type="button"
          onClick={() => (step === 1 ? setStep(0) : navigate(-1))}
          className="mb-6 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-light hover:text-text-medium"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        {/* Steps */}
        <ol className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em]" aria-label="Checkout steps">
          {['Delivery', 'Pay'].map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <span className={`flex items-center gap-2 ${i <= step ? 'text-text-dark' : 'text-text-light'}`} aria-current={i === step ? 'step' : undefined}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i < step ? 'bg-accent-green text-white' : i === step ? 'bg-text-dark text-white' : 'bg-neutral-light-beige text-text-medium'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                {label}
              </span>
              {i === 0 && <span className="h-px w-8 bg-neutral-light-beige" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="grid gap-10 md:grid-cols-[1fr_360px] lg:gap-16">
          <div>
            {notice && (
              <div
                role="alert"
                className={`mb-6 rounded-lg border p-4 text-sm ${notice.tone === 'warn' ? 'border-accent-brown/40 bg-neutral-warm-beige text-text-dark' : 'border-red-200 bg-red-50 text-red-800'}`}
              >
                {notice.text}
                {notice.whatsapp && (
                  <a href={whatsappLink(orderText)} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold underline underline-offset-2">
                    Order on WhatsApp instead
                  </a>
                )}
              </div>
            )}

            {step === 0 ? (
              <form onSubmit={continueToPay} noValidate>
                <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-wide text-text-dark md:text-3xl">Where should it go?</h1>
                <div className="grid gap-4">
                  <Field label="Full name" name="name" error={errors.name}>
                    <input name="name" autoComplete="name" value={form.name} onChange={set('name')} className={inputCls(errors.name)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-err' : undefined} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Mobile" name="phone" error={errors.phone} hint="For delivery updates on WhatsApp">
                      <input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" value={form.phone} onChange={set('phone')} className={inputCls(errors.phone)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-err' : undefined} />
                    </Field>
                    <Field label="Email" name="email" error={errors.email} hint="Your receipt goes here">
                      <input name="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputCls(errors.email)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} />
                    </Field>
                  </div>
                  <Field label="Address" name="address" error={errors.address}>
                    <textarea name="address" rows={2} autoComplete="street-address" placeholder="Flat / house no., building, street, area" value={form.address} onChange={set('address')} className={inputCls(errors.address)} aria-invalid={!!errors.address} aria-describedby={errors.address ? 'address-err' : undefined} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Pincode" name="pincode" error={errors.pincode}>
                      <input name="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={set('pincode')} className={inputCls(errors.pincode)} aria-invalid={!!errors.pincode} aria-describedby={errors.pincode ? 'pincode-err' : undefined} />
                    </Field>
                    <Field label="City" name="city" error={errors.city}>
                      <input name="city" autoComplete="address-level2" value={form.city} onChange={set('city')} className={inputCls(errors.city)} aria-invalid={!!errors.city} aria-describedby={errors.city ? 'city-err' : undefined} />
                    </Field>
                  </div>
                  <Field label="State" name="state" error={errors.state}>
                    <select name="state" autoComplete="address-level1" value={form.state} onChange={set('state')} className={inputCls(errors.state)} aria-invalid={!!errors.state} aria-describedby={errors.state ? 'state-err' : undefined}>
                      <option value="">Choose…</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <button type="submit" className="mt-8 w-full rounded-lg bg-accent-brown px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white shadow-soft transition-colors hover:bg-text-dark">
                  Continue to payment
                </button>
                <p className="mt-3 text-center text-xs text-text-light">
                  We only use these details to deliver your order. <Link to="/policies/privacy" className="underline underline-offset-2">Privacy</Link>
                </p>
              </form>
            ) : (
              <div>
                <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-wide text-text-dark md:text-3xl">Review & pay</h1>

                <div className="mb-6 rounded-lg bg-neutral-off-white p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-dark">Delivering to</span>
                    <button type="button" onClick={() => setStep(0)} className="text-xs font-semibold text-accent-brown underline underline-offset-2">Edit</button>
                  </div>
                  <p className="text-text-medium leading-relaxed">
                    {form.name} · {form.phone}<br />
                    {form.address}, {form.city}, {form.state} {form.pincode}
                  </p>
                  <p className="mt-2 text-xs text-text-light">Ships from Ahmedabad in {BUSINESS.dispatchDays} · usually arrives in {BUSINESS.deliveryDays}.</p>
                </div>

                {/* Required acknowledgement — Pay stays disabled until ticked */}
                <label className={`mb-6 flex cursor-pointer gap-3 rounded-lg border p-4 text-sm transition-colors ${ack ? 'border-accent-brown bg-neutral-warm-beige/60' : 'border-neutral-light-beige'}`}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#856E52]" />
                  <span className="text-text-medium leading-relaxed">
                    <b className="text-text-dark">I understand all sales are final.</b> No returns or exchanges for fit, size or change of mind —
                    only a full refund if a piece arrives damaged, isn't as described, or is the wrong item.{' '}
                    <Link to="/policies/refund" target="_blank" className="font-semibold text-accent-brown underline underline-offset-2">Full policy</Link>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={pay}
                  disabled={!ack || paying}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-brown px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white shadow-soft transition-colors hover:bg-text-dark disabled:cursor-not-allowed disabled:bg-neutral-light-beige disabled:text-text-light disabled:shadow-none"
                >
                  {paying ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                      Opening secure payment…
                    </>
                  ) : (
                    <>Pay ₹{total}</>
                  )}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-text-light">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  UPI, cards, netbanking & wallets · secured by Cashfree
                </p>
              </div>
            )}
          </div>

          {/* Order summary */}
          <aside className="h-fit rounded-lg border border-neutral-light-beige p-5 md:sticky md:top-24">
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-text-dark">
              Your picks · {cartItems.length}
            </h2>
            <ul className="space-y-4">
              {cartItems.map((item) => (
                <li key={item._id} className="flex gap-3">
                  <Link to={productPath(item)} className="flex-shrink-0">
                    <img src={getImage(item.images?.[0], { width: 140, quality: 75 })} alt="" className="h-16 w-16 rounded-minimal bg-neutral-warm-beige object-cover" loading="lazy" />
                  </Link>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-semibold text-text-dark">{item.title?.trim()}</p>
                    {item.tagSize && <p className="text-[10px] uppercase tracking-wide text-text-light">Tag {item.tagSize}</p>}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-bold text-accent-brown">₹{item.price}</span>
                      {step === 0 && (
                        <button type="button" onClick={() => removeFromCart(item._id)} className="text-[11px] font-medium uppercase tracking-wide text-text-light hover:text-red-700">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2 border-t border-neutral-light-beige pt-4 text-sm">
              <div className="flex justify-between text-text-medium"><span>Subtotal</span><span>₹{total}</span></div>
              <div className="flex justify-between text-text-medium"><span>Shipping</span><span className="font-semibold text-accent-green">Free</span></div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-dark">Total</span>
                <span className="text-2xl font-extrabold text-accent-brown">₹{total}</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-text-light">
              One of one — a piece is only held once you pay. If two people pay at the same moment, the second payment is refunded in full automatically.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
