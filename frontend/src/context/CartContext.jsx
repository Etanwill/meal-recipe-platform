import React, { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (meal) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === meal.id);
      
      if (existingItem) {
        if (existingItem.quantity + 1 > meal.stock_quantity) {
          toast.error(`Only ${meal.stock_quantity} items available in stock`);
          return prevItems;
        }
        
        const updatedItems = prevItems.map(item =>
          item.id === meal.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        toast.success(`${meal.name} quantity updated in cart`);
        return updatedItems;
      } else {
        if (meal.stock_quantity < 1) {
          toast.error('Item out of stock');
          return prevItems;
        }
        
        const newItems = [...prevItems, { ...meal, quantity: 1 }];
        toast.success(`${meal.name} added to cart`);
        return newItems;
      }
    });
  };

  const removeFromCart = (mealId) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== mealId);
      const removedItem = prevItems.find(item => item.id === mealId);
      if (removedItem) {
        toast.success(`${removedItem.name} removed from cart`);
      }
      return updatedItems;
    });
  };

  const updateQuantity = (mealId, quantity) => {
    if (quantity < 1) {
      removeFromCart(mealId);
      return;
    }

    setCartItems(prevItems => {
      const meal = prevItems.find(item => item.id === mealId);
      if (meal && quantity > meal.stock_quantity) {
        toast.error(`Only ${meal.stock_quantity} items available in stock`);
        return prevItems;
      }

      return prevItems.map(item =>
        item.id === mealId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    toast.success('Cart cleared');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.final_price || item.price) * item.quantity;
    }, 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemCount,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;