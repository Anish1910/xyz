import './Skeletons.css';

/* ─── shared shimmer block ─── */
function Block({ className = '', style }) {
  return <div className={`skeleton-block ${className}`} style={style} />;
}

/* ─── thin loading bar shown during useTransition ─── */
export function RouteProgressBar({ visible }) {
  return (
    <div
      className={`route-progress-bar ${visible ? 'route-progress-bar--active' : ''}`}
      role="progressbar"
      aria-hidden={!visible}
    />
  );
}

/* ─────────────────────────────────────────────
   Per-route skeletons
   Each one mirrors the real page layout so
   there's zero layout shift when the chunk loads.
   ───────────────────────────────────────────── */

export function ShopSkeleton() {
  return (
    <main>
      {/* Shop header */}
      <section className="w-full px-4 sm:px-6 lg:px-8 pt-4">
        <div className="max-w-7xl mx-auto pt-12 pb-3 md:pt-16 md:pb-3">
          <Block className="skeleton-title" style={{ width: '60%', maxWidth: '500px' }} />
          <Block className="skeleton-text" style={{ width: '40%', maxWidth: '320px', marginTop: '12px' }} />
        </div>
      </section>

      {/* Filter bar */}
      <div className="mt-2 md:mt-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 flex-wrap">
            {[1,2,3].map(i => <Block key={i} className="skeleton-pill" />)}
          </div>
          <div className="flex gap-3 flex-wrap mt-4">
            {[1,2,3,4].map(i => <Block key={i} className="skeleton-pill" />)}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <Block className="skeleton-text" style={{ width: '30%', maxWidth: '260px', marginBottom: '24px' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex flex-col rounded-lg overflow-hidden">
              <Block style={{ aspectRatio: '1/1', borderRadius: '8px' }} />
              <div className="p-4 space-y-2">
                <Block className="skeleton-text-sm" style={{ width: '30%' }} />
                <Block className="skeleton-text" style={{ width: '80%' }} />
                <Block className="skeleton-text-sm" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/* Grid-only skeleton — used on /shop while products load, so the real
   header and filters stay put and only the grid area shimmers. Columns match
   ProductGrid exactly (2 / 3) so there is no shift when the data lands. */
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 md:pt-8 md:pb-24">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-4 md:gap-x-6 md:gap-y-8 lg:gap-y-10">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col rounded-minimal overflow-hidden">
            <Block style={{ aspectRatio: '1/1', borderRadius: '8px' }} />
            <div className="p-3.5 md:p-4 space-y-2">
              <Block className="skeleton-text-sm" style={{ width: '30%' }} />
              <Block className="skeleton-text" style={{ width: '80%' }} />
              <Block className="skeleton-text-sm" style={{ width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductDetailSkeleton() {
  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        {/* Back button */}
        <Block className="skeleton-text-sm" style={{ width: '60px', marginBottom: '32px' }} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {/* Image */}
          <Block style={{ aspectRatio: '4/5', borderRadius: '8px' }} />

          {/* Details */}
          <div className="flex flex-col gap-5">
            <Block className="skeleton-text-sm" style={{ width: '80px' }} />
            <Block className="skeleton-title" style={{ width: '90%' }} />
            <Block className="skeleton-title" style={{ width: '50%' }} />
            <Block className="skeleton-price" style={{ width: '120px' }} />
            <Block className="skeleton-text" style={{ width: '60%', marginTop: '8px' }} />
            <div className="space-y-2 mt-4">
              <Block className="skeleton-text" style={{ width: '100%' }} />
              <Block className="skeleton-text" style={{ width: '95%' }} />
              <Block className="skeleton-text" style={{ width: '70%' }} />
            </div>
            <Block className="skeleton-button" style={{ marginTop: '24px' }} />
            <Block className="skeleton-button-outline" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function AboutSkeleton() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
        <Block className="skeleton-title-lg" style={{ width: '70%', margin: '0 auto' }} />
        <Block className="skeleton-title-lg" style={{ width: '50%', margin: '12px auto 0' }} />
        <Block className="skeleton-text" style={{ width: '60%', margin: '24px auto 0' }} />
      </section>

      {/* Philosophy */}
      <section className="py-16 md:py-24" style={{ backgroundColor: 'rgba(249,247,244,0.5)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[1,2,3].map(i => (
              <div key={i} className="space-y-3">
                <Block className="skeleton-title" style={{ width: '80%' }} />
                <Block className="skeleton-text" style={{ width: '50%' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <Block className="skeleton-title" style={{ width: '200px' }} />
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-6 md:gap-10">
              <Block style={{ width: '60px', height: '50px', flexShrink: 0, borderRadius: '6px' }} />
              <div className="flex-grow space-y-2">
                <Block className="skeleton-text" style={{ width: '60%' }} />
                <Block className="skeleton-text" style={{ width: '90%' }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function LearnPageSkeleton() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-16 md:pb-20 text-center">
        <Block className="skeleton-title-lg" style={{ width: '55%', margin: '0 auto' }} />
        <Block className="skeleton-text" style={{ width: '40%', margin: '16px auto 0' }} />
      </section>

      {/* Filter pills */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center gap-2 md:gap-3">
          {['all','style','care','think','hacks'].map(c => (
            <Block key={c} className="skeleton-pill" />
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
              <Block style={{ height: '250px', borderRadius: '12px' }} />
              <div className="p-4 space-y-2">
                <Block className="skeleton-text" style={{ width: '70%' }} />
                <Block className="skeleton-text-sm" style={{ width: '40%' }} />
                <Block className="skeleton-text-sm" style={{ width: '90%' }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ContactSkeleton() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <Block className="skeleton-title-lg" style={{ width: '40%', margin: '0 auto' }} />
        <Block className="skeleton-text" style={{ width: '65%', margin: '24px auto 0' }} />
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24" style={{ backgroundColor: 'rgba(249,247,244,0.5)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <Block className="skeleton-title" style={{ width: '240px', marginBottom: '24px' }} />
          {[1,2,3,4].map(i => (
            <Block key={i} style={{ height: '60px', borderRadius: '8px' }} />
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="rounded-2xl p-8 md:p-12 space-y-6" style={{ backgroundColor: 'rgba(249,247,244,0.8)' }}>
          <Block className="skeleton-title" style={{ width: '50%', margin: '0 auto' }} />
          <Block className="skeleton-text" style={{ width: '65%', margin: '0 auto 24px' }} />
          {[1,2,3].map(i => (
            <div key={i} className="space-y-2">
              <Block className="skeleton-text-sm" style={{ width: '100px' }} />
              <Block style={{ height: '52px', borderRadius: '8px' }} />
            </div>
          ))}
          <div className="space-y-2">
            <Block className="skeleton-text-sm" style={{ width: '140px' }} />
            <Block style={{ height: '140px', borderRadius: '8px' }} />
          </div>
          <Block className="skeleton-button" />
        </div>
      </section>
    </main>
  );
}
