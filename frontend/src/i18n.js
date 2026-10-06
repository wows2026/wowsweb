import { createContext, useContext, useState } from "react";

export const LOOKBOOK_IMAGES = [
  "https://images.unsplash.com/photo-1779675787758-ab13c8e3576d?auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1779675787607-e31e4926f267?auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1769458711041-554e51a58cb1?auto=format&fit=crop&q=85",
];

export const translations = {
  en: {
    nav: {
      home: "HOME",
      collection: "SHOP",
      contact: "CONTACT",
    },
    hero: {
      line1: "THERE'S NO LOSING.",
      line2: "ONLY LEARNING OR",
      scriptWord: "Winning",
      cta: "EXPLORE DROP 001",
      scroll: "SCROLL",
    },
    products: {
      title: "BUILT FOR THE RELENTLESS",
      collectionTitle: "FULL COLLECTION",
      viewAll: "FULL COLLECTION",
      comingSoon: "Full collection drops soon. Join the club to get notified.",
      colour: "Colour",
      colours: "Colours",
      empty: "NEW DROP COMING SOON",
      loadError: "PRODUCTS TEMPORARILY UNAVAILABLE",
    },
    product: {
      back: "BACK",
      addToCart: "ADD TO CART",
      notFound: "PRODUCT NOT FOUND",
      notFoundSub: "This piece is gone or never existed.",
    },
    contact: {
      title: "CONTACT",
      follow: "FOLLOW US",
      formName: "NAME",
      formEmail: "EMAIL",
      formMessage: "MESSAGE",
      send: "SEND MESSAGE",
      sending: "SENDING...",
      success: "Message sent. We'll get back to you soon.",
      error: "Something went wrong. Try again.",
    },
    lookbook: {
      title: "THE ARCHITECTURE OF WINNING",
      text: "Shot on concrete. Built for movement. Every stitch is a decision to go forward.",
    },
    social: {
      title: "OUR SOCIALS",
      sub: "Video reels from our ambassadors are coming soon. Tag #WINORWINS to get featured.",
      comingSoon: "VIDEO SOON",
      channels: [
        { platform: "INSTAGRAM", handle: "@winorwins.co", link: "https://instagram.com/winorwins.co" },
        { platform: "TIKTOK", handle: "@winorwins.co", link: "https://tiktok.com/@winorwins.co" },
      ],
    },
    cart: {
      title: "YOUR CART",
      empty: "YOUR CART IS EMPTY",
      subtotal: "SUBTOTAL",
      checkout: "CHECKOUT",
      discountPlaceholder: "Discount code",
      apply: "APPLY",
      remove: "REMOVE",
      soldOut: "SOLD OUT",
      added: "Added to cart.",
      unavailable: "This product is currently unavailable.",
      error: "Something went wrong. Try again.",
      discountApplied: "Discount applied",
      discountInvalid: "Invalid discount code",
      shippingNote: "Shipping & taxes calculated at checkout.",
      secure: "SECURE CHECKOUT — SHOPIFY · TEYA",
    },
    locked: {
      wip1: "WORK IN PROGRESS. RIGHT NOW.",
      wip2: "WE'RE BUILDING THE SITE AS YOU READ THIS.",
      wip3: "COME BACK SOON.",
      tagline: "DROP 001 — COMING SOON",
      waitlist: "JOIN THE WAITLIST",
      days: "DAYS",
      hours: "HRS",
      minutes: "MIN",
      seconds: "SEC",
      emailPlaceholder: "Email address",
      notify: "SIGN UP",
      subscribed: "YOU'RE IN. VICTORY INCOMING.",
      enterPassword: "ENTER PASSWORD",
      passwordPlaceholder: "PASSWORD",
      unlock: "ENTER",
      wrong: "WRONG PASSWORD",
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
      care: ["Shipping Policy", "Refund Policy", "Size Guide", "Contact Us"],
      email: "info@winorwins.com",
      copyright: "© 2026 WINORWINS CLOTHING CO. ALL RIGHTS RESERVED.",
      made: "DESIGNED IN PRAGUE",
    },
  },
  cz: {
    nav: {
      home: "HOME",
      collection: "SHOP",
      contact: "KONTAKT",
    },
    hero: {
      line1: "THERE'S NO LOSING.",
      line2: "ONLY LEARNING OR",
      scriptWord: "Winning",
      cta: "PROZKOUMAT DROP 001",
      scroll: "SCROLLUJ",
    },
    products: {
      title: "BUILT FOR THE RELENTLESS",
      collectionTitle: "CELÁ KOLEKCE",
      viewAll: "CELÁ KOLEKCE",
      comingSoon: "Celá kolekce vychází brzy. Připoj se do klubu a dozvíš se to první.",
      colour: "Barva",
      colours: "Barvy",
      empty: "NOVÝ DROP JIŽ BRZY",
      loadError: "PRODUKTY JSOU DOČASNĚ NEDOSTUPNÉ",
    },
    product: {
      back: "ZPĚT",
      addToCart: "PŘIDAT DO KOŠÍKU",
      notFound: "PRODUKT NENALEZEN",
      notFoundSub: "Tenhle kus je pryč, nebo nikdy neexistoval.",
    },
    contact: {
      title: "KONTAKT",
      follow: "SLEDUJ NÁS",
      formName: "JMÉNO",
      formEmail: "EMAIL",
      formMessage: "ZPRÁVA",
      send: "ODESLAT ZPRÁVU",
      sending: "ODESÍLÁM...",
      success: "Zpráva odeslána. Brzy se ti ozveme.",
      error: "Něco se pokazilo. Zkus to znovu.",
    },
    lookbook: {
      title: "ARCHITEKTURA VÍTĚZSTVÍ",
      text: "Foceno na betonu. Stavěno do pohybu. Každý steh je rozhodnutí jít dopředu.",
    },
    social: {
      title: "NAŠE SOCIÁLNÍ SÍTĚ",
      sub: "Videa od našich ambasadorů vychází brzy. Označ #WINORWINS a buď featured.",
      comingSoon: "VIDEO BRZY",
      channels: [
        { platform: "INSTAGRAM", handle: "@winorwins.co", link: "https://instagram.com/winorwins.co" },
        { platform: "TIKTOK", handle: "@winorwins.co", link: "https://tiktok.com/@winorwins.co" },
      ],
    },
    cart: {
      title: "KOŠÍK",
      empty: "KOŠÍK JE PRÁZDNÝ",
      subtotal: "MEZISOUČET",
      checkout: "K POKLADNĚ",
      discountPlaceholder: "Slevový kód",
      apply: "POUŽÍT",
      remove: "ODEBRAT",
      soldOut: "VYPRODÁNO",
      added: "Přidáno do košíku.",
      unavailable: "Produkt je momentálně nedostupný.",
      error: "Něco se pokazilo. Zkus to znovu.",
      discountApplied: "Sleva použita",
      discountInvalid: "Neplatný slevový kód",
      shippingNote: "Doprava a daně se spočítají u pokladny.",
      secure: "ZABEZPEČENÁ PLATBA — SHOPIFY · TEYA",
    },
    locked: {
      wip1: "PRACUJEME NA TOM. PRÁVĚ TEĎ.",
      wip2: "WEB STAVÍME, ZATÍMCO TO ČTEŠ.",
      wip3: "VRAŤ SE BRZY.",
      tagline: "DROP 001 — JIŽ BRZY",
      waitlist: "PŘIDEJ SE NA WAITLIST",
      days: "DNÍ",
      hours: "HOD",
      minutes: "MIN",
      seconds: "SEK",
      emailPlaceholder: "E-mailová adresa",
      notify: "SIGN UP",
      subscribed: "JSI UVNITŘ. VÍTĚZSTVÍ SE BLÍŽÍ.",
      enterPassword: "ZADEJ HESLO",
      passwordPlaceholder: "HESLO",
      unlock: "VSTOUPIT",
      wrong: "ŠPATNÉ HESLO",
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
      care: ["Podmínky dopravy", "Vrácení zboží", "Tabulka velikostí", "Kontakt"],
      email: "info@winorwins.com",
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
