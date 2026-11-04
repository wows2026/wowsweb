import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CART_KEY = "wino_cart_id";
const CURRENCY_KEY = "wino_currency";

export function formatPrice(money, lang) {
  if (!money) return "";
  const amount = Number(money.amount);
  return new Intl.NumberFormat(lang === "cz" ? "cs-CZ" : "en-GB", {
    style: "currency",
    currency: money.currencyCode,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currency, setCurrencyState] = useState(() => (localStorage.getItem(CURRENCY_KEY) === "EUR" ? "EUR" : "CZK"));

  useEffect(() => {
    const id = localStorage.getItem(CART_KEY);
    if (!id) return;
    axios
      .get(`${API}/cart`, { params: { cart_id: id } })
      .then((r) => {
        // The checkout return page may have cleared the cart while this request was in flight.
        if (localStorage.getItem(CART_KEY) !== id) return;
        if (r.data.completedAt) localStorage.removeItem(CART_KEY);
        else setCart(r.data);
      })
      .catch(() => localStorage.removeItem(CART_KEY));
  }, []);

  const save = (c) => {
    setCart(c);
    localStorage.setItem(CART_KEY, c.id);
  };

  const createCart = async (variantId, quantity) => {
    const r = await axios.post(`${API}/cart`, { variant_id: variantId, quantity, currency });
    save(r.data);
  };

  const setCurrency = async (next) => {
    if (next === currency) return;
    setCurrencyState(next);
    localStorage.setItem(CURRENCY_KEY, next);
    if (!cart) return;
    setBusy(true);
    try {
      const r = await axios.post(`${API}/cart/currency`, { cart_id: cart.id, currency: next });
      save(r.data);
    } catch (e) {
      if (e?.response?.status === 404) {
        setCart(null);
        localStorage.removeItem(CART_KEY);
      }
    } finally {
      setBusy(false);
    }
  };

  const addLine = async (variantId, quantity = 1) => {
    setBusy(true);
    try {
      if (!cart) {
        await createCart(variantId, quantity);
      } else {
        try {
          const r = await axios.post(`${API}/cart/lines`, { cart_id: cart.id, variant_id: variantId, quantity });
          save(r.data);
        } catch (e) {
          if (e?.response?.status === 404) await createCart(variantId, quantity);
          else throw e;
        }
      }
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const updateLine = async (lineId, quantity) => {
    if (!cart) return;
    setBusy(true);
    try {
      const r = await axios.patch(`${API}/cart/lines`, { cart_id: cart.id, line_id: lineId, quantity });
      save(r.data);
    } finally {
      setBusy(false);
    }
  };

  const removeLine = async (lineId) => {
    if (!cart) return;
    setBusy(true);
    try {
      const r = await axios.post(`${API}/cart/lines/remove`, { cart_id: cart.id, line_id: lineId });
      save(r.data);
    } finally {
      setBusy(false);
    }
  };

  const applyDiscount = async (code) => {
    if (!cart) return null;
    setBusy(true);
    try {
      const r = await axios.post(`${API}/cart/discount`, { cart_id: cart.id, code });
      save(r.data);
      const applied = r.data.discountCodes.find((d) => d.code.toLowerCase() === code.trim().toLowerCase());
      return applied ? applied.applicable : false;
    } finally {
      setBusy(false);
    }
  };

  // After a paid order: the Shopify cart is never "completed" by our own checkout, so forget it here.
  const clearCart = () => {
    setCart(null);
    localStorage.removeItem(CART_KEY);
  };

  return (
    <CartContext.Provider value={{ cart, open, setOpen, busy, currency, setCurrency, addLine, updateLine, removeLine, applyDiscount, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
