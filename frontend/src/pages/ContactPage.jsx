import { motion } from "framer-motion";
import { ArrowUpRight, Instagram, Facebook, Music2 } from "lucide-react";
import { useLanguage } from "@/i18n";
import MaskedTitle from "@/components/MaskedTitle";

export default function ContactPage() {
  const { t } = useLanguage();

  const socials = [
    { name: "Instagram", link: "https://instagram.com", Icon: Instagram, testid: "contact-instagram" },
    { name: "TikTok", link: "https://tiktok.com", Icon: Music2, testid: "contact-tiktok" },
    { name: "Facebook", link: "https://facebook.com", Icon: Facebook, testid: "contact-facebook" },
  ];

  return (
    <div className="flex min-h-screen flex-col justify-center px-5 pt-16 sm:px-8" data-testid="contact-page">
      <MaskedTitle
        testid="contact-title"
        className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-8xl"
      >
        {t.contact.title}
      </MaskedTitle>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        className="mt-6 max-w-md text-sm text-zinc-600 sm:text-base"
        data-testid="contact-sub"
      >
        {t.contact.sub}
      </motion.p>
      <motion.a
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        href={`mailto:${t.footer.email}`}
        data-testid="contact-email"
        className="group mt-8 flex w-fit items-center gap-3 bg-[#0D0D0D] px-7 py-4 font-mono text-sm font-bold tracking-[0.15em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black"
      >
        {t.footer.email}
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
      </motion.a>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="mt-14"
      >
        <p className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">{t.contact.follow}</p>
        <div className="flex gap-3">
          {socials.map(({ name, link, Icon, testid }) => (
            <a
              key={name}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={testid}
              aria-label={name}
              className="flex h-12 w-12 items-center justify-center border border-zinc-300 transition-colors hover:border-black hover:bg-black hover:text-[#FFE600]"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
