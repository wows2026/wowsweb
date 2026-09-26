import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage, LOOKBOOK_IMAGES } from "@/i18n";
import MaskedTitle from "@/components/MaskedTitle";

export default function Lookbook() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yMid = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section
      id="lookbook"
      ref={ref}
      data-testid="lookbook-section"
      className="border-y border-zinc-200 bg-[#F4F4F0] px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mb-14 max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.25em] text-zinc-500"
          data-testid="lookbook-eyebrow"
        >
          <span className="inline-block h-2 w-2 bg-[#FFE600]" />
          {t.lookbook.eyebrow}
        </motion.p>
        <MaskedTitle
          testid="lookbook-title"
          className="font-display text-4xl leading-[0.95] tracking-tight uppercase sm:text-6xl"
        >
          {t.lookbook.title}
        </MaskedTitle>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-5 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base"
          data-testid="lookbook-text"
        >
          {t.lookbook.text}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {LOOKBOOK_IMAGES.map((src, i) => {
          const inner = (
            <div className="group relative aspect-[3/4] overflow-hidden bg-zinc-200">
              <img
                src={src}
                alt={`${t.lookbook.eyebrow} — ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span className="absolute bottom-3 left-3 bg-[#FAF9F6]/90 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.2em] backdrop-blur-sm">
                {String(i + 1).padStart(2, "0")} / 03
              </span>
            </div>
          );
          return i === 1 ? (
            <motion.div key={src} style={{ y: yMid }} data-testid={`lookbook-image-${i + 1}`} className="sm:mt-14">
              {inner}
            </motion.div>
          ) : (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`lookbook-image-${i + 1}`}
              className={i === 2 ? "sm:mt-28" : ""}
            >
              {inner}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
