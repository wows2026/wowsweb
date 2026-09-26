import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API } from "@/shop";
import MaskedTitle from "@/components/MaskedTitle";
import ProductCard from "@/components/ProductCard";

export function ProductsGrid({ products, failed }) {
  const { t } = useLanguage();
  if (failed) {
    return (
      <div className="border-2 border-dashed border-zinc-300 py-20 text-center" data-testid="products-error">
        <p className="font-mono text-xs tracking-[0.2em] text-zinc-500">{t.products.loadError}</p>
      </div>
    );
  }
  if (products === null) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4" data-testid="products-loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="aspect-[3/4] animate-pulse bg-zinc-100" />
            <div className="mt-3 h-3 w-2/3 animate-pulse bg-zinc-100" />
            <div className="mt-2 h-3 w-1/3 animate-pulse bg-zinc-100" />
          </div>
        ))}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="border-2 border-dashed border-zinc-300 py-20 text-center" data-testid="products-empty">
        <p className="font-mono text-xs tracking-[0.2em] text-zinc-500">{t.products.empty}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4" data-testid="products-grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} i={i} />
      ))}
    </div>
  );
}

export function useProducts() {
  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    axios
      .get(`${API}/products`)
      .then((r) => setProducts(r.data))
      .catch(() => setFailed(true));
  }, []);
  return { products, failed };
}

export default function FeaturedProducts() {
  const { t } = useLanguage();
  const { products, failed } = useProducts();

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
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Link
            to="/collection"
            data-testid="view-all-products-button"
            className="group flex w-fit items-center gap-2 border-b-2 border-black pb-1 font-mono text-xs font-bold tracking-[0.2em] transition-colors hover:border-[#FFE600]"
          >
            {t.products.viewAll}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
          </Link>
        </motion.div>
      </div>
      <ProductsGrid products={products ? products.slice(0, 4) : products} failed={failed} />
    </section>
  );
}
