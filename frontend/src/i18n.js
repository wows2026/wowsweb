import { createContext, useContext, useState } from "react";

const PRODUCT_IMAGES = {
  p1: {
    main: "https://images.unsplash.com/photo-1764069415220-909767290088?auto=format&fit=crop&q=85",
    hover: "https://images.unsplash.com/photo-1764069414641-01244b3222eb?auto=format&fit=crop&q=85",
  },
  p2: {
    main: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=85",
    hover: "https://images.unsplash.com/photo-1574427797991-b086946fa9e7?auto=format&fit=crop&q=85",
  },
  p3: {
    main: "https://images.unsplash.com/photo-1764069414645-e05570fc96ac?auto=format&fit=crop&q=85",
    hover: "https://images.unsplash.com/photo-1648249626189-d7a4d88a9416?auto=format&fit=crop&q=85",
  },
  p4: {
    main: "https://images.unsplash.com/photo-1631902112544-2271267abb73?auto=format&fit=crop&q=85",
    hover: "https://images.unsplash.com/photo-1538329972958-465d6d2144ed?auto=format&fit=crop&q=85",
  },
};

export const LOOKBOOK_IMAGES = [
  "https://images.unsplash.com/photo-1779675787758-ab13c8e3576d?auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1779675787607-e31e4926f267?auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1769458711041-554e51a58cb1?auto=format&fit=crop&q=85",
];

