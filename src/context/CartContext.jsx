import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  // This initializer runs inside the provider that wraps the entire app, so
  // anything that throws here white-screens every route. A truncated write, a
  // browser extension, or a future shape change is enough — hence the guards.
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      // Deduplicate by _id (older data may contain duplicates)
      const seen = new Set();
      return parsed.filter(item => {
        if (!item || typeof item !== 'object' || !item._id) return false;
        if (seen.has(item._id)) return false;
        seen.add(item._id);
        return true;
      });
    } catch (err) {
      console.warn('Discarding unreadable cart from localStorage:', err);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (err) {
      // Private mode / quota exhausted — the cart still works for this session.
      console.warn('Could not persist cart:', err);
    }
  }, [cartItems]);

  const addToCart = (product) => {
    if (cartItems.some(item => item._id === product._id)) return;
    setCartItems([...cartItems, { ...product, quantity: 1 }]);
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item._id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  // Drawer visibility lives here so any page (e.g. "Add to cart" on the product
  // page) can open it, not just the header icon.
  const [isCartOpen, setCartOpen] = useState(false);

  const isInCart = (productId) => cartItems.some(item => item._id === productId);

  const getTotalItems = () => {
    return cartItems.length;
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      getTotalPrice,
      getTotalItems,
      isInCart,
      isCartOpen,
      setCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
