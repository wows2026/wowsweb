import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API, useCart, formatPrice } from "@/shop";

// Teya sends the buyer back here; the backend confirms the payment with Teya before reporting "paid".
const POLL_MS = 2000;
const POLL_TRIES = 30;

export default function CheckoutReturnPage() {
  const { t, lang } = useLanguage();
  const c = t.checkout;
  const { clearCart } = useCart();
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const [result, setResult] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!ref) return;
    let tries = 0;
    let timer;
    let alive = true;
    const poll = async () => {
      try {
        const r = await axios.get(`${API}/checkout/status/${encodeURIComponent(ref)}`);
        if (!alive) return;
        setResult(r.data);
        if (r.data.status === "paid") {
          clearCart();
          try {
            sessionStorage.removeItem("wino_checkout_form");
            sessionStorage.removeItem("wino_checkout_step");
            sessionStorage.removeItem("wino_checkout_deadline");
          } catch {}
          return;
        }
        if (r.data.status !== "pending") return;
      } catch {
        if (!alive) return;
      }
      if (++tries >= POLL_TRIES) setGaveUp(true);
      else timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = result?.status;
  const failed = status === "failed" || status === "expired";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 pt-24 pb-16 text-center" data-testid="checkout-return" data-status={status || "loading"}>
      {status === "paid" ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-lg">
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-8xl">{c.paidTitle}</h1>
          {result.orderName && (
            <p className="mt-6 font-mono text-xs font-bold tracking-[0.25em]" data-testid="checkout-order-name">
              {c.order} {result.orderName}
            </p>
          )}
          <p className="mt-4 text-sm text-balance text-zinc-600">
            {c.paidText} <strong className="text-black">{result.email}</strong>.
          </p>
          <p className="mt-2 text-sm font-bold">{formatPrice({ amount: result.total, currencyCode: result.currency }, lang)}</p>
          <Link to="/collection" className="group mx-auto mt-10 flex w-fit items-center gap-3 bg-[#0D0D0D] px-8 py-4 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors hover:bg-[#FFE600] hover:text-black">
            {c.backToShop}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      ) : failed ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-lg">
          <h1 className="font-display text-4xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-6xl">
            {status === "expired" ? c.expiredTitle : c.failedTitle}
          </h1>
          <p className="mt-6 text-sm text-balance text-zinc-600">{c.failedText}</p>
          <Link to="/checkout" className="mx-auto mt-10 flex w-fit items-center gap-3 bg-[#0D0D0D] px-8 py-4 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors hover:bg-[#FFE600] hover:text-black" data-testid="checkout-try-again">
            {c.tryAgain}
          </Link>
        </motion.div>
      ) : gaveUp || !ref ? (
        <p className="max-w-md text-sm text-balance text-zinc-600">{c.pendingText}</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-zinc-500">{c.checking}</p>
        </div>
      )}
    </div>
  );
}