export const translations = {
  en: {
    nav: {
      collection: "COLLECTION",
      lookbook: "LOOKBOOK",
      community: "SOCIALS",
      contact: "CONTACT",
    },
    hero: {
      eyebrow: "DROP 001 — LIVE NOW",
      line1: "THERE'S NO LOSING.",
      line2: "ONLY LEARNING OR",
      scriptWord: "Winning",
      sub: "Heavyweight essentials engineered in Prague. 500 GSM cotton. Strictly limited to 100 pieces per style.",
      cta: "EXPLORE DROP 001",
      scroll: "SCROLL",
      meta: ["PRG — LDN — TYO", "EST. MMXXVI", "500 GSM HEAVYWEIGHT"],
    },
    products: {
      eyebrow: "FEATURED // DROP 001",
      title: "BUILT FOR THE RELENTLESS",
      viewAll: "FULL COLLECTION",
      comingSoon: "Full collection drops soon. Join the club to get notified.",
      colour: "Colour",
      colours: "Colours",
      items: [
        { id: "wow-001", name: "APEX HEAVYWEIGHT HOODIE", colorway: "Oatmeal / Electric Yellow", price: "€160", badge: "DROP 001", colors: ["#E7DECB", "#FFE600"], images: PRODUCT_IMAGES.p1 },
        { id: "wow-002", name: "TACTICAL UTILITY JACKET", colorway: "Matte Black", price: "€240", badge: "LIMITED 50", colors: ["#111111"], images: PRODUCT_IMAGES.p2 },
        { id: "wow-003", name: "PROTOTYPE OVERSIZED TEE", colorway: "Bone White / Acid", price: "€85", badge: "BESTSELLER", colors: ["#F2F0E9", "#D9FF00"], images: PRODUCT_IMAGES.p3 },
        { id: "wow-004", name: "TECH PUFFER JACKET", colorway: "Vibrant Yellow / Graphite", price: "€290", badge: "NEW DROP", colors: ["#FFE600", "#3F3F46"], images: PRODUCT_IMAGES.p4 },
      ],
    },
    lookbook: {
      eyebrow: "CAMPAIGN 01",
      title: "THE ARCHITECTURE OF WINNING",
      text: "Shot on concrete. Built for movement. Every stitch is a decision to go forward.",
    },
    social: {
      eyebrow: "COMMUNITY",
      title: "OUR SOCIALS",
      sub: "Video reels from our ambassadors are coming soon. Tag #WINORWINS to get featured.",
      comingSoon: "VIDEO SOON",
      channels: [
        { platform: "INSTAGRAM", handle: "@winorwins.clo", link: "https://instagram.com" },
        { platform: "TIKTOK", handle: "@winorwins", link: "https://tiktok.com" },
        { platform: "FACEBOOK", handle: "WINORWINS Official", link: "https://facebook.com" },
      ],
    },
    newsletter: {
      title: "JOIN THE WINNERS CLUB",
      sub: "First access to DROP 002, private sales and members-only colorways.",
      placeholder: "your@email.com",
      button: "JOIN NOW",
      loading: "JOINING...",
      success: "Welcome to the club. Victory incoming.",
      duplicate: "You are already in the club.",
      error: "Something went wrong. Try again.",
    },
    footer: {
      headings: { legal: "LEGAL", care: "CUSTOMER CARE", socials: "SOCIALS" },
      legal: ["Terms & Conditions", "Privacy Policy", "Cookie Settings"],
      care: ["Shipping & Returns", "Size Guide", "Contact Us"],
      email: "contact@winorwins.com",
      copyright: "© 2026 WINORWINS CLOTHING CO. ALL RIGHTS RESERVED.",
      made: "DESIGNED IN PRAGUE",
    },
  },
  cz: {
    nav: {
      collection: "KOLEKCE",
      lookbook: "LOOKBOOK",
      community: "SOCIÁLNÍ SÍTĚ",
      contact: "KONTAKT",
    },
    hero: {
      eyebrow: "DROP 001 — PRÁVĚ VENKU",
      line1: "THERE'S NO LOSING.",
      line2: "ONLY LEARNING OR",
      scriptWord: "Winning",
      sub: "Heavyweight essentials navržené v Praze. 500 GSM bavlna. Striktně limitováno na 100 kusů od modelu.",
      cta: "PROZKOUMAT DROP 001",
      scroll: "SCROLLUJ",
      meta: ["PRG — LDN — TYO", "EST. MMXXVI", "500 GSM HEAVYWEIGHT"],
    },
    products: {
      eyebrow: "FEATURED // DROP 001",
      title: "BUILT FOR THE RELENTLESS",
      viewAll: "CELÁ KOLEKCE",
      comingSoon: "Celá kolekce vychází brzy. Připoj se do klubu a dozvíš se to první.",
      colour: "Barva",
      colours: "Barvy",
      items: [
        { id: "wow-001", name: "APEX HEAVYWEIGHT HOODIE", colorway: "Oatmeal / Electric Yellow", price: "3 990 Kč", badge: "DROP 001", colors: ["#E7DECB", "#FFE600"], images: PRODUCT_IMAGES.p1 },
        { id: "wow-002", name: "TACTICAL UTILITY JACKET", colorway: "Matte Black", price: "5 990 Kč", badge: "LIMITED 50", colors: ["#111111"], images: PRODUCT_IMAGES.p2 },
        { id: "wow-003", name: "PROTOTYPE OVERSIZED TEE", colorway: "Bone White / Acid", price: "2 100 Kč", badge: "BESTSELLER", colors: ["#F2F0E9", "#D9FF00"], images: PRODUCT_IMAGES.p3 },
        { id: "wow-004", name: "TECH PUFFER JACKET", colorway: "Vibrant Yellow / Graphite", price: "7 200 Kč", badge: "NEW DROP", colors: ["#FFE600", "#3F3F46"], images: PRODUCT_IMAGES.p4 },
      ],
    },
    lookbook: {
      eyebrow: "KAMPAŇ 01",
      title: "ARCHITEKTURA VÍTĚZSTVÍ",
      text: "Foceno na betonu. Stavěno do pohybu. Každý steh je rozhodnutí jít dopředu.",
    },
    social: {
      eyebrow: "KOMUNITA",
      title: "NAŠE SOCIÁLNÍ SÍTĚ",
      sub: "Videa od našich ambasadorů vychází brzy. Označ #WINORWINS a buď featured.",
      comingSoon: "VIDEO BRZY",
      channels: [
        { platform: "INSTAGRAM", handle: "@winorwins.clo", link: "https://instagram.com" },
        { platform: "TIKTOK", handle: "@winorwins", link: "https://tiktok.com" },
        { platform: "FACEBOOK", handle: "WINORWINS Official", link: "https://facebook.com" },
      ],
    },
    newsletter: {
      title: "PŘIPOJ SE DO WINNERS CLUBU",
      sub: "Přednostní přístup k DROP 002, privátní slevy a members-only colorwaye.",
      placeholder: "tvuj@email.cz",
      button: "PŘIPOJIT SE",
      loading: "PŘIPOJUJI...",
      success: "Vítej v klubu. Vítězství je na cestě.",
      duplicate: "Už jsi v klubu.",
      error: "Něco se pokazilo. Zkus to znovu.",
    },
    footer: {
      headings: { legal: "PRÁVNÍ", care: "ZÁKAZNICKÁ PÉČE", socials: "SOCIÁLNÍ SÍTĚ" },
      legal: ["Obchodní podmínky", "Ochrana osobních údajů", "Nastavení cookies"],
      care: ["Doprava a vrácení", "Tabulka velikostí", "Kontakt"],
      email: "contact@winorwins.com",
      copyright: "© 2026 WINORWINS CLOTHING CO. VŠECHNA PRÁVA VYHRAZENA.",
      made: "NAVRŽENO V PRAZE",
    },
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
