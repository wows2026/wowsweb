import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { useCart, formatPrice, sizedImage } from "@/shop";

export const cardReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function ProductCard({ p, i = 0 }) {
  const { t, lang } = useLanguage();
  const { addLine, busy } = useCart();
  const [pickerOpen, setPickerOpen] = useState(false);

  const quickAdd = async (variantId) => {
    const vid = variantId || (p.variants.length === 1 ? p.variants[0].id : null);
    if (!vid) {
      setPickerOpen((v) => !v);
      return;
    }
    try {
      await addLine(vid);
      toast.success(t.cart.added);
      setPickerOpen(false);
    } catch {
      toast.error(t.cart.error);
    }
  };

  return (
    <motion.div
      custom={i}
      variants={cardReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      data-testid={`product-card-${p.handle}`}
      className="group block"
    >
      <div className="bg-wino-photo relative aspect-[3/4] overflow-hidden">
        <Link to={`/product/${p.handle}`} data-testid={`product-link-${p.handle}`} className="absolute inset-0 z-[5]" aria-label={p.name} />
        {p.images.main && (
          <img
            src={sizedImage(p.images.main, 800)}
            alt={p.name}
            loading="lazy"
            className={`product-photo absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${p.images.hover && p.images.hover !== p.images.main ? "group-hover:opacity-0" : ""}`}
          />
        )}
        {p.images.hover && p.images.hover !== p.images.main && (
          <img
            src={sizedImage(p.images.hover, 800)}
            alt={`${p.name} alternate`}
            loading="lazy"
            className="product-photo absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-100 group-hover:opacity-100"
          />
        )}
        {p.badge && (
          <span className="absolute top-2.5 left-2.5 z-10 bg-[#FFE600] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-black">
            {p.badge}
          </span>
        )}
        {!p.available && (
          <span className="absolute top-2.5 right-2.5 z-10 bg-black px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-white">
            {t.cart.soldOut}
          </span>
        )}
        {p.available && (
          <button
            onClick={(e) => {
              e.preventDefault();
              quickAdd();
            }}
            disabled={busy}
            data-testid={`product-add-${p.handle}`}
            aria-label={`Add ${p.name} to cart`}
            className="absolute right-2.5 bottom-2.5 z-10 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-[#E8E8E8] text-black opacity-0 shadow-sm transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        {pickerOpen && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap gap-1.5 bg-[#E8E8E8]/95 p-2.5 backdrop-blur-sm" data-testid={`variant-picker-${p.handle}`}>
            {p.variants.map((v) => (
              <button
                key={v.id}
                disabled={!v.available || busy}
                onClick={(e) => {
                  e.preventDefault();
                  quickAdd(v.id);
                }}
                data-testid={`variant-option-${v.id.split("/").pop()}`}
                className="border border-zinc-300 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] transition-colors hover:border-black hover:bg-black hover:text-[#FFE600] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {v.title}
              </button>
            ))}
          </div>
        )}
      </div>
      <Link to={`/product/${p.handle}`} className="block pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-bold tracking-tight uppercase">{p.name}</h3>
          <p className="text-[13px] font-semibold whitespace-nowrap">
            {p.compareAtPrice && (
              <span className="mr-1.5 font-normal text-zinc-400 line-through">{formatPrice(p.compareAtPrice, lang)}</span>
            )}
            {formatPrice(p.price, lang)}
          </p>
        </div>
        {p.colorway && p.colorway !== "Default Title" && <p className="mt-0.5 text-xs text-zinc-500">{p.colorway}</p>}
        {p.colors.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {p.colors.map((c) => (
              <span key={c} className="h-3 w-3 rounded-full border border-zinc-300" style={{ backgroundColor: c }} />
            ))}
            <span className="ml-1 text-[10px] text-zinc-400">
              {p.colors.length} {p.colors.length > 1 ? t.products.colours : t.products.colour}
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
