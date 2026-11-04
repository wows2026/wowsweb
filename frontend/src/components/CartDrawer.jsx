import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n";
import { useCart, formatPrice } from "@/shop";

export default function CartDrawer() {
  const { t, lang } = useLanguage();
  const { cart, open, setOpen, busy, updateLine, removeLine, applyDiscount } = useCart();
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const lines = cart?.lines || [];
  const count = cart?.totalQuantity || 0;

  const submitDiscount = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const ok = await applyDiscount(code);
      if (ok) {
        toast.success(t.cart.discountApplied);
        setCode("");
      } else {
        toast.error(t.cart.discountInvalid);
      }
    } catch {
      toast.error(t.cart.error);
    }
  };

  const checkout = () => {
    setOpen(false);
    navigate("/checkout");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[95] bg-black/40"
            data-testid="cart-overlay"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-[96] flex h-full w-full max-w-md flex-col bg-[#FAF9F6]"
            data-testid="cart-drawer"
          >
            <div className="flex items-center justify-between bg-[#0D0D0D] px-5 py-4 text-[#FAF9F6]">
              <p className="font-mono text-xs font-bold tracking-[0.25em]" data-testid="cart-title">
                {t.cart.title} ({count})
              </p>
              <button
                onClick={() => setOpen(false)}
                data-testid="cart-close-button"
                className="p-1 transition-colors hover:text-[#FFE600]"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-400" data-testid="cart-empty">
                  <ShoppingBag className="h-10 w-10" strokeWidth={1.2} />
                  <p className="font-mono text-xs tracking-[0.2em]">{t.cart.empty}</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200">
                  {lines.map((l) => (
                    <li key={l.id} className="flex gap-4 py-4" data-testid={`cart-line-${l.id.split("/").pop().split("?")[0]}`}>
                      <div className="h-20 w-16 shrink-0 overflow-hidden bg-[#F4F4F0]">
                        {l.image && <img src={l.image} alt={l.productTitle} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-bold tracking-tight uppercase">{l.productTitle}</p>
                            {l.variantTitle && l.variantTitle !== "Default Title" && (
                              <p className="mt-0.5 text-xs text-zinc-500">{l.variantTitle}</p>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold whitespace-nowrap">{formatPrice(l.price, lang)}</p>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center border border-zinc-300">
                            <button
                              disabled={busy}
                              onClick={() => (l.quantity > 1 ? updateLine(l.id, l.quantity - 1) : removeLine(l.id))}
                              data-testid="cart-qty-minus"
                              className="px-2.5 py-1.5 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-8 text-center font-mono text-xs font-bold">{l.quantity}</span>
                            <button
                              disabled={busy}
                              onClick={() => updateLine(l.id, l.quantity + 1)}
                              data-testid="cart-qty-plus"
                              className="px-2.5 py-1.5 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            disabled={busy}
                            onClick={() => removeLine(l.id)}
                            data-testid="cart-line-remove"
                            className="font-mono text-[10px] tracking-[0.2em] text-zinc-400 transition-colors hover:text-black disabled:opacity-40"
                          >
                            {t.cart.remove}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <div className="border-t border-zinc-200 px-5 py-5">
                <form onSubmit={submitDiscount} className="mb-4 flex gap-2" data-testid="cart-discount-form">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t.cart.discountPlaceholder}
                    data-testid="cart-discount-input"
                    className="h-11 flex-1 border border-zinc-300 bg-transparent px-3 font-mono text-xs outline-none placeholder-zinc-400 focus:border-black"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="cart-discount-apply"
                    className="h-11 border border-black px-4 font-mono text-[10px] font-bold tracking-[0.2em] transition-colors hover:bg-black hover:text-[#FFE600] disabled:opacity-40"
                  >
                    {t.cart.apply}
                  </button>
                </form>
                {cart.discountCodes?.filter((d) => d.applicable).map((d) => (
                  <p key={d.code} className="mb-3 font-mono text-[10px] tracking-[0.15em] text-zinc-500">
                    {d.code} — {t.cart.discountApplied}
                  </p>
                ))}
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tracking-[0.2em]">{t.cart.subtotal}</span>
                  <span className="text-base font-extrabold" data-testid="cart-subtotal">
                    {formatPrice(cart.subtotal, lang)}
                  </span>
                </div>
                <p className="mb-4 text-[11px] text-zinc-500">{t.cart.shippingNote}</p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={checkout}
                  data-testid="cart-checkout-button"
                  className="flex w-full items-center justify-center gap-3 bg-[#0D0D0D] py-4 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black"
                >
                  {t.cart.checkout}
                  <Lock className="h-3.5 w-3.5" />
                </motion.button>
                <p className="mt-3 text-center font-mono text-[9px] tracking-[0.15em] text-zinc-400">{t.cart.secure}</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
