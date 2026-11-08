import { lazy, Suspense, useEffect, useState } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AnimatePresence } from "framer-motion";
import "@/App.css";
import { LanguageProvider } from "@/i18n";
import { CartProvider } from "@/shop";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LockScreen from "@/components/LockScreen";

const Landing = lazy(() => import("@/pages/Landing"));
const CollectionPage = lazy(() => import("@/pages/CollectionPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const LookbookPage = lazy(() => import("@/pages/LookbookPage"));
const SocialsPage = lazy(() => import("@/pages/SocialsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const CheckoutReturnPage = lazy(() => import("@/pages/CheckoutReturnPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Legal pages stay readable while the site is locked (the lock screen links to the privacy policy).
function SiteLock({ locked, onUnlock }) {
  useEffect(() => {
    // Rubber-band overscroll on phones shows the page background behind the lock screen.
    document.documentElement.style.backgroundColor = locked ? "#FFE600" : "";
    if (!window.__lenis) return;
    if (locked) window.__lenis.stop();
    else window.__lenis.start();
  }, [locked]);

  return <AnimatePresence>{locked && <LockScreen onUnlock={onUnlock} />}</AnimatePresence>;
}

// While locked the site isn't rendered at all, so there is nothing to scroll to behind the lock screen.
function Site({ unlocked, onUnlock }) {
  const { pathname } = useLocation();
  const locked = !unlocked && !pathname.startsWith("/legal/");

  return (
    <div className="min-h-screen bg-[#E8E8E8] font-sans text-[#0D0D0D] antialiased">
      <div className="grain" aria-hidden="true" />
      <SiteLock locked={locked} onUnlock={onUnlock} />
      {!locked && (
        <>
          <Navbar />
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/product/:handle" element={<ProductPage />} />
              <Route path="/lookbook" element={<LookbookPage />} />
              <Route path="/socials" element={<SocialsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/return" element={<CheckoutReturnPage />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
          <Footer />
          <CartDrawer />
        </>
      )}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#0D0D0D",
            color: "#FAF9F6",
            border: "1px solid #FFE600",
            borderRadius: 0,
            fontFamily: '"Helvetica Now Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: "12px",
            letterSpacing: "0.05em",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("wino_unlocked") === "1");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lock") === "1") {
      localStorage.removeItem("wino_unlocked");
      setUnlocked(false);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis;
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <LanguageProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Site unlocked={unlocked} onUnlock={() => setUnlocked(true)} />
        </BrowserRouter>
      </CartProvider>
    </LanguageProvider>
  );
}
