import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, ArrowUpRight, Play } from "lucide-react";
import { useLanguage } from "@/i18n";
import MaskedTitle from "@/components/MaskedTitle";
import TikTokIcon from "@/components/TikTokIcon";

const ICONS = { INSTAGRAM: Instagram, TIKTOK: TikTokIcon };
const VIDEOS = {
  INSTAGRAM: { src: "https://www.instagram.com/reel/DfZdbeCOn5I/embed/", poster: "/social/instagram-drop.jpg" },
  TIKTOK: { src: "https://www.tiktok.com/embed/v2/7705434193429384470", poster: "/social/tiktok-drop.jpg" },
};

// The players set their own cookies, so they only load once the visitor presses play.
function SocialVideo({ platform }) {
  const [playing, setPlaying] = useState(false);
  const { src, poster } = VIDEOS[platform];
  if (playing) {
    return (
      <iframe
        title={`WINORWINS ${platform}`}
        src={src}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
        data-testid={`social-player-${platform.toLowerCase()}`}
      />
    );
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${platform} video`} className="group absolute inset-0 h-full w-full" data-testid={`social-play-${platform.toLowerCase()}`}>
      <img src={poster} alt={`ORIGIN STORY collection on ${platform}`} loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFE600] text-black transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-1 h-8 w-8 fill-current" />
        </span>
      </span>
    </button>
  );
}

export default function Social() {
  const { t } = useLanguage();

  return (
    <section id="community" data-testid="social-section" className="bg-wino-band px-5 py-20 sm:px-8 sm:py-28">
      <div className="mb-12 max-w-3xl">
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {t.social.channels.map((c, i) => {
          const Icon = ICONS[c.platform] || Instagram;
          return (
            <motion.div
              key={c.platform}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`social-tile-${c.platform.toLowerCase()}`}
            >
              <div className="relative aspect-[9/16] overflow-hidden bg-black sm:aspect-square">
                <SocialVideo platform={c.platform} />
              </div>
              <a
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between border-2 border-t-0 border-black p-5 transition-colors duration-300 hover:bg-[#FFE600]"
              >
                <Icon className="h-6 w-6" />
                <div className="text-right">
                  <p className="font-display text-xl font-extrabold tracking-tight uppercase sm:text-2xl">{c.platform}</p>
                  <p className="mt-1 flex items-center justify-end gap-1.5 font-mono text-xs tracking-[0.15em] text-zinc-600">
                    {c.handle}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />
                  </p>
                </div>
              </a>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
