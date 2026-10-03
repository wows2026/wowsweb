import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Instagram, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API } from "@/shop";
import MaskedTitle from "@/components/MaskedTitle";
import TikTokIcon from "@/components/TikTokIcon";

export default function ContactPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const socials = [
    { name: "Instagram", link: "https://instagram.com/winorwins.co", Icon: Instagram, testid: "contact-instagram" },
    { name: "TikTok", link: "https://tiktok.com/@winorwins.co", Icon: TikTokIcon, testid: "contact-tiktok" },
  ];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await axios.post(`${API}/contact`, form);
      toast.success(t.contact.success);
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error(t.contact.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-5 pt-24 pb-16 sm:px-8" data-testid="contact-page">
      <div className="grid gap-16 lg:grid-cols-2">
        <div>
          <MaskedTitle
            testid="contact-title"
            className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-8xl"
          >
            {t.contact.title}
          </MaskedTitle>
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

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={submit}
          className="flex flex-col gap-7 lg:pt-4"
          data-testid="contact-form"
        >
          <div>
            <label htmlFor="contact-name" className="mb-2 block font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">
              {t.contact.formName}
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={form.name}
              onChange={set("name")}
              data-testid="contact-name-input"
              className="w-full border-b-2 border-zinc-300 bg-transparent py-3 text-sm outline-none transition-colors placeholder-zinc-400 focus:border-black"
            />
          </div>
          <div>
            <label htmlFor="contact-email-field" className="mb-2 block font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">
              {t.contact.formEmail}
            </label>
            <input
              id="contact-email-field"
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              data-testid="contact-email-input"
              className="w-full border-b-2 border-zinc-300 bg-transparent py-3 text-sm outline-none transition-colors placeholder-zinc-400 focus:border-black"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-2 block font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">
              {t.contact.formMessage}
            </label>
            <textarea
              id="contact-message"
              required
              rows={4}
              value={form.message}
              onChange={set("message")}
              data-testid="contact-message-input"
              className="w-full resize-none border-b-2 border-zinc-300 bg-transparent py-3 text-sm outline-none transition-colors placeholder-zinc-400 focus:border-black"
            />
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={sending}
            data-testid="contact-submit-button"
            className="group flex w-fit items-center gap-3 bg-[#0D0D0D] px-8 py-4 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black disabled:opacity-60"
          >
            {sending ? t.contact.sending : t.contact.send}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}
