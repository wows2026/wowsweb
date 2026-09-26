import { motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
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
  const { t } = useLanguage();

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

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
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
            className="group block"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-[#F4F4F0]">
              <img
                src={p.images.main}
                alt={p.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
              />
              <img
                src={p.images.hover}
                alt={`${p.name} alternate`}
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-100 group-hover:opacity-100"
              />
              <span className="absolute top-2.5 left-2.5 bg-[#FFE600] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-black">
                {p.badge}
              </span>
              <span className="absolute right-2.5 bottom-2.5 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-sm transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <Plus className="h-4 w-4" />
              </span>
            </div>
            <div className="pt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-bold tracking-tight uppercase">{p.name}</h3>
                <p className="text-[13px] font-semibold whitespace-nowrap">{p.price}</p>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{p.colorway}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {p.colors.map((c) => (
                  <span
                    key={c}
                    className="h-3 w-3 rounded-full border border-zinc-300"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <span className="ml-1 text-[10px] text-zinc-400">
                  {p.colors.length} {p.colors.length > 1 ? t.products.colours : t.products.colour}
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
