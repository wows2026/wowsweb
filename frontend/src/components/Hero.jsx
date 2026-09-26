import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/i18n";
import { scrollToSection } from "@/components/Navbar";

const HERO_VIDEO = "https://assets.mixkit.co/videos/42898/42898-720.mp4";
const HERO_POSTER =
  "https://images.unsplash.com/photo-1615397587950-3cbb55f95b77?crop=entropy&cs=srgb&fm=jpg&q=85";

const lineReveal = {
  hidden: { y: "115%", rotate: 3 },
  visible: (i) => ({
    y: "0%",
    rotate: 0,
    transition: { delay: 0.4 + i * 0.14, duration: 1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Hero() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={ref}
      id="top"
      data-testid="hero-section"
      className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[#FAF9F6]"
    >
      <motion.div style={{ y: videoY, scale: videoScale }} className="absolute inset-0">
        <video
          data-testid="hero-video"
          className="h-full w-full object-cover"
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/25 to-[#FAF9F6]" />
      </motion.div>

      <motion.div
        style={{ opacity: fade }}
        className="absolute inset-0 flex flex-col justify-end px-5 pb-28 sm:px-8 sm:pb-32"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.25em] text-zinc-800"
          data-testid="hero-eyebrow"
        >
          <span className="inline-block h-2.5 w-2.5 bg-[#FFE600]" />
          {t.hero.eyebrow}
        </motion.p>

        <h1
          data-testid="hero-headline"
          className="font-display text-[12.5vw] leading-[0.85] tracking-tight text-[#0D0D0D] uppercase sm:text-[11vw] lg:text-[9vw]"
        >
          {t.hero.lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-1">
              <motion.span
                custom={i}
                variants={lineReveal}
                initial="hidden"
                animate="visible"
                className={`block origin-left ${i === 1 ? "w-fit bg-[#FFE600] px-3" : ""}`}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md text-sm leading-relaxed text-zinc-700 sm:text-base"
            data-testid="hero-subtext"
          >
            {t.hero.sub}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            data-testid="hero-cta-button"
            onClick={() => scrollToSection("#collection")}
            className="group flex w-fit items-center gap-3 whitespace-nowrap bg-[#0D0D0D] px-7 py-4 font-mono text-xs font-bold tracking-[0.2em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black"
          >
            {t.hero.cta}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        style={{ opacity: fade }}
        className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-zinc-900/10 px-5 py-4 font-mono text-[10px] tracking-[0.2em] text-zinc-600 sm:px-8"
        data-testid="hero-meta-bar"
      >
        <span className="hidden sm:block">{t.hero.meta[0]}</span>
        <span className="flex items-center gap-2">
          {t.hero.scroll}
          <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
            <ArrowDown className="h-3.5 w-3.5" />
          </motion.span>
        </span>
        <span className="hidden sm:block">{t.hero.meta[2]}</span>
      </motion.div>
    </section>
  );
}
