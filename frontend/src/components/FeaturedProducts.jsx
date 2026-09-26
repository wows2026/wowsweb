import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { useCart, formatPrice, API } from "@/shop";
import MaskedTitle from "@/components/MaskedTitle";

const cardReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function FeaturedProducts() {
  const { t, lang } = useLanguage();
  const { addLine, busy } = useCart();
  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/products`)
      .then((r) => setProducts(r.data))
      .catch(() => setFailed(true));
  }, []);

  const quickAdd = async (p, variantId) => {
    const vid = variantId || (p.variants.length === 1 ? p.variants[0].id : null);
    if (!vid) {
      setPickerFor(pickerFor === p.id ? null : p.id);
      return;
    }
    try {
      await addLine(vid);
      toast.success(t.cart.added);
      setPickerFor(null);
    } catch {
      toast.error(t.cart.error);
    }
  };

  return (
    <section id="collection" data-testid="featured-products-section" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MaskedTitle
            testid="products-title"
            className="font-display text-3xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl"
          >
            {t.products.title}
          </MaskedTitle>
        </div>
        <motion.button
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          data-testid="view-all-products-button"
          onClick={() => toast(t.products.comingSoon)}
          className="group flex w-fit items-center gap-2 border-b-2 border-black pb-1 font-mono text-xs font-bold tracking-[0.2em] transition-colors hover:border-[#FFE600]"
        >
          {t.products.viewAll}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
        </motion.button>
      </div>

      {failed ? (
        <div className="border-2 border-dashed border-zinc-300 py-20 text-center" data-testid="products-error">
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-500">{t.products.loadError}</p>
        </div>
      ) : products === null ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4" data-testid="products-loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="aspect-[3/4] animate-pulse bg-zinc-100" />
              <div className="mt-3 h-3 w-2/3 animate-pulse bg-zinc-100" />
              <div className="mt-2 h-3 w-1/3 animate-pulse bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-300 py-20 text-center" data-testid="products-empty">
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-500">{t.products.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4" data-testid="products-grid">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              custom={i}
              variants={cardReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              data-testid={`product-card-${p.handle}`}
              className="group block"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[#F4F4F0]">
                {p.images.main && (
                  <img
                    src={p.images.main}
                    alt={p.name}
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${p.images.hover && p.images.hover !== p.images.main ? "group-hover:opacity-0" : ""}`}
                  />
                )}
                {p.images.hover && p.images.hover !== p.images.main && (
                  <img
                    src={p.images.hover}
                    alt={`${p.name} alternate`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-100 group-hover:opacity-100"
                  />
                )}
                {p.badge && (
                  <span className="absolute top-2.5 left-2.5 bg-[#FFE600] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-black">
                    {p.badge}
                  </span>
                )}
                {!p.available && (
                  <span className="absolute top-2.5 right-2.5 bg-black px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-white">
                    {t.cart.soldOut}
                  </span>
                )}
                {p.available && (
                  <button
                    onClick={() => quickAdd(p)}
                    disabled={busy}
                    data-testid={`product-add-${p.handle}`}
                    aria-label={`Add ${p.name} to cart`}
                    className="absolute right-2.5 bottom-2.5 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-sm transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
                {pickerFor === p.id && (
                  <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap gap-1.5 bg-white/95 p-2.5 backdrop-blur-sm" data-testid={`variant-picker-${p.handle}`}>
                    {p.variants.map((v) => (
                      <button
                        key={v.id}
                        disabled={!v.available || busy}
                        onClick={() => quickAdd(p, v.id)}
                        data-testid={`variant-option-${v.id.split("/").pop()}`}
                        className="border border-zinc-300 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] transition-colors hover:border-black hover:bg-black hover:text-[#FFE600] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {v.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-3">
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
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
