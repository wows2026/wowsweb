import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";
import Logo from "@/components/Logo";

export default function Footer() {
  const { t } = useLanguage();

  const columns = [
    { title: t.footer.headings.legal, links: t.footer.legal, prefix: "footer-legal" },
    { title: t.footer.headings.care, links: t.footer.care, prefix: "footer-care" },
    { title: t.footer.headings.socials, links: ["Instagram", "TikTok", "Facebook"], prefix: "footer-social" },
  ];

  return (
    <footer id="contact" data-testid="footer" className="bg-[#0D0D0D] px-5 pt-16 pb-8 text-zinc-300 sm:px-8">
      <div className="mb-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9 [&_path]:stroke-[#FAF9F6]" />
            <span className="font-display text-2xl tracking-wide text-[#FAF9F6]">WINORWINS</span>
          </div>
          <p className="mt-5 max-w-sm font-mono text-[11px] leading-relaxed tracking-[0.15em] text-zinc-500">
            VICTORY IN EVERY FIBER. HEAVYWEIGHT ESSENTIALS, LIMITED RUNS, NO RESTOCKS.
          </p>
          <a
            href={`mailto:${t.footer.email}`}
            data-testid="footer-contact-email"
            className="mt-6 inline-block border-b border-[#FFE600] pb-0.5 font-mono text-xs tracking-[0.15em] text-[#FFE600] transition-colors hover:text-white"
          >
            {t.footer.email}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={link}>
                    <a
                      href="#contact"
                      onClick={(e) => e.preventDefault()}
                      data-testid={`${col.prefix}-link-${i}`}
                      className="text-sm text-zinc-400 transition-colors hover:text-[#FFE600]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden border-t border-zinc-800 pt-10">
        <motion.p
          initial={{ y: "60%", opacity: 0 }}
          whileInView={{ y: "0%", opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[13.5vw] leading-[0.85] tracking-tight text-zinc-800 uppercase select-none"
          data-testid="footer-wordmark"
        >
          WINORWINS<span className="text-[#FFE600]">.</span>
        </motion.p>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-zinc-800 pt-6 font-mono text-[10px] tracking-[0.2em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <span data-testid="footer-copyright">{t.footer.copyright}</span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 bg-[#FFE600]" />
          {t.footer.made}
        </span>
      </div>
    </footer>
  );
}
