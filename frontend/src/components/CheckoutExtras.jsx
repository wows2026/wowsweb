import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { useCart, formatPrice, questDeadline, sizedImage } from "@/shop";
import { useProducts } from "@/components/FeaturedProducts";

// Counts down once per checkout: a reload continues it instead of starting over. It claims no stock hold,
// because nothing is reserved in Shopify until the payment goes through.
export function QuestTimer({ className = "" }) {
  const { t } = useLanguage();
  const c = t.checkout;
  const deadline = questDeadline();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const urgent = left <= 60;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 ${className} ${urgent ? "bg-[#0D0D0D] text-[#FFE600]" : "bg-[#FFE600] text-black"}`}
      data-testid="checkout-timer"
      role="timer"
    >
      <p className="flex items-baseline gap-3 font-mono text-xs font-bold tracking-[0.25em]">
        {left ? c.timer : c.timerOver}
        {left > 0 && <span className={`text-2xl font-extrabold tracking-normal tabular-nums ${urgent ? "animate-pulse" : ""}`}>{clock}</span>}
      </p>
      <p className="text-xs">{left ? c.timerNote : c.timerOverNote}</p>
    </div>
  );
}

function UpsellItem({ product }) {
  const { t, lang } = useLanguage();
  const { addLine, busy } = useCart();
  const variants = product.variants.filter((v) => v.available);
  const [variantId, setVariantId] = useState(variants[0]?.id);

  const add = async () => {
    try {
      // Stay in the checkout: the cart drawer would cover the form.
      await addLine(variantId, 1, { openCart: false });
      toast.success(t.cart.added);
    } catch {
      toast.error(t.cart.error);
    }
  };

  return (
    <li className="flex items-center gap-3 py-3" data-testid={`checkout-upsell-${product.handle}`}>
      <Link to={`/product/${product.handle}`} className="bg-wino-photo h-16 w-12 shrink-0">
        {product.images.main && <img src={sizedImage(product.images.main, 200)} alt={product.name} loading="lazy" className="product-photo h-full w-full object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-tight font-bold tracking-tight uppercase">{product.name}</p>
        <p className="mt-1 text-xs text-zinc-600">{formatPrice(product.price, lang)}</p>
        {variants.length > 1 && (
          <select
            aria-label={product.name}
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-1 w-full cursor-pointer border-b border-zinc-300 bg-transparent py-1 text-base outline-none sm:text-xs"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        data-testid="checkout-upsell-add"
        aria-label={`${t.checkout.upsellAdd} ${product.name}`}
        className="flex h-11 shrink-0 items-center gap-1 bg-[#0D0D0D] px-3 font-mono text-[10px] font-bold tracking-[0.15em] text-white transition-colors hover:bg-[#FFE600] hover:text-black disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        {t.checkout.upsellAdd}
      </button>
    </li>
  );
}

export function CartUpsell({ title, className = "" }) {
  const { cart } = useCart();
  const { products } = useProducts();
  const inCart = new Set((cart?.lines || []).map((l) => l.productHandle));
  const offers = (products || []).filter((p) => p.available && !inCart.has(p.handle)).slice(0, 3);
  if (!offers.length) return null;
  return (
    <section className={className} data-testid="checkout-upsell">
      <p className="mb-2 font-mono text-xs font-bold tracking-[0.25em]">{title}</p>
      <ul className="divide-y divide-zinc-200">
        {offers.map((p) => (
          <UpsellItem key={p.id} product={p} />
        ))}
      </ul>
    </section>
  );
}
