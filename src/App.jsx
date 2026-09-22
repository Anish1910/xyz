import { useState, useEffect, useRef, lazy, Suspense, useTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { PhotoViewerProvider } from './components/PhotoViewer';
import ErrorBoundary from './components/ErrorBoundary';
import { clearScroll } from './lib/productCache';
import Header from './components/Header';
import Cart from './components/Cart';
import Home from './pages/Home';
import {
  RouteProgressBar,
  ShopSkeleton,
  ProductDetailSkeleton,
  AboutSkeleton,
  LearnPageSkeleton,
  ContactSkeleton,
} from './components/Skeletons';
import './App.css';

// Route-based code splitting — these pages are only loaded when navigated to
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const About = lazy(() => import('./pages/About'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Policy = lazy(() => import('./pages/Policy'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));

/**
 * DeferredRoutes — keeps the current page visible while the next route's
 * chunk loads in the background, using React 18's useTransition API.
 *
 * How it works:
 * 1. useLocation() gives us the browser's actual location (updates immediately on click).
 * 2. We feed that into startTransition → setDisplayLocation, telling React:
 *    "I'm updating the displayed route, but keep showing the old UI if the new
 *    component suspends (lazy-loading)."
 * 3. <Routes location={displayLocation}> renders the OLD route while the chunk loads.
 * 4. Once the chunk resolves, React atomically swaps to the new route — no flash.
 * 5. isPending is true during the load, driving the thin progress bar.
 *
 * The Suspense fallbacks (per-route skeletons) only show on:
 * - Direct URL navigation (no old UI to keep showing)
 * - Extremely slow connections where React gives up holding the old UI
 */
function DeferredRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isPending, startTransition] = useTransition();
  const prevPathRef = useRef('');

  // Defer route changes through startTransition so the old page stays visible
  useEffect(() => {
    startTransition(() => {
      setDisplayLocation(location);
    });
  }, [location, startTransition]);

  // Scroll handling — fires when the deferred location actually changes
  // (i.e., after the chunk loads, not on link click).
  //
  // Returning to /shop from a product is the one case where we must NOT jump to
  // the top: Shop restores the exact offset the user left from. Every other
  // arrival at /shop is a fresh visit, so we throw the saved offset away first —
  // otherwise clicking "Shop" in the nav would silently drop you mid-grid.
  useEffect(() => {
    const pathname = displayLocation.pathname;
    const isReturningFromProduct =
      pathname === '/shop' && prevPathRef.current?.startsWith('/product/');

    if (!isReturningFromProduct) {
      if (pathname === '/shop') clearScroll('/shop');
      window.scrollTo(0, 0);
    }

    prevPathRef.current = pathname;
  }, [displayLocation.pathname]);

  // Disable browser scroll restoration on initial load
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* Thin accent-colored progress bar visible during chunk loads */}
      <RouteProgressBar visible={isPending} />

      <Routes location={displayLocation}>
        {/* Home is eagerly loaded — no Suspense needed */}
        <Route path="/" element={<Home />} />

        {/* Each lazy route has its own Suspense with a layout-matching skeleton */}
        <Route path="/shop" element={
          <Suspense fallback={<ShopSkeleton />}>
            <Shop />
          </Suspense>
        } />
        {/* Slug-based product URLs. The route param is matched against slug
            OR _id, so /product/<uuid> links already in the wild keep working. */}
        <Route path="/product/:slug" element={
          <Suspense fallback={<ProductDetailSkeleton />}>
            <ProductDetail />
          </Suspense>
        } />
        <Route path="/about" element={
          <Suspense fallback={<AboutSkeleton />}>
            <About />
          </Suspense>
        } />
        <Route path="/learn" element={
          <Suspense fallback={<LearnPageSkeleton />}>
            <LearnPage />
          </Suspense>
        } />
        <Route path="/contact" element={
          <Suspense fallback={<ContactSkeleton />}>
            <Contact />
          </Suspense>
        } />

        {/* Checkout (Cashfree) and the page Cashfree sends buyers back to */}
        <Route path="/checkout" element={
          <Suspense fallback={null}>
            <Checkout />
          </Suspense>
        } />
        <Route path="/order/:orderId" element={
          <Suspense fallback={null}>
            <OrderStatus />
          </Suspense>
        } />

        {/* Refund, Terms and Privacy — required by payment gateways and the
            Consumer Protection (E-Commerce) Rules 2020 */}
        <Route path="/policies/:policy" element={
          <Suspense fallback={null}>
            <Policy />
          </Suspense>
        } />

        {/* Anything else gets a real not-found page instead of a blank body */}
        <Route path="*" element={
          <Suspense fallback={null}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </>
  );
}

function Shell() {
  const { isCartOpen, setCartOpen } = useCart();
  return (
    <div className="min-h-screen bg-neutral-white">
      <Header onCartToggle={() => setCartOpen(!isCartOpen)} />
      <Cart isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
      <DeferredRoutes />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <PhotoViewerProvider>
          <Router>
            <Shell />
          </Router>
        </PhotoViewerProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}

export default App;
