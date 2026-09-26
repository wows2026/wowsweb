import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import MaskedTitle from "@/components/MaskedTitle";

const cardReveal = {
  hidden: { opacity: 0, y: 48 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function FeaturedProducts() {
  const { t } = useLanguage();

  return (
    <section id="collection" data-testid="featured-products-section" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.25em] text-zinc-500"
            data-testid="products-eyebrow"
          >
            <span className="inline-block h-2 w-2 bg-[#FFE600]" />
            {t.products.eyebrow}
          </motion.p>
          <MaskedTitle
            testid="products-title"
            className="font-display text-4xl leading-none tracking-tight uppercase sm:text-6xl"
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {t.products.items.map((p, i) => (
          <motion.a
            key={p.id}
            href="#collection"
            onClick={(e) => e.preventDefault()}
            custom={i}
            variants={cardReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            data-testid={`product-card-${p.id}`}
            className="group block border border-zinc-200 bg-white transition-colors duration-300 hover:border-black"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-[#F4F4F0]">
              <img
                src={p.images.main}
                alt={p.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover:opacity-0"
              />
              <img
                src={p.images.hover}
                alt={`${p.name} alternate`}
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-[opacity,transform] duration-700 group-hover:scale-100 group-hover:opacity-100"
              />
              <span className="absolute top-3 left-3 bg-[#FFE600] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.15em] text-black">
                {p.badge}
              </span>
              <span className="absolute top-3 right-3 bg-black/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] text-zinc-200 backdrop-blur-sm">
                {p.gsm}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-zinc-200 p-4 sm:p-5">
              <div>
                <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-zinc-400">{p.tag}</p>
                <h3 className="text-base font-extrabold tracking-tight uppercase sm:text-lg">{p.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{p.colorway}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold sm:text-lg">{p.price}</p>
                <p className="mt-4 flex items-center justify-end gap-1 font-mono text-[10px] tracking-[0.2em] text-zinc-400 transition-colors group-hover:text-black">
                  SHOP
                  <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:rotate-45" />
                </p>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
