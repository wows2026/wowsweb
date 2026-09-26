import { motion } from "framer-motion";
import { Instagram, Facebook, Music2, ArrowUpRight, Play } from "lucide-react";
import { useLanguage } from "@/i18n";
import MaskedTitle from "@/components/MaskedTitle";

const ICONS = { INSTAGRAM: Instagram, TIKTOK: Music2, FACEBOOK: Facebook };

export default function Social() {
  const { t } = useLanguage();

  return (
    <section id="community" data-testid="social-section" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mb-12 max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.25em] text-zinc-500"
          data-testid="social-eyebrow"
        >
          <span className="inline-block h-2 w-2 bg-[#FFE600]" />
          {t.social.eyebrow}
        </motion.p>
        <MaskedTitle
          testid="social-title"
          className="font-display text-3xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-5xl"
        >
          {t.social.title}
        </MaskedTitle>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-5 max-w-lg text-sm leading-relaxed text-zinc-600 sm:text-base"
          data-testid="social-subtext"
        >
          {t.social.sub}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {t.social.channels.map((c, i) => {
          const Icon = ICONS[c.platform] || Instagram;
          return (
            <motion.a
              key={c.platform}
              href={c.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`social-tile-${c.platform.toLowerCase()}`}
              className="group relative flex aspect-[4/5] flex-col justify-between border-2 border-dashed border-zinc-300 bg-white p-5 transition-colors duration-300 hover:border-black hover:bg-[#FAF9F6]"
            >
              <div className="flex items-start justify-between">
                <Icon className="h-6 w-6 text-zinc-400 transition-colors duration-300 group-hover:text-black" />
                <span className="bg-[#FFE600] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.15em]">
                  {t.social.comingSoon}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-300 text-zinc-400 transition-all duration-300 group-hover:scale-110 group-hover:border-black group-hover:bg-[#FFE600] group-hover:text-black">
                  <Play className="ml-0.5 h-6 w-6 fill-current" />
                </span>
              </div>
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight uppercase sm:text-2xl">{c.platform}</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs tracking-[0.15em] text-zinc-500">
                  {c.handle}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />
                </p>
              </div>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
