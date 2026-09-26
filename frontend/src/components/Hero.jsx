import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/i18n";
import { scrollToSection } from "@/components/Navbar";

const HERO_VIDEO = "https://assets.mixkit.co/videos/50639/50639-720.mp4";
const HERO_POSTER = "/hero-poster.jpg";

const lineReveal = {
  hidden: { y: "115%", rotate: 2 },
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
        <h1
          data-testid="hero-headline"
          className="font-display text-[34px] leading-[1.08] font-extrabold tracking-tight text-[#0D0D0D] uppercase sm:text-5xl lg:text-6xl"
        >
          <span className="block overflow-hidden pb-1">
            <motion.span custom={0} variants={lineReveal} initial="hidden" animate="visible" className="block origin-left">
              {t.hero.line1}
            </motion.span>
          </span>
          <motion.span
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-1 block"
          >
            {t.hero.line2}{" "}
            <span className="relative inline-block px-4 align-baseline" data-testid="hero-script-word">
              <span className="font-script text-[1.65em] leading-[0.8] normal-case tracking-normal">
                {t.hero.scriptWord}
              </span>
              <motion.svg
                className="pointer-events-none absolute -inset-x-2 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+1rem)] overflow-visible"
                viewBox="0 0 220 90"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.ellipse
                  cx="110"
                  cy="45"
                  rx="102"
                  ry="36"
                  stroke="#FFE600"
                  strokeWidth="5"
                  strokeLinecap="round"
                  transform="rotate(-2 110 45)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.5, duration: 0.8, ease: "easeInOut" }}
                />
                <motion.ellipse
                  cx="110"
                  cy="45"
                  rx="96"
                  ry="31"
                  stroke="#FFE600"
                  strokeWidth="2.5"
                  opacity="0.7"
                  transform="rotate(1.4 110 45)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.7, duration: 0.8, ease: "easeInOut" }}
                />
              </motion.svg>
            </span>
          </motion.span>
        </h1>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          data-testid="hero-cta-button"
          onClick={() => scrollToSection("#collection")}
          className="group mt-9 flex w-fit items-center gap-3 whitespace-nowrap bg-[#0D0D0D] px-7 py-4 font-mono text-xs font-bold tracking-[0.2em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black"
        >
          {t.hero.cta}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        style={{ opacity: fade }}
        className="absolute inset-x-0 bottom-0 flex items-center justify-center border-t border-zinc-900/10 px-5 py-4 font-mono text-[10px] tracking-[0.2em] text-zinc-600 sm:px-8"
        data-testid="hero-meta-bar"
      >
        <span className="flex items-center gap-2">
          {t.hero.scroll}
          <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
            <ArrowDown className="h-3.5 w-3.5" />
          </motion.span>
        </span>
      </motion.div>
    </section>
  );
}
