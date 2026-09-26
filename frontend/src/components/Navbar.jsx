import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n";

export function scrollToSection(id) {
  const el = document.querySelector(id);
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -64 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export default function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "#collection", label: t.nav.collection, testid: "nav-link-collection" },
    { id: "#lookbook", label: t.nav.lookbook, testid: "nav-link-lookbook" },
    { id: "#community", label: t.nav.community, testid: "nav-link-community" },
    { id: "#contact", label: t.nav.contact, testid: "nav-link-contact" },
  ];

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-[background-color,border-color] duration-500 ${
        scrolled
          ? "border-b border-zinc-200 bg-[#FAF9F6]/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="flex h-16 items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          data-testid="nav-logo"
          onClick={(e) => {
            e.preventDefault();
            if (window.__lenis) window.__lenis.scrollTo(0);
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2.5"
        >
          <img src="/logo-main-black.png" alt="WINORWINS" className="h-9 w-auto sm:h-10" />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.id}
              href={l.id}
              data-testid={l.testid}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(l.id);
              }}
              className="group relative font-mono text-[11px] font-medium tracking-[0.2em] text-zinc-700 transition-colors hover:text-black"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-[#FFE600] transition-[width] duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

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
      </nav>
    </header>
  );
}
