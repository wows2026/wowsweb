import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API } from "@/shop";

export default function LockScreen({ onUnlock }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    if (emailLoading) return;
    setEmailLoading(true);
    try {
      await axios.post(`${API}/waitlist`, { email, marketingConsent: true });
      setEmailDone(true);
    } catch (err) {
      if (err?.response?.status === 409) setEmailDone(true);
    } finally {
      setEmailLoading(false);
    }
  };

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
        className="w-[72vw] max-w-md"
        data-testid="lock-logo"
      />
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 font-display text-2xl font-extrabold tracking-tight text-black uppercase sm:text-3xl"
        data-testid="lock-waitlist"
      >
        {t.locked.waitlist}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.7 }}
        className="mt-2 font-display text-xs font-bold tracking-[0.15em] text-black/70 uppercase sm:text-sm"
        data-testid="lock-waitlist-sub"
      >
        {t.locked.waitlistSub}
      </motion.p>

      {emailDone ? (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 font-mono text-xs font-bold tracking-[0.2em] text-black"
          data-testid="lock-email-success"
        >
          {t.locked.subscribed}
        </motion.p>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          onSubmit={submitEmail}
          className="mt-5 flex w-full max-w-sm items-center gap-3"
          data-testid="lock-email-form"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.locked.emailPlaceholder}
            data-testid="lock-email-input"
            className="h-14 min-w-0 flex-1 rounded-full border border-black bg-transparent px-6 text-center text-sm font-medium text-black outline-none placeholder-black"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            disabled={emailLoading}
            data-testid="lock-email-submit"
            className="h-14 shrink-0 rounded-full bg-black px-5 text-[13px] font-bold tracking-[0.2em] whitespace-nowrap text-[#FFE600] transition-opacity disabled:opacity-60 sm:px-8 sm:text-sm sm:tracking-[0.25em]"
          >
            {emailLoading ? "..." : t.locked.notify}
          </motion.button>
        </motion.form>
      )}

      <div className="absolute right-5 bottom-6 sm:right-8">
        {showPw ? (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submitPw}
            className="flex items-center gap-2"
            data-testid="lock-password-form"
          >
            <input
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t.locked.passwordPlaceholder}
              data-testid="lock-password-input"
              className={`h-10 w-40 border-b-2 bg-transparent px-1 font-mono text-xs text-black outline-none placeholder-black/40 ${
                pwError ? "border-red-600" : "border-black"
              }`}
            />
            <button
              type="submit"
              disabled={pwLoading}
              data-testid="lock-password-submit"
              className="flex h-10 items-center bg-black px-4 font-mono text-[10px] font-bold tracking-[0.2em] text-[#FFE600] disabled:opacity-60"
            >
              {pwLoading ? "..." : t.locked.unlock}
            </button>
          </motion.form>
        ) : (
          <button
            onClick={() => setShowPw(true)}
            data-testid="lock-enter-password-button"
            className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-black/50 transition-colors hover:text-black"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {t.locked.enterPassword}
          </button>
        )}
        {pwError && (
          <p className="mt-2 text-right font-mono text-[10px] font-bold tracking-[0.2em] text-red-600" data-testid="lock-password-error">
            {t.locked.wrong}
          </p>
        )}
      </div>
    </motion.div>
  );
}
