import { useCallback, useEffect, useRef, useState } from 'react';
import { getImage, getSrcSet } from '../lib/image';

const DURATION = 420; // ms
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const SWIPE_FRACTION = 0.15; // drag 15% of the width…
const FLICK_VELOCITY = 0.3; // …or flick faster than this (px/ms) to change photo

/**
 * Looping photo carousel: 1 → 2 → 3 → 4 → 1, in both directions.
 *
 * - Exactly ONE photo per swipe, however hard the swipe or trackpad fling —
 *   the strip never flies to the last photo.
 * - Follows the finger while dragging; vertical swipes are left to the page,
 *   so scrolling the shop past a card never gets hijacked.
 * - Implemented with transforms and a cloned photo at each end, so the wrap
 *   from last to first slides forward instead of rewinding.
 * - Loads lazily: only the first photo until someone interacts, then the
 *   current photo's neighbours. A blurred preview (LQIP) shows instantly.
 *
 * Controlled via `index` + `onIndexChange` (product page thumbnails), or
 * uncontrolled (shop cards). A tap (not a drag) calls `onTap(index)`; if there
 * is no onTap the click bubbles up — e.g. to the card's product link.
 */
export default function LoopCarousel({
  images = [],
  alt = '',
  index: controlledIndex,
  onIndexChange,
  onTap,
  widths,
  quality,
  sizes,
  lqips = [],
  priority = false,
  showArrows = true,
  showDots = true,
  arrowClassName = '',
  dotsClassName = 'bottom-2',
  imgClassName = 'object-cover',
}) {
  const n = images.length;
  const loop = n > 1;
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const pos = useRef(1); // position in the track, counting the leading clone
  const animating = useRef(false);
  const settleTimer = useRef(0);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(() => new Set([0]));
  const [awake, setAwake] = useState(false);

  const realIndex = (p) => (((p - 1) % n) + n) % n;

  const paint = useCallback((offsetPx = 0, animate = false) => {
    const track = trackRef.current;
    if (!track) return;
    const p = loop ? pos.current : 0;
    track.style.transition = animate ? `transform ${DURATION}ms ${EASE}` : 'none';
    track.style.transform = `translate3d(calc(${-p * 100}% + ${offsetPx}px), 0, 0)`;
  }, [loop]);

  // Jump off a clone onto the real photo it mirrors, without animation.
  const settle = useCallback(() => {
    clearTimeout(settleTimer.current);
    animating.current = false;
    if (pos.current === 0) pos.current = n;
    else if (pos.current === n + 1) pos.current = 1;
    paint(0, false);
  }, [n, paint]);

  const goTo = useCallback((p, animate = true) => {
    if (!loop) return;
    if (animating.current) settle();
    pos.current = p;
    const i = realIndex(p);
    setIndex(i);
    onIndexChange?.(i);
    if (animate) {
      animating.current = true;
      paint(0, true);
      // transitionend can be skipped (hidden tab, reduced motion) — never get stuck on a clone.
      settleTimer.current = setTimeout(settle, DURATION + 60);
    } else {
      paint(0, false);
    }
  }, [loop, paint, settle, onIndexChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = useCallback((dir) => goTo(pos.current + dir), [goTo]);

  // Initial position.
  useEffect(() => { paint(0, false); }, [paint]);
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // Controlled mode: follow the parent's index (e.g. a thumbnail click).
  useEffect(() => {
    if (controlledIndex == null || !loop) return;
    if (controlledIndex !== realIndex(pos.current)) goTo(controlledIndex + 1);
  }, [controlledIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the current photo and, once someone has shown interest, its neighbours.
  useEffect(() => {
    if (!n) return;
    setLoaded((prev) => {
      const want = awake ? [index, (index + 1) % n, (index - 1 + n) % n] : [index];
      if (want.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      want.forEach((k) => next.add(k));
      return next;
    });
  }, [index, awake, n]);

  // Trackpad / horizontal mouse wheel: one photo per gesture, no matter how
  // many wheel events the fling produces.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !loop) return undefined;
    let acc = 0;
    let locked = false;
    let quiet = 0;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical: let the page scroll
      e.preventDefault();
      setAwake(true);
      clearTimeout(quiet);
      quiet = setTimeout(() => { locked = false; acc = 0; }, 220);
      if (locked) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 30) {
        step(acc > 0 ? 1 : -1);
        locked = true;
        acc = 0;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(quiet); };
  }, [loop, step]);

  // ---- pointer drag ---------------------------------------------------------
  const onPointerDown = (e) => {
    setAwake(true);
    if (!loop || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('button')) return;
    if (animating.current) settle();
    drag.current = { x: e.clientX, y: e.clientY, axis: null, samples: [[e.timeStamp, 0]], id: e.pointerId };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x';
        viewportRef.current?.setPointerCapture?.(e.pointerId);
      } else if (Math.abs(dy) > 8) {
        drag.current = null; // a vertical scroll — not ours
        return;
      } else return;
    }
    d.dx = dx;
    d.samples.push([e.timeStamp, dx]);
    if (d.samples.length > 6) d.samples.shift();
    paint(dx, false);
  };

  const endDrag = (e, cancelled = false) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== 'x') return;
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    const width = viewportRef.current?.clientWidth || 1;
    const [t0, x0] = d.samples[0];
    const [t1, x1] = d.samples[d.samples.length - 1];
    const v = (x1 - x0) / Math.max(1, t1 - t0);
    const dx = d.dx || 0;
    if (!cancelled && (dx < -width * SWIPE_FRACTION || v < -FLICK_VELOCITY)) step(1);
    else if (!cancelled && (dx > width * SWIPE_FRACTION || v > FLICK_VELOCITY)) step(-1);
    else {
      animating.current = true;
      paint(0, true);
      settleTimer.current = setTimeout(settle, DURATION + 60);
    }
  };

  const onClickCapture = (e) => {
    if (suppressClick.current || drag.current?.axis === 'x') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onTap && !e.target.closest('button')) {
      e.preventDefault();
      onTap(index);
    }
  };

  // Clones: [last, ...images, first]
  const slides = loop
    ? [n - 1, ...images.map((_, k) => k), 0]
    : n ? [0] : [];

  const renderImg = (k, slot) => {
    const img = images[k];
    const show = loaded.has(k);
    return (
      <div
        key={slot}
        className="relative h-full w-full flex-none overflow-hidden bg-neutral-warm-beige"
        style={lqips[k] ? { backgroundImage: `url(${lqips[k]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        aria-hidden={k !== index || (loop && (slot === 0 || slot === n + 1)) ? true : undefined}
      >
        {show && img && (
          <img
            src={getImage(img, { width: widths[1] || widths[0], quality, responsive: false })}
            srcSet={getSrcSet(img, widths, quality)}
            sizes={sizes}
            alt={k === 0 ? alt : `${alt} — photo ${k + 1}`}
            loading={priority && k === 0 ? 'eager' : 'lazy'}
            fetchpriority={priority && k === 0 ? 'high' : undefined}
            decoding="async"
            draggable="false"
            className={`absolute inset-0 h-full w-full ${imgClassName} select-none opacity-0 transition-opacity duration-300`}
            ref={(el) => { if (el?.complete && el.naturalWidth) el.classList.remove('opacity-0'); }}
            onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
          />
        )}
      </div>
    );
  };

  return (
    <div
      ref={viewportRef}
      className="group/car relative h-full w-full overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setAwake(true); }}
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
      onTransitionEnd={(e) => { if (e.target === trackRef.current && e.propertyName === 'transform') settle(); }}
    >
      <div ref={trackRef} className="flex h-full w-full will-change-transform">
        {slides.map((k, slot) => renderImg(k, slot))}
      </div>

      {loop && showDots && (
        <div className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center gap-[5px] ${dotsClassName}`} aria-hidden="true">
          {images.map((_, k) => (
            <i
              key={k}
              className={`block h-[5px] rounded-full shadow-[0_0_2px_rgba(0,0,0,.35)] transition-all duration-300 ${
                k === index ? 'w-[14px] bg-white' : 'w-[5px] bg-white/55'
              }`}
            />
          ))}
        </div>
      )}

      {loop && showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAwake(true); step(-1); }}
            aria-label="Previous photo"
            className={`card-nav absolute left-1.5 top-1/2 z-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-soft hover:bg-white ${arrowClassName || 'h-[30px] w-[30px]'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAwake(true); step(1); }}
            aria-label="Next photo"
            className={`card-nav absolute right-1.5 top-1/2 z-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-soft hover:bg-white ${arrowClassName || 'h-[30px] w-[30px]'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
