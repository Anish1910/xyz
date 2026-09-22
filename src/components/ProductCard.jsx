import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { cardVariants } from '../constants/animations';
import { BADGE_STYLES } from '../constants/product';
import { productPath } from '../lib/productUrl';
import { rememberShopScroll } from '../lib/productCache';
import TiltedCard from './TiltedCard';
import LoopCarousel from './LoopCarousel';
import { IMAGE_WIDTHS, IMAGE_QUALITY } from '../lib/image';

// Single matchMedia check shared across all cards (no per-card resize listener)
const isMobileQuery = typeof window !== 'undefined'
  ? window.matchMedia('(max-width: 767px)')
  : { matches: false };

function ProductCard({ product, priority = false }) {
  const { addToCart, isInCart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const href = productPath(product);

  const [isMobile, setIsMobile] = useState(isMobileQuery.matches);
  useEffect(() => {
    const handler = (e) => setIsMobile(e.matches);
    isMobileQuery.addEventListener('change', handler);
    return () => isMobileQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!addedToCart) return undefined;
    const t = setTimeout(() => setAddedToCart(false), 1500);
    return () => clearTimeout(t);
  }, [addedToCart]);

  const isSoldOut = product.status === 'sold_out';
  const alreadyInCart = isInCart?.(product._id);
  const images = product.images?.length ? product.images : [];
  const title = product.title?.trim();
  const genderLabel = product.gender
    ? product.gender.charAt(0).toUpperCase() + product.gender.slice(1)
    : '';

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product);
    setAddedToCart(true);
  };

  const buttonLabel = addedToCart
    ? '✓ Added'
    : isSoldOut
      ? 'Sold Out'
      : alreadyInCart
        ? '✓ In your cart'
        : 'Claim This Piece';

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="flex flex-col h-full"
    >
      <div className="group relative flex h-full flex-col">
        <TiltedCard
          containerHeight="100%"
          containerWidth="100%"
          imageHeight="auto"
          imageWidth="100%"
          rotateAmplitude={8}
          scaleOnHover={1.02}
          showMobileWarning={false}
          showTooltip={false}
          displayOverlayContent={false}
          disabled={isMobile}
        >
          <div className="flex h-full flex-col rounded-minimal bg-neutral-off-white transition-all duration-300 relative overflow-hidden shadow-md md:group-hover:shadow-lg">
            {/* Badges */}
            {product.badges && product.badges.length > 0 && (
              <div className="absolute right-2 top-2 z-20 pointer-events-none flex flex-col gap-1 items-end">
                {product.badges.map(badgeObj => (
                  <span key={badgeObj.name} className={`rounded-minimal px-2 py-1 text-xs font-semibold uppercase tracking-wider ${BADGE_STYLES[badgeObj.name] || 'bg-accent-brown text-white'}`}>
                    {badgeObj.name}
                  </span>
                ))}
              </div>
            )}

            {/* Photos — 1:1 square. Swipe loops through them one at a time; a tap opens the piece. */}
            <Link
              to={href}
              onClick={rememberShopScroll}
              aria-label={title}
              draggable="false"
              className="relative block w-full overflow-hidden bg-neutral-warm-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-brown"
              style={{ aspectRatio: '1 / 1' }}
            >
              <LoopCarousel
                images={images}
                alt={title}
                lqips={[product.lqip]}
                widths={IMAGE_WIDTHS.card}
                quality={IMAGE_QUALITY.card}
                sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 50vw"
                priority={priority}
              />
              {isSoldOut && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-neutral-white/45">
                  <span className="rounded-minimal bg-text-dark/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white">
                    Sold Out
                  </span>
                </div>
              )}
            </Link>

            {/* Content */}
            <div className="flex flex-col flex-grow gap-2.5 p-3.5 md:p-4 bg-neutral-off-white relative z-10 rounded-b-minimal">
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-light">
                  {genderLabel}
                </p>

                <div className="flex items-start justify-between gap-2 md:gap-4">
                  <h3 className={`line-clamp-2 text-lg font-extrabold leading-snug md:text-xl flex-1 ${isSoldOut ? 'text-text-light' : 'text-text-dark'}`}>
                    <Link
                      to={href}
                      onClick={rememberShopScroll}
                      className="transition-colors hover:text-accent-brown focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brown"
                    >
                      {title}
                    </Link>
                  </h3>

                  {/* Tag size — the first question a thrift shopper has */}
                  {product.tagSize && (
                    <span
                      className="mt-1 flex-shrink-0 rounded-minimal border border-neutral-light-beige bg-neutral-white px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-text-medium"
                      title="Tag size"
                    >
                      {product.tagSize}
                    </span>
                  )}
                </div>
              </div>

              {/* Price — always visible (it used to hide until hover on desktop) */}
              <p className={`text-base md:text-xl font-bold ${isSoldOut ? 'text-text-light' : 'text-accent-brown'}`}>
                ₹{product.price}
              </p>

              <div className="mt-auto pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isSoldOut || alreadyInCart}
                  className={`w-full py-2.5 rounded-minimal text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    addedToCart || alreadyInCart
                      ? 'bg-accent-green text-white'
                      : isSoldOut
                        ? 'bg-neutral-light-beige text-text-light cursor-not-allowed'
                        : 'bg-accent-brown text-white hover:bg-text-dark active:scale-95'
                  }`}
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          </div>
        </TiltedCard>
      </div>
    </motion.div>
  );
}

// Memoised so adding one piece to the cart doesn't re-render (and reset the
// carousels of) every other card in the grid.
export default memo(ProductCard);
