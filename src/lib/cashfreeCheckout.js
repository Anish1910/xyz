// Loads Cashfree's checkout SDK on demand (only on the payment step) and
// redirects the buyer to Cashfree's hosted payment page.
const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
let loading = null;

function loadSdk() {
  if (typeof window !== 'undefined' && window.Cashfree) return Promise.resolve(window.Cashfree);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error('Cashfree SDK missing')));
    s.onerror = () => { loading = null; reject(new Error('Could not load Cashfree')); };
    document.head.appendChild(s);
  });
  return loading;
}

export async function startCashfreeCheckout({ paymentSessionId, mode }) {
  const Cashfree = await loadSdk();
  const cashfree = Cashfree({ mode: mode === 'production' ? 'production' : 'sandbox' });
  // "_self" = full-page redirect to Cashfree, then back to /order/:id.
  return cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
}
