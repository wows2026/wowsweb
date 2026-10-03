import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { useLanguage } from "@/i18n";
import TikTokIcon from "@/components/TikTokIcon";

export default function Footer() {
  const { t, lang } = useLanguage();

  const columns = [
    {
      title: t.footer.headings.legal,
      prefix: "footer-legal",
      items: [
        { label: lang === "cz" ? "Obchodní podmínky" : "Terms & Conditions", to: "/legal/terms" },
        { label: lang === "cz" ? "Ochrana osobních údajů" : "Privacy Policy", to: "/legal/privacy" },
        { label: lang === "cz" ? "Nastavení cookies" : "Cookie Settings", to: "/legal/cookies" },
      ],
    },
    {
      title: t.footer.headings.care,
      prefix: "footer-care",
      items: [
        { label: lang === "cz" ? "Podmínky dopravy" : "Shipping Policy", to: "/legal/shipping" },
        { label: lang === "cz" ? "Vrácení zboží" : "Refund Policy", to: "/legal/refund" },
        { label: lang === "cz" ? "Tabulka velikostí" : "Size Guide", to: null },
        { label: lang === "cz" ? "Kontakt" : "Contact Us", to: "/contact" },
      ],
    },
  ];

  const socials = [
    { name: "Instagram", link: "https://instagram.com/winorwins.co", Icon: Instagram, testid: "footer-social-instagram" },
    { name: "TikTok", link: "https://tiktok.com/@winorwins.co", Icon: TikTokIcon, testid: "footer-social-tiktok" },
  ];

  return (
    <footer id="contact" data-testid="footer" className="bg-[#0D0D0D] px-5 pt-16 pb-8 text-zinc-300 sm:px-8">
      <div className="mb-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <img src="/logo-main-white.png" alt="WINORWINS" className="h-11 w-auto sm:h-14" />
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
                {col.items.map((item, i) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        data-testid={`${col.prefix}-link-${i}`}
                        className="text-sm text-zinc-400 transition-colors hover:text-[#FFE600]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span data-testid={`${col.prefix}-link-${i}`} className="text-sm text-zinc-600">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">{t.footer.headings.socials}</p>
            <div className="flex items-center gap-5">
              {socials.map(({ name, link, Icon, testid }) => (
                <a
                  key={name}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={testid}
                  aria-label={name}
                  className="text-zinc-400 transition-colors hover:text-[#FFE600]"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-t border-zinc-800 pt-10">
        <motion.p
          initial={{ y: "60%", opacity: 0 }}
          whileInView={{ y: "0%", opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[13.5vw] leading-[0.85] font-extrabold tracking-tight text-[#FFE600] uppercase select-none"
          data-testid="footer-wordmark"
        >
          WINORWINS
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
