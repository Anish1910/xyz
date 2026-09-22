import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getImage } from '../lib/image';
import './PhotoViewer.css';

/**
 * Full-screen photo viewer, opened from any product card or the product page.
 *
 *   const openViewer = usePhotoViewer();
 *   openViewer({ images, index, title, price, tagSize, soldOut, onViewPiece });
 *
 * Swipe between photos, pinch or double-tap to zoom (capped at 3×), drag to
 * pan while zoomed. Desktop: arrows, mouse wheel, keyboard (← → + − Esc).
 * The viewer loads its own larger images (1600px) lazily — only the photo on
 * screen and its neighbours — so zooming isn't a blown-up thumbnail.
 */
const ViewerContext = createContext(() => {});
export const usePhotoViewer = () => useContext(ViewerContext);

export function PhotoViewerProvider({ children }) {
  const [viewer, setViewer] = useState(null);
  const counter = useRef(0);
  const open = useCallback((opts) => {
    if (!opts?.images?.length) return;
    counter.current += 1;
    setViewer({ ...opts, key: counter.current });
  }, []);
  const close = useCallback(() => setViewer(null), []);

  return (
    <ViewerContext.Provider value={open}>
      {children}
      {viewer && createPortal(<PhotoViewer {...viewer} onClose={close} />, document.body)}
    </ViewerContext.Provider>
  );
}

const MAX_ZOOM = 3;
const DOUBLE_TAP_ZOOM = 2.2;

