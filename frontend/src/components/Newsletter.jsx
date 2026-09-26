import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/i18n";
import MaskedTitle from "@/components/MaskedTitle";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Newsletter() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await axios.post(`${API}/newsletter`, { email });
      toast.success(t.newsletter.success);
      setEmail("");
    } catch (err) {
      if (err?.response?.status === 409) toast(t.newsletter.duplicate);
      else toast.error(t.newsletter.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section data-testid="newsletter-section" className="border-y-2 border-black bg-[#FFE600] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 font-mono text-[11px] font-bold tracking-[0.25em] text-black/60"
        >
          // NEWSLETTER
        </motion.p>
        <MaskedTitle
          testid="newsletter-title"
          className="font-display text-[11vw] leading-[0.9] font-extrabold tracking-tight text-black uppercase sm:text-7xl lg:text-8xl"
        >
          {t.newsletter.title}
        </MaskedTitle>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-6 max-w-md text-sm font-medium text-black/70 sm:text-base"
          data-testid="newsletter-subtext"
        >
          {t.newsletter.sub}
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.7 }}
          onSubmit={submit}
          data-testid="newsletter-form"
          className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.newsletter.placeholder}
            data-testid="newsletter-email-input"
            className="h-14 flex-1 border-2 border-black bg-transparent px-5 font-mono text-sm text-black placeholder-black/50 outline-none transition-colors focus:bg-white/40"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            data-testid="newsletter-submit-button"
            className="group flex h-14 items-center justify-center gap-3 bg-black px-8 font-mono text-xs font-bold tracking-[0.2em] text-[#FFE600] transition-opacity disabled:opacity-60"
          >
            {loading ? t.newsletter.loading : t.newsletter.button}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </motion.form>
      </div>
    </section>
  );
}
