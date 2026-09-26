import { useEffect } from "react";
import Lenis from "lenis";
import { Toaster } from "sonner";
import "@/App.css";
import { LanguageProvider } from "@/i18n";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import FeaturedProducts from "@/components/FeaturedProducts";
import Lookbook from "@/components/Lookbook";
import Social from "@/components/Social";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function App() {
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
      <div className="min-h-screen bg-[#FAF9F6] font-sans text-[#0D0D0D] antialiased">
        <div className="grain" aria-hidden="true" />
        <Navbar />
        <main>
          <Hero />
          <Marquee />
          <FeaturedProducts />
          <Lookbook />
          <Social />
          <Newsletter />
        </main>
        <Footer />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#0D0D0D",
              color: "#FAF9F6",
              border: "1px solid #FFE600",
              borderRadius: 0,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "12px",
              letterSpacing: "0.05em",
            },
          }}
        />
      </div>
    </LanguageProvider>
  );
}