function PhotoViewer({ images, index = 0, title, price, tagSize, soldOut, onViewPiece, onIndexChange, onClose }) {
  const n = images.length;
  const loop = n > 1; // 1 → 2 → … → n → 1, with a cloned photo at each end
  const [i, setI] = useState(() => Math.max(0, Math.min(n - 1, index)));
  const [loaded, setLoaded] = useState(() => new Set());
  const [hint, setHint] = useState(true);

  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const closeRef = useRef(null);
  const iRef = useRef(i);
  const posRef = useRef(loop ? i + 1 : 0); // track position, counting the leading clone
  const settleTimer = useRef(0);
  const z = useRef({ s: 1, tx: 0, ty: 0, dx: 0 }).current;

  // Keep the current photo and its neighbours loaded; never unload.
  useEffect(() => {
    setLoaded((prev) => {
      const next = new Set(prev);
      [i - 1, i, i + 1].forEach((k) => k >= 0 && k < n && next.add(k));
      return next.size === prev.size ? prev : next;
    });
  }, [i, n]);

  useEffect(() => { onIndexChange?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- imperative transforms (60fps gestures shouldn't go through React) ----
  const imgAt = (k) => trackRef.current?.children[loop ? k + 1 : k]?.querySelector('img') || null;

  const applyZoom = (anim) => {
    const img = imgAt(iRef.current);
    if (!img) return;
    img.style.transition = anim ? 'transform .22s ease-out' : 'none';
    img.style.transform = `translate(${z.tx}px, ${z.ty}px) scale(${z.s})`;
    stageRef.current?.classList.toggle('pv-zoomed', z.s > 1.01);
  };

  const clampPan = () => {
    const img = imgAt(iRef.current);
    const stage = stageRef.current;
    if (!img || !stage) return;
    const mx = Math.max(0, (img.offsetWidth * z.s - stage.clientWidth) / 2);
    const my = Math.max(0, (img.offsetHeight * z.s - stage.clientHeight) / 2);
    z.tx = Math.min(mx, Math.max(-mx, z.tx));
    z.ty = Math.min(my, Math.max(-my, z.ty));
  };

  // Zoom to s1 keeping the point (px, py) — relative to stage centre — fixed.
  const zoomAt = (s1, px, py, anim) => {
    s1 = Math.min(MAX_ZOOM, Math.max(1, s1));
    const qx = (px - z.tx) / z.s;
    const qy = (py - z.ty) / z.s;
    z.s = s1; z.tx = px - s1 * qx; z.ty = py - s1 * qy;
    if (s1 <= 1.01) { z.s = 1; z.tx = 0; z.ty = 0; }
    clampPan();
    applyZoom(anim);
  };

  const setTrack = (anim) => {
    const t = trackRef.current;
    if (!t) return;
    t.style.transition = anim ? 'transform .28s ease-out' : 'none';
    t.style.transform = `translateX(calc(${-posRef.current * 100}% + ${z.dx}px))`;
  };

  // After sliding onto a clone, hop to the real photo it mirrors (no animation).
  const settle = () => {
    clearTimeout(settleTimer.current);
    if (!loop) return;
    if (posRef.current === 0) posRef.current = n;
    else if (posRef.current === n + 1) posRef.current = 1;
    else return;
    z.dx = 0;
    setTrack(false);
  };

  // One photo forwards (+1) or backwards (-1), wrapping around.
  const step = (dir) => {
    if (n < 2) return;
    settle();
    z.s = 1; z.tx = 0; z.ty = 0;
    applyZoom(false); // reset the photo we're leaving
    posRef.current += dir;
    const k = (((iRef.current + dir) % n) + n) % n;
    iRef.current = k;
    z.dx = 0;
    setTrack(true);
    setI(k);
    settleTimer.current = setTimeout(settle, 340);
  };

  // Store the latest closures so the listeners registered once below never go stale.
  const api = useRef({});
  api.current = { step, zoomAt, applyZoom, clampPan, setTrack, onClose };

  useLayoutEffect(() => { setTrack(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Page scroll lock + focus handling.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const t = setTimeout(() => setHint(false), 2400);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus({ preventScroll: true });
    };
  }, []);

  // Keyboard + resize.
  useEffect(() => {
    const onKey = (e) => {
      const a = api.current;
      if (e.key === 'Escape') a.onClose();
      else if (e.key === 'ArrowRight') a.step(1);
      else if (e.key === 'ArrowLeft') a.step(-1);
      else if (e.key === '+' || e.key === '=') a.zoomAt(z.s * 1.5, 0, 0, true);
      else if (e.key === '-') a.zoomAt(z.s / 1.5, 0, 0, true);
      else return;
      e.preventDefault();
    };
    const onResize = () => { const a = api.current; a.clampPan(); a.applyZoom(false); a.setTrack(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [z]);

  // Pointer gestures: one finger swipes (or pans when zoomed), two fingers pinch.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const ptrs = new Map();
    let g = null;
    let lastTap = 0; let lastX = 0; let lastY = 0;

    const rel = (x, y) => {
      const r = stage.getBoundingClientRect();
      return { x: x - r.left - r.width / 2, y: y - r.top - r.height / 2 };
    };

    const down = (e) => {
      if (e.target.closest('button')) return;
      stage.setPointerCapture?.(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...ptrs.values()];
      if (pts.length === 1) {
        g = { mode: 'one', x: e.clientX, y: e.clientY, tx: z.tx, ty: z.ty, t: Date.now(), moved: false };
      } else if (pts.length === 2) {
        const [a, b] = pts;
        const mid = rel((a.x + b.x) / 2, (a.y + b.y) / 2);
        g = {
          mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), s: z.s,
          qx: (mid.x - z.tx) / z.s, qy: (mid.y - z.ty) / z.s, moved: true,
        };
        z.dx = 0;
        api.current.setTrack(true);
      }
    };

    const move = (e) => {
      if (!ptrs.has(e.pointerId) || !g) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...ptrs.values()];
      const a = api.current;
      if (g.mode === 'pinch' && pts.length >= 2) {
        const [p, q] = pts;
        const mid = rel((p.x + q.x) / 2, (p.y + q.y) / 2);
        z.s = Math.min(MAX_ZOOM, Math.max(1, (g.s * Math.hypot(p.x - q.x, p.y - q.y)) / g.d));
        z.tx = mid.x - z.s * g.qx;
        z.ty = mid.y - z.s * g.qy;
        a.clampPan(); a.applyZoom(false);
        return;
      }
      if (g.mode !== 'one') return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
      if (z.s > 1.01) {
        z.tx = g.tx + dx; z.ty = g.ty + dy;
        a.clampPan(); a.applyZoom(false);
      } else {
        const atEdge = !loop;
        z.dx = atEdge ? dx * 0.3 : dx;
        a.setTrack(false);
      }
    };

    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (!g) return;
      const a = api.current;
      if (g.mode === 'pinch') {
        if (ptrs.size === 0) {
          if (z.s < 1.05) a.zoomAt(1, 0, 0, true);
          g = null;
        } else {
          const p = [...ptrs.values()][0];
          g = { mode: 'one', x: p.x, y: p.y, tx: z.tx, ty: z.ty, t: Date.now(), moved: true };
        }
        return;
      }
      if (ptrs.size) return;
      if (z.s <= 1.01) {
        const threshold = Math.min(80, stage.clientWidth * 0.18);
        if (z.dx < -threshold) a.step(1);
        else if (z.dx > threshold) a.step(-1);
        else { z.dx = 0; a.setTrack(true); }
      }
      if (!g.moved && Date.now() - g.t < 280) {
        const now = Date.now();
        if (now - lastTap < 320 && Math.hypot(e.clientX - lastX, e.clientY - lastY) < 40) {
          const p = rel(e.clientX, e.clientY);
          a.zoomAt(z.s > 1.01 ? 1 : DOUBLE_TAP_ZOOM, p.x, p.y, true);
          lastTap = 0;
        } else {
          lastTap = now; lastX = e.clientX; lastY = e.clientY;
        }
      }
      g = null;
    };

    const wheel = (e) => {
      e.preventDefault();
      const p = rel(e.clientX, e.clientY);
      api.current.zoomAt(z.s * Math.exp(-e.deltaY * 0.0022), p.x, p.y, false);
    };
    const noDbl = (e) => e.preventDefault();

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', wheel, { passive: false });
    stage.addEventListener('dblclick', noDbl);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('wheel', wheel);
      stage.removeEventListener('dblclick', noDbl);
    };
  }, [n, z, loop]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const cleanTitle = title?.trim() || 'Photo';
  const meta = [
    price != null ? `₹${price}` : null,
    soldOut ? 'Sold out' : tagSize ? `Tag ${tagSize}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label={`${cleanTitle} — photos`}>
      <div className="pv-top">
        <span className="pv-count" aria-live="polite">{i + 1} / {n}</span>
        <div className="pv-tools">
          <button type="button" className="pv-btn" aria-label="Zoom out" onClick={() => zoomAt(z.s / 1.5, 0, 0, true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M16.5 16.5L21 21" /></svg>
          </button>
          <button type="button" className="pv-btn" aria-label="Zoom in" onClick={() => zoomAt(z.s * 1.5, 0, 0, true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M11 8v6M16.5 16.5L21 21" /></svg>
          </button>
          <button type="button" ref={closeRef} className="pv-btn" aria-label="Close photo viewer" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <div className="pv-stage" ref={stageRef}>
        <div className="pv-track" ref={trackRef} onTransitionEnd={(e) => { if (e.target === trackRef.current) settle(); }}>
          {(loop ? [n - 1, ...images.map((_, k) => k), 0] : [0]).map((k, slot) => (
            <div className="pv-slide" key={slot}>
              {loaded.has(k) && (
                <img
                  src={getImage(images[k], { width: 1600, quality: 80, responsive: false })}
                  alt={`${cleanTitle} — photo ${k + 1} of ${n}`}
                  draggable="false"
                  decoding="async"
                />
              )}
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <button type="button" className="pv-arrow pv-prev" aria-label="Previous photo" onClick={() => step(-1)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" className="pv-arrow pv-next" aria-label="Next photo" onClick={() => step(1)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <div className="pv-dots" aria-hidden="true">
              {images.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}
            </div>
          </>
        )}
        <div className={`pv-hint ${hint ? 'show' : ''}`} aria-hidden="true">
          {n > 1 ? 'Swipe to browse · pinch or double-tap to zoom' : 'Pinch or double-tap to zoom'}
        </div>
      </div>

      <div className="pv-foot">
        <div className="pv-foot-text">
          <b>{cleanTitle}</b>
          {meta && <span>{meta}</span>}
        </div>
        <button
          type="button"
          className="pv-go"
          onClick={() => { onClose(); onViewPiece?.(); }}
        >
          {onViewPiece ? 'View piece' : 'Close'}
        </button>
      </div>
    </div>
  );
}
