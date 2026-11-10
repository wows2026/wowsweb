import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API } from "@/shop";

export default function LockScreen({ onUnlock }) {
  const { t } = useLanguage();
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const submitPw = async (e) => {
    e.preventDefault();
    if (pwLoading) return;
    setPwLoading(true);
    setPwError(false);
    try {
      await axios.post(`${API}/auth/unlock`, { password: pw });
      localStorage.setItem("wino_unlocked", "1");
      onUnlock();
    } catch {
      setPwError(true);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <motion.div
      exit={{ y: "-100%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FFE600] px-5"
      data-testid="lock-screen"
    >
      <motion.img
        src="/logo-main-black.png"
        alt="WINORWINS"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="h-auto max-h-[30svh] w-[72vw] max-w-md object-contain"
        data-testid="lock-logo"
      />
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 text-center font-display text-2xl font-semibold tracking-tight text-black uppercase sm:text-3xl"
        data-testid="lock-title"
      >
        {t.locked.enterPassword}
      </motion.p>

      <div className="mt-5 flex w-full max-w-sm flex-col items-center [@media(max-height:500px)]:max-w-xs">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          onSubmit={submitPw}
          className="flex w-full items-center gap-3"
          data-testid="lock-password-form"
        >
          <input
            type="password"
            required
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={t.locked.passwordPlaceholder}
            aria-label={t.locked.passwordPlaceholder}
            aria-invalid={pwError}
            data-testid="lock-password-input"
            className={`h-14 min-w-0 flex-1 rounded-full border bg-transparent px-6 text-center text-base font-medium text-black outline-none placeholder-black sm:text-sm ${
              pwError ? "border-red-600" : "border-black"
            }`}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            disabled={pwLoading}
            data-testid="lock-password-submit"
            className="h-14 shrink-0 rounded-full bg-black px-6 text-[13px] font-bold tracking-[0.2em] whitespace-nowrap text-[#FFE600] transition-opacity disabled:opacity-60 sm:px-8 sm:text-sm"
          >
            {pwLoading ? "..." : t.locked.unlock}
          </motion.button>
        </motion.form>
        {pwError && (
          <p className="mt-3 font-mono text-[10px] font-bold tracking-[0.2em] text-red-600" role="alert" data-testid="lock-password-error">
            {t.locked.wrong}
          </p>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-3 text-center text-[11px] text-black/60"
        >
          <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-black" data-testid="lock-privacy-link">
            {t.locked.privacy}
          </Link>
        </motion.p>
      </div>
    </motion.div>
  );
}
