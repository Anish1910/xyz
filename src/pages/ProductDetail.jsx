import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { fadeInVariants } from '../constants/animations';
import { BADGE_STYLES } from '../constants/product';
import { getImage, IMAGE_WIDTHS, IMAGE_QUALITY } from '../lib/image';
import LoopCarousel from '../components/LoopCarousel';
import { client, CARD_FIELDS } from '../lib/sanity';
import { whatsappLink } from '../constants/site';
import { BUSINESS } from '../content/policies';
import { useDocumentMeta, SITE_URL } from '../hooks/useDocumentMeta';
import {
  CONDITIONS, conditionIndex, measurementRows, inches, cm,
} from '../lib/productDetails';
import { usePhotoViewer } from '../components/PhotoViewer';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import { ProductDetailSkeleton } from '../components/Skeletons';


const SectionTitle = ({ children }) => (
  <h2 className="text-xs font-semibold text-text-dark uppercase tracking-widest mb-4">{children}</h2>
);

const DetailRow = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-neutral-light-beige last:border-b-0 text-sm">
    <span className="text-text-medium">{label}</span>
    <span className="font-semibold text-text-dark text-right">{children}</span>
  </div>
);

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart, setCartOpen } = useCart();
  const openViewer = usePhotoViewer();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [unit, setUnit] = useState('in');
  const thumbsRef = useRef(null);

  const isSoldOut = product?.status === 'sold_out';
  const images = product?.images || [];
  const genderLabel = product?.gender
    ? product.gender.charAt(0).toUpperCase() + product.gender.slice(1)
    : '';

  useEffect(() => {
    let cancelled = false;
    setSelectedImageIndex(0);

    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Match on slug OR _id: new links use the readable slug, but
        // /product/<uuid> links already shared on WhatsApp must keep resolving.
        const data = await client.fetch(
          `*[_type == "product" && (slug.current == $key || _id == $key)][0]{
            ...,
            "categoryId": category._ref,
            "lqips": images[].asset->metadata.lqip,
            category->{
              name,
              slug
            },
            badges[]->{name},
            whyThisPiece
          }`,
          { key: slug }
        );
        if (!cancelled) setProduct(data || null);
      } catch (error) {
        console.error('Error fetching product:', error);
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => { cancelled = true; };
  }, [slug]);

  // Related pieces: same category first, then the newest available pieces.
  useEffect(() => {
    if (!product?._id) return undefined;
    let cancelled = false;
    client
      .fetch(
        `*[_type == "product" && _id != $id && status != "sold_out"]
          | order(category._ref == $cat desc, _createdAt desc)[0...4]{ ${CARD_FIELDS} }`,
        { id: product._id, cat: product.categoryId || '' }
      )
      .then((data) => { if (!cancelled) setRelated(data || []); })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
  }, [product?._id, product?.categoryId]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    const strip = thumbsRef.current;
    const el = strip?.children[selectedImageIndex];
    if (!strip || !el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2;
    strip.scrollTo({ left, behavior: 'smooth' });
  }, [selectedImageIndex]);

  const showImage = (idx) => {
    if (!images.length) return;
    setSelectedImageIndex((idx + images.length) % images.length);
  };

  const openFullscreen = (start = selectedImageIndex) => {
    openViewer({
      images,
      index: start,
      title: product?.title,
      price: product?.price,
      tagSize: product?.tagSize,
      soldOut: isSoldOut,
      // Close the viewer on photo 3 → the page gallery is on photo 3 too.
      onIndexChange: setSelectedImageIndex,
    });
  };

  // Hooks can't live after the early returns below, so route metadata is
  // assembled here and simply reflects whichever state we're in.
  const metaPath = product ? `/product/${product.slug?.current || product._id}` : undefined;
  const metaImage = product
    ? getImage(product.images?.[0], { width: 1200, quality: 85, responsive: false })
    : undefined;

  useDocumentMeta({
    title: product
      ? product.title?.trim()
      : loading
        ? 'Loading piece'
        : 'Piece not found',
    description: product
      ? `${product.title?.trim()} — ₹${product.price}. ${product.description?.trim() || 'One-of-a-kind pre-loved piece. Only one exists.'}`
      : undefined,
    image: metaImage || undefined,
    path: metaPath,
    // A missing product is a 404 in everything but HTTP status; keep it out of
    // the index rather than letting Google collect empty pages.
    noindex: !loading && !product,
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title?.trim(),
          description: product.description?.trim() || product.longDescription?.trim(),
          image: (product.images || [])
            .map((img) => getImage(img, { width: 1200, quality: 85, responsive: false }))
            .filter(Boolean),
          sku: product._id,
          category: product.category?.name,
          brand: { '@type': 'Brand', name: product.brand?.trim() || 'Thriftonyte' },
          ...(product.tagSize ? { size: product.tagSize } : {}),
          ...(product.fabric ? { material: product.fabric } : {}),
          offers: {
            '@type': 'Offer',
            url: `${SITE_URL}${metaPath}`,
            priceCurrency: 'INR',
            price: product.price,
            // Every piece is second-hand and there is exactly one of each.
            itemCondition: 'https://schema.org/UsedCondition',
            availability:
              product.status === 'sold_out'
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: 'Thriftonyte' },
          },
        }
      : null,
  });

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-text-dark mb-4 uppercase tracking-wide">Piece Not Found</h1>
          <p className="text-text-medium mb-6">It may have been removed, or the link is mistyped.</p>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-3 bg-accent-brown text-white font-semibold rounded-minimal hover:bg-accent-green transition-colors uppercase tracking-wide text-sm"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const inCart = isInCart(product._id);
  const rows = measurementRows(product.measurements);
  const condIdx = conditionIndex(product.condition);
  const condition = condIdx >= 0 ? CONDITIONS[condIdx] : null;
  const flaws = (product.flaws || []).filter((f) => f && f.trim());
  const details = [
    ['Brand', product.brand],
    ['Fabric', product.fabric],
    ['Era', product.era],
    ['Category', product.category?.name],
  ].filter(([, v]) => v && String(v).trim());

  const handleAddToCart = () => {
    if (isSoldOut) return;
    addToCart(product);
    setCartOpen(true);
  };

  const handleBuyNow = () => {
    if (isSoldOut) return;
    addToCart(product);
    navigate('/checkout');
  };

  const productUrl = `${SITE_URL}/product/${product.slug?.current || product._id}`;
  const whatsappHref = whatsappLink(
    `Hi! I have a question about this piece:\n\n${product.title?.trim()} - ₹${product.price}\n${productUrl}`
  );

  return (
    <main className="min-h-screen bg-neutral-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/shop')}
          className="mb-8 flex items-center gap-1.5 text-xs text-text-light hover:text-text-medium transition-colors duration-200 group"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="uppercase tracking-wider font-medium">Back</span>
        </motion.button>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          {/* Image Gallery — 4:5 portrait so hanging garments keep their hem */}
          <motion.div initial="hidden" animate="visible" variants={fadeInVariants} className="flex flex-col md:sticky md:top-24 md:self-start">
            <div
              className="relative bg-neutral-off-white rounded-lg overflow-hidden cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brown"
              style={{ aspectRatio: '4 / 5' }}
              role="group"
              tabIndex={0}
              aria-roledescription="carousel"
              aria-label={`${product.title?.trim()} photos — ${selectedImageIndex + 1} of ${images.length || 1}. Press Enter for full screen.`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullscreen(); }
                else if (e.key === 'ArrowRight') showImage(selectedImageIndex + 1);
                else if (e.key === 'ArrowLeft') showImage(selectedImageIndex - 1);
              }}
            >
              <LoopCarousel
                images={images}
                alt={product.title?.trim()}
                lqips={product.lqips || []}
                index={selectedImageIndex}
                onIndexChange={setSelectedImageIndex}
                onTap={openFullscreen}
                widths={IMAGE_WIDTHS.gallery}
                quality={IMAGE_QUALITY.gallery}
                sizes="(min-width: 1152px) 520px, (min-width: 768px) 46vw, 100vw"
                priority
                showDots={false}
                arrowClassName="h-11 w-11"
              />

              {isSoldOut && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-neutral-white/40">
                  <span className="rounded-minimal bg-text-dark/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">Sold Out</span>
                </div>
              )}

              {/* Photo count + zoom hint */}
              <span className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-neutral-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-dark shadow-soft">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M11 8v6M16.5 16.5L21 21" /></svg>
                {images.length > 1 ? `${selectedImageIndex + 1} / ${images.length}` : 'Zoom'}
              </span>
            </div>

            {/* Thumbnails — every photo at a glance */}
            {images.length > 1 && (
              <div ref={thumbsRef} className="card-track mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product photos">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={idx === selectedImageIndex}
                    aria-label={`Photo ${idx + 1}`}
                    onClick={() => showImage(idx)}
                    className={`relative flex-none w-16 md:w-[72px] overflow-hidden rounded-minimal bg-neutral-warm-beige transition-all duration-200 ${
                      idx === selectedImageIndex ? 'ring-2 ring-accent-brown ring-offset-2' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ aspectRatio: '4 / 5' }}
                  >
                    <img src={getImage(img, { width: 160, quality: IMAGE_QUALITY.thumb, responsive: false })} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Details */}
          <motion.div initial="hidden" animate="visible" variants={fadeInVariants} className="flex flex-col justify-start">
            {/* Badge & Gender */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {genderLabel && (
                <span className="text-xs text-text-light uppercase tracking-widest font-semibold">{genderLabel}</span>
              )}
              {product.badges?.map((badgeObj) => (
                <span
                  key={badgeObj.name}
                  className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${BADGE_STYLES[badgeObj.name] || 'bg-accent-brown text-white'}`}
                >
                  {badgeObj.name}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-text-dark mb-4 leading-tight tracking-wide">
              {product.title}
            </h1>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-3xl md:text-4xl font-extrabold text-accent-brown">₹{product.price}</span>
              {product.tagSize && (
                <span className="rounded-minimal border border-neutral-light-beige bg-neutral-off-white px-2 py-1 text-xs font-bold uppercase tracking-wide text-text-medium">
                  Tag {product.tagSize}
                </span>
              )}
            </div>

            {/* One scarcity line, said once */}
            {isSoldOut ? (
              <div className="mb-8 p-4 bg-neutral-off-white border border-neutral-light-beige rounded-lg">
                <p className="text-sm font-semibold text-text-dark mb-1">This piece found its new home.</p>
                <p className="text-xs text-text-light">One of a kind — once it's gone, it's gone forever.</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-accent-brown mb-8">
                Only 1 piece. Ever.
                <span className="block text-xs font-normal text-text-light mt-1">Move fast or lose this.</span>
              </p>
            )}

            {/* Measurements */}
            {rows.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <SectionTitle>Measurements · laid flat</SectionTitle>
                  <div className="-mt-4 flex rounded-full border border-neutral-light-beige p-0.5 text-[11px] font-semibold uppercase" role="group" aria-label="Units">
                    {['in', 'cm'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={unit === u}
                        onClick={() => setUnit(u)}
                        className={`rounded-full px-2.5 py-0.5 transition-colors ${unit === u ? 'bg-text-dark text-white' : 'text-text-medium'}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-off-white px-4 py-1">
                  {rows.map((r) => (
                    <DetailRow key={r.key} label={r.label}>{unit === 'in' ? inches(r.value) : cm(r.value)}</DetailRow>
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-light">
                  Measured by hand, piece by piece. Compare with something you already own — sizes vary a lot between brands and decades.
                </p>
              </section>
            )}

            {/* Condition */}
            {(condition || flaws.length > 0) && (
              <section className="mb-8">
                <SectionTitle>Condition</SectionTitle>
                {condition && (
                  <>
                    <div className="flex gap-1.5" aria-hidden="true">
                      {CONDITIONS.map((c, i) => (
                        <span key={c.value} className={`h-1.5 flex-1 rounded-full ${i <= condIdx ? 'bg-accent-brown' : 'bg-neutral-light-beige'}`} />
                      ))}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs text-text-light">
                      <span>Well-worn</span>
                      <b className="text-sm text-text-dark">{condition.label}</b>
                      <span>Near new</span>
                    </div>
                    <p className="mt-2 text-sm text-text-medium">{condition.note}</p>
                  </>
                )}
                {flaws.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-sm text-text-medium list-disc pl-5 marker:text-accent-brown">
                    {flaws.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                ) : condition ? (
                  <p className="mt-2 text-sm text-text-medium">No flaws to note.</p>
                ) : null}
              </section>
            )}

            {/* CTAs */}
            <div className="space-y-3 mb-4">
              {isSoldOut ? (
                <div className="w-full px-6 py-4 bg-neutral-light-beige text-text-light font-semibold rounded-lg flex items-center justify-center text-base cursor-not-allowed uppercase tracking-wide">
                  Sold Out
                </div>
              ) : (
                <>
                  <motion.button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full px-6 py-4 bg-accent-brown text-white font-semibold rounded-lg hover:bg-text-dark transition-colors duration-300 shadow-soft flex items-center justify-center gap-2 text-base uppercase tracking-wide"
                    whileTap={{ scale: 0.98 }}
                  >
                    Buy Now · ₹{product.price}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={inCart ? () => setCartOpen(true) : handleAddToCart}
                    className={`w-full px-6 py-3 border-2 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm uppercase tracking-wide ${
                      inCart
                        ? 'bg-accent-green border-accent-green text-white'
                        : 'border-text-dark text-text-dark hover:bg-neutral-off-white'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {inCart ? '✓ In your cart — view' : 'Add to Cart'}
                  </motion.button>
                </>
              )}
              <p className="text-xs text-text-light text-center">
                {isSoldOut ? 'Sold pieces stay up so you can see what we find.' : `Ships from Ahmedabad in ${BUSINESS.dispatchDays} · Secure payment via UPI, cards & netbanking`}
              </p>
            </div>

            {/* Returns policy — shown where the buying decision happens */}
            <div className="mb-8 flex gap-3 rounded-lg border border-neutral-light-beige bg-neutral-off-white p-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-accent-brown" aria-hidden="true">
                <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6Z" /><path d="M9 12l2 2 4-4" />
              </svg>
              <div className="text-sm">
                <p className="font-bold text-text-dark">All sales final — no returns or exchanges</p>
                <p className="mt-1 text-text-medium leading-relaxed">
                  Every piece is one of one, measured by hand and photographed flaws and all. If it arrives damaged,
                  isn't as described, or is the wrong piece, we'll make it right with a full refund.
                </p>
                <Link to="/policies/refund" className="mt-2 inline-block font-semibold text-accent-brown underline underline-offset-4 hover:text-text-dark">
                  Read the full policy
                </Link>
              </div>
            </div>

            {/* Details */}
            {details.length > 0 && (
              <section className="mb-8">
                <SectionTitle>Details</SectionTitle>
                <div className="rounded-lg bg-neutral-off-white px-4 py-1">
                  {details.map(([label, value]) => <DetailRow key={label} label={label}>{value}</DetailRow>)}
                </div>
              </section>
            )}

            {/* Description */}
            {product.longDescription && (
              <section className="mb-8">
                <SectionTitle>About this piece</SectionTitle>
                <p className="text-text-medium text-base leading-relaxed whitespace-pre-line">{product.longDescription}</p>
              </section>
            )}

            {/* Why this piece */}
            {!isSoldOut && (
              <section className="pt-8 border-t border-neutral-light-beige">
                <SectionTitle>Why This Piece</SectionTitle>
                <ul className="text-sm text-text-medium space-y-2.5">
                  {(product.whyThisPiece?.length
                    ? product.whyThisPiece
                    : [
                        '100% authentic vintage. No fakes.',
                        'Inspected & restored. Ready to wear.',
                        'One of a kind. Will never restock.',
                        'Conscious choice. Sustainable fashion.',
                      ]
                  ).map((point, idx) => <li key={idx}>{point}</li>)}
                </ul>
              </section>
            )}

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 text-sm text-text-medium hover:text-accent-brown transition-colors"
            >
              Questions about this piece? <span className="font-semibold underline underline-offset-4">Ask us on WhatsApp</span>
            </a>
          </motion.div>
        </div>

        {/* Related pieces — the product page used to be a dead end */}
        {related.length > 0 && (
          <section className="mt-16 md:mt-24">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-extrabold text-text-dark uppercase tracking-wide">
                More {product.category?.name ? product.category.name.toLowerCase() : 'pieces'}
              </h2>
              <Link to="/shop" className="text-xs font-semibold uppercase tracking-wider text-accent-brown hover:text-text-dark">
                Shop all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-4 md:gap-x-6">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
