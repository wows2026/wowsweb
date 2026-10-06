import { useEffect, useState } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AnimatePresence } from "framer-motion";
import "@/App.css";
import { LanguageProvider } from "@/i18n";
import { CartProvider } from "@/shop";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import FeaturedProducts from "@/components/FeaturedProducts";
import Lookbook from "@/components/Lookbook";
import Social from "@/components/Social";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LockScreen from "@/components/LockScreen";
import CollectionPage from "@/pages/CollectionPage";
import ProductPage from "@/pages/ProductPage";
import LookbookPage from "@/pages/LookbookPage";
import SocialsPage from "@/pages/SocialsPage";
import ContactPage from "@/pages/ContactPage";
import LegalPage from "@/pages/LegalPage";

function Landing() {
  return (
    <main>
      <Hero />
      <Marquee />
      <FeaturedProducts />
      <Lookbook />
      <Social />
      <Newsletter />
    </main>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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

  useEffect(() => {
    if (!window.__lenis) return;
    if (unlocked) window.__lenis.start();
    else window.__lenis.stop();
  }, [unlocked]);

  return (
    <LanguageProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-[#FAF9F6] font-sans text-[#0D0D0D] antialiased">
            <div className="grain" aria-hidden="true" />
            <AnimatePresence>
              {!unlocked && <LockScreen onUnlock={() => setUnlocked(true)} />}
            </AnimatePresence>
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/product/:handle" element={<ProductPage />} />
              <Route path="/lookbook" element={<LookbookPage />} />
              <Route path="/socials" element={<SocialsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="*" element={<Landing />} />
            </Routes>
            <Footer />
            <CartDrawer />
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
        </BrowserRouter>
      </CartProvider>
    </LanguageProvider>
  );
}
