import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "@/i18n";
import { useCart } from "@/shop";

export function scrollToSection(id) {
  const el = document.querySelector(id);
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -64 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export default function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const { cart, setOpen, currency, setCurrency } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/", label: t.nav.home, testid: "nav-link-home" },
    { to: "/collection", label: t.nav.collection, testid: "nav-link-collection" },
    { to: "/contact", label: t.nav.contact, testid: "nav-link-contact" },
  ];

  const count = cart?.totalQuantity || 0;

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-[background-color,border-color] duration-500 ${
        scrolled
          ? "border-b border-zinc-200 bg-[#E8E8E8]/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link to="/" data-testid="nav-logo" className="flex items-center">
          <img src="/logo-main-black.png" alt="WINORWINS" className="h-9 w-auto sm:h-10" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={l.testid}
              className="group relative font-mono text-[11px] font-medium tracking-[0.2em] text-zinc-700 transition-colors hover:text-black"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-[#FFE600] transition-[width] duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest" data-testid="language-toggle">
            <button
              data-testid="lang-en-button"
              onClick={() => setLang("en")}
              className={`px-2 py-1 transition-colors ${lang === "en" ? "bg-[#0D0D0D] text-[#FFE600]" : "text-zinc-500 hover:text-black"}`}
            >
              EN
            </button>
            <span className="text-zinc-300">/</span>
            <button
              data-testid="lang-cz-button"
              onClick={() => setLang("cz")}
              className={`px-2 py-1 transition-colors ${lang === "cz" ? "bg-[#0D0D0D] text-[#FFE600]" : "text-zinc-500 hover:text-black"}`}
            >
              CZ
            </button>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest" data-testid="currency-toggle">
            <button
              data-testid="currency-czk-button"
              onClick={() => setCurrency("CZK")}
              className={`px-2 py-1 transition-colors ${currency === "CZK" ? "bg-[#0D0D0D] text-[#FFE600]" : "text-zinc-500 hover:text-black"}`}
            >
              Kč
            </button>
            <span className="text-zinc-300">/</span>
            <button
              data-testid="currency-eur-button"
              onClick={() => setCurrency("EUR")}
              className={`px-2 py-1 transition-colors ${currency === "EUR" ? "bg-[#0D0D0D] text-[#FFE600]" : "text-zinc-500 hover:text-black"}`}
            >
              EUR
            </button>
          </div>
          <button
            data-testid="nav-cart-button"
            onClick={() => setOpen(true)}
            aria-label="Open cart"
            className="relative p-2 transition-colors hover:text-zinc-600"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span
                data-testid="cart-count-badge"
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFE600] px-0.5 font-mono text-[9px] font-bold text-black"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
