import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { useCart, formatPrice, API } from "@/shop";

export default function ProductPage() {
  const { handle } = useParams();
  const { t, lang } = useLanguage();
  const { addLine, busy, currency } = useCart();
  const [product, setProduct] = useState(undefined);
  const [selected, setSelected] = useState({});
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setProduct(undefined);
    setSelected({});
    setActiveImage(0);
  }, [handle]);

  // Refetches on currency switch too, keeping the shopper's size/colour selection.
  useEffect(() => {
    let ignore = false;
    axios
      .get(`${API}/products`, { params: { currency } })
      .then((r) => {
        if (ignore) return;
        const p = r.data.find((x) => x.handle === handle) || null;
        setProduct(p);
        if (p) {
          setSelected((prev) => {
            if (Object.keys(prev).length) return prev;
            const firstAvail = p.variants.find((v) => v.available) || p.variants[0];
            const sel = {};
            (firstAvail?.options || []).forEach((o) => {
              sel[o.name] = o.value;
            });
            return sel;
          });
        }
      })
      .catch(() => {
        if (!ignore) setProduct(null);
      });
    return () => {
      ignore = true;
    };
  }, [handle, currency]);

  const optionGroups = useMemo(() => {
    if (!product) return [];
    const groups = {};
    product.variants.forEach((v) =>
      v.options.forEach((o) => {
        if (o.name === "Title" && o.value === "Default Title") return;
        if (!groups[o.name]) groups[o.name] = [];
        if (!groups[o.name].includes(o.value)) groups[o.name].push(o.value);
      })
    );
    return Object.entries(groups);
  }, [product]);

  const variant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => v.options.every((o) => selected[o.name] === o.value)) || null;
  }, [product, selected]);

  const images = useMemo(() => {
    if (!product) return [];
    const all = product.allImages && product.allImages.length ? product.allImages : [product.images.main, product.images.hover];
    return all.filter((v, i, a) => v && a.indexOf(v) === i);
  }, [product]);

  // Picking a variant jumps to its photo; after that the thumbnails choose freely.
  const variantImage = variant?.image;
  useEffect(() => {
    const i = variantImage ? images.indexOf(variantImage) : -1;
    if (i >= 0) setActiveImage(i);
  }, [variantImage, images]);

  if (product === undefined) {
    return (
      <div className="grid min-h-screen pt-16 lg:grid-cols-[1fr_1.4fr_1fr]" data-testid="product-loading">
        <div className="px-5 py-12 sm:px-8">
          <div className="h-4 w-16 animate-pulse bg-zinc-100" />
          <div className="mt-8 h-10 w-3/4 animate-pulse bg-zinc-100" />
          <div className="mt-6 h-40 w-full animate-pulse bg-zinc-100" />
        </div>
        <div className="animate-pulse bg-[#F4F4F0]" />
        <div className="px-5 py-12 sm:px-8">
          <div className="h-6 w-24 animate-pulse bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16" data-testid="product-not-found">
        <p className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-5xl">{t.product.notFound}</p>
        <p className="text-sm text-zinc-500">{t.product.notFoundSub}</p>
        <Link to="/collection" className="mt-4 border-b-2 border-black pb-1 font-mono text-xs font-bold tracking-[0.2em] hover:border-[#FFE600]">
          {t.product.back}
        </Link>
      </div>
    );
  }

  const price = variant?.price || product.price;
  const compareAt = variant?.compareAtPrice || product.compareAtPrice;
  const mainImage = images[activeImage] || variant?.image || images[0];

  const optionAvailable = (name, value) =>
    product.variants.some(
      (v) =>
        v.available &&
        v.options.every((o) => (o.name === name ? o.value === value : selected[o.name] ? selected[o.name] === o.value : true))
    );

  const handleAdd = async () => {
    if (!variant || !variant.available) {
      toast.error(t.cart.unavailable);
      return;
    }
    try {
      await addLine(variant.id);
      toast.success(t.cart.added);
    } catch {
      toast.error(t.cart.error);
    }
  };

  return (
    <div className="min-h-screen pt-16" data-testid="product-page">
      <div className="grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1fr_1.4fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="order-2 flex flex-col px-5 py-10 sm:px-8 lg:order-1 lg:py-14"
        >
          <Link
            to="/collection"
            data-testid="product-back-link"
            className="inline-flex w-fit items-center gap-2 font-mono text-[11px] font-bold tracking-[0.2em] text-zinc-500 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.product.back}
          </Link>
          <div className="flex flex-1 flex-col justify-center py-8">
            <h1
              data-testid="product-title"
              className="font-display text-3xl leading-[1.02] font-extrabold tracking-tight uppercase sm:text-4xl"
            >
              {product.name}
            </h1>
            {product.badge && (
              <span className="mt-4 inline-block w-fit bg-[#FFE600] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.15em]">
                {product.badge}
              </span>
            )}
            {product.description && (
              <p data-testid="product-description" className="mt-8 text-sm leading-relaxed whitespace-pre-line text-zinc-600">
                {product.description}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 flex flex-col bg-[#F4F4F0] lg:order-2"
        >
          <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
            {mainImage ? (
              <motion.img
                key={mainImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                src={mainImage}
                alt={product.name}
                data-testid="product-image"
                className="max-h-[55vh] w-auto object-contain lg:max-h-[72vh]"
              />
            ) : (
              <div className="aspect-[3/4] w-full max-w-md" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2 pb-6" data-testid="product-thumbnails">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  data-testid={`product-thumb-${i}`}
                  className={`h-16 w-12 overflow-hidden border-2 transition-colors ${i === activeImage ? "border-black" : "border-transparent"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="order-3 flex flex-col justify-center px-5 py-10 sm:px-8 lg:py-14"
        >
          <p className="text-2xl font-extrabold tracking-tight" data-testid="product-price">
            {compareAt && <span className="mr-2 text-lg font-normal text-zinc-400 line-through">{formatPrice(compareAt, lang)}</span>}
            {formatPrice(price, lang)}
          </p>

          {optionGroups.map(([name, values]) => (
            <div key={name} className="mt-8">
              <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">{name}</p>
              <div className="flex flex-wrap gap-2" data-testid={`option-group-${name.toLowerCase()}`}>
                {values.map((value) => {
                  const active = selected[name] === value;
                  const avail = optionAvailable(name, value);
                  return (
                    <button
                      key={value}
                      onClick={() => setSelected((s) => ({ ...s, [name]: value }))}
                      disabled={!avail}
                      data-testid={`option-${name.toLowerCase()}-${value.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`min-w-11 border px-3.5 py-2.5 font-mono text-xs font-bold tracking-[0.1em] transition-colors ${
                        active
                          ? "border-black bg-black text-[#FFE600]"
                          : "border-zinc-300 hover:border-black"
                      } disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAdd}
            disabled={busy || !product.available}
            data-testid="add-to-cart-button"
            className="mt-10 flex w-full items-center justify-center gap-3 bg-[#0D0D0D] py-4 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {product.available ? t.product.addToCart : t.cart.soldOut}
            <Lock className="h-3.5 w-3.5" />
          </motion.button>
          {variant && !variant.available && product.available && (
            <p className="mt-3 font-mono text-[10px] tracking-[0.15em] text-zinc-500" data-testid="variant-unavailable">
              {t.cart.unavailable}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
