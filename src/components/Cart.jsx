import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getImage } from '../lib/image';
import { productPath } from '../lib/productUrl';
import { whatsappLink } from '../constants/site';

export default function Cart({ isOpen, onClose }) {
  const { cartItems, removeFromCart, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const total = getTotalPrice();

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    onClose();
    navigate('/checkout');
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } }
  };

  const drawerVariants = {
    hidden: { x: 400 },
    visible: { x: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 cursor-pointer"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed right-0 top-0 h-full w-11/12 sm:w-96 bg-neutral-white shadow-hover z-50 flex flex-col"
        variants={drawerVariants}
        initial="hidden"
        animate={isOpen ? 'visible' : 'hidden'}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        <div className="p-6 border-b border-neutral-light-beige flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-text-dark uppercase tracking-wider">Your Picks</h2>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 text-text-medium hover:text-text-dark transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-text-medium mb-2">Nothing here yet</p>
                <p className="text-sm text-text-light">Find pieces you love</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item._id} className="flex gap-4 pb-4 border-b border-neutral-light-beige">
                  <Link to={productPath(item)} onClick={onClose} className="flex-shrink-0">
                    <img
                      src={getImage(item.images?.[0], { width: 160, quality: 80 })}
                      alt={item.title?.trim()}
                      className="h-20 w-20 rounded-minimal object-cover bg-neutral-warm-beige"
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-dark truncate">
                      <Link to={productPath(item)} onClick={onClose} className="hover:text-accent-brown transition-colors">
                        {item.title?.trim()}
                      </Link>
                    </h3>
                    {item.tagSize && (
                      <p className="text-[10px] uppercase tracking-wide text-text-light">Tag {item.tagSize}</p>
                    )}
                    <p className="text-sm text-text-medium">₹{item.price}</p>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="mt-2 text-xs text-accent-brown hover:text-red-600 transition-colors uppercase tracking-wide font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {cartItems.length > 0 && (
            <p className="text-xs text-accent-brown mt-4">
              One of one — a piece is only yours once you pay.
            </p>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-neutral-light-beige p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-text-dark uppercase tracking-wide">Total</span>
              <span className="text-2xl font-bold text-accent-brown">₹{total}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full px-4 py-3 bg-accent-brown text-white font-semibold rounded-minimal hover:bg-accent-green transition-colors duration-300 shadow-soft uppercase tracking-wide text-sm"
            >
              Checkout
            </button>

            <p className="text-xs text-text-light text-center leading-relaxed">
              <b className="text-text-medium">All sales final</b> · no returns or exchanges ·{' '}
              <Link to="/policies/refund" onClick={onClose} className="underline underline-offset-2 hover:text-accent-brown">policy</Link>
              <br />
              Questions?{' '}
              <a href={whatsappLink('Hi Thriftonyte! I have a question about my cart.')} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent-brown">
                WhatsApp us
              </a>
            </p>
            <button
              onClick={() => {
                clearCart();
                onClose();
              }}
              className="w-full px-4 py-2 text-text-medium border border-neutral-light-beige rounded-minimal hover:bg-neutral-warm-beige transition-colors text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
