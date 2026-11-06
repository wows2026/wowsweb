import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Lock, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API, useCart, formatPrice } from "@/shop";

// The Shopify store ships to the EU except Cyprus and Malta; country names come from the browser in the page language.
const COUNTRIES = ["CZ", "SK", "AT", "BE", "BG", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "NL", "PL", "PT", "RO", "SE", "SI"];
const DIAL_CODES = {
  CZ: "420", SK: "421", AT: "43", BE: "32", BG: "359", CY: "357", DE: "49", DK: "45", EE: "372", ES: "34", FI: "358", FR: "33", GR: "30", HR: "385",
  HU: "36", IE: "353", IT: "39", LT: "370", LU: "352", LV: "371", MT: "356", NL: "31", PL: "48", PT: "351", RO: "40", SE: "46", SI: "386",
  // Not delivery countries, but a buyer can order for someone else from a foreign number.
  CH: "41", GB: "44", NO: "47", UA: "380", US: "1", VN: "84",
};
const FORM_KEY = "wino_checkout_form";
const DPD_WIDGET = "https://api.dpd.cz/widget/latest/index.html";

const labelCls = "mb-2 block font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500";
const inputCls =
  "w-full border-b-2 border-zinc-300 bg-transparent py-3 text-base outline-none transition-colors placeholder-zinc-400 focus:border-black sm:text-sm";

const flag = (code) => String.fromCodePoint(...[...code].map((ch) => 0x1f1a5 + ch.charCodeAt(0)));

const regionNames = (lang, codes) => {
  const dn = new Intl.DisplayNames([lang === "cz" ? "cs" : "en"], { type: "region" });
  return codes
    .map((code) => ({ code, name: dn.of(code) }))
    .sort((a, b) => (a.code === "CZ" ? -1 : b.code === "CZ" ? 1 : a.code === "SK" ? -1 : b.code === "SK" ? 1 : a.name.localeCompare(b.name)));
};

// A pasted or autofilled "+420 777…" belongs in the selector, not in the number field.
function splitPhone(value) {
  const compact = value.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!compact.startsWith("+")) return null;
  const code = Object.keys(DIAL_CODES)
    .filter((c) => compact.startsWith(`+${DIAL_CODES[c]}`))
    .sort((a, b) => DIAL_CODES[b].length - DIAL_CODES[a].length)[0];
  return code ? { phone_country: code, phone: compact.slice(DIAL_CODES[code].length + 1) } : null;
}

function fullPhone({ phone, phone_country: code }) {
  const digits = phone.replace(/\D/g, "");
  // The trunk 0 is dropped in international format, except in Italy where it is part of the number.
  return `+${DIAL_CODES[code]} ${code === "IT" ? digits : digits.replace(/^0+/, "")}`;
}

function PhoneField({ label, codeLabel, lang, form, setForm }) {
  const options = useMemo(() => regionNames(lang, Object.keys(DIAL_CODES)), [lang]);
  return (
    <div>
      <label htmlFor="checkout-phone" className={labelCls}>
        {label}
      </label>
      <div className="flex gap-3">
        <div className="relative shrink-0 border-b-2 border-zinc-300 transition-colors focus-within:border-black">
          <span className="pointer-events-none flex h-full items-center gap-1.5 pr-1 text-base sm:text-sm" data-testid="checkout-phone-code">
            {flag(form.phone_country)} +{DIAL_CODES[form.phone_country]}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </span>
          {/* The native picker, invisible over the compact label: full country names when open, a short "+420" when closed. */}
          <select
            aria-label={codeLabel}
            data-testid="checkout-phone-country"
            autoComplete="tel-country-code"
            value={form.phone_country}
            onChange={(e) => setForm((f) => ({ ...f, phone_country: e.target.value }))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          >
            {options.map(({ code, name }) => (
              <option key={code} value={code}>
                {flag(code)} {name} +{DIAL_CODES[code]}
              </option>
            ))}
          </select>
        </div>
        <input
          id="checkout-phone"
          data-testid="checkout-phone"
          className={`${inputCls} min-w-0 flex-1`}
          type="tel"
          autoComplete="tel-national"
          required
          placeholder="777 123 456"
          value={form.phone}
          onChange={(e) => {
            const value = e.target.value;
            setForm((f) => ({ ...f, ...(splitPhone(value) || { phone: value }) }));
          }}
        />
      </div>
    </div>
  );
}

// Street field with address suggestions; picking one fills in the street, number, city and postal code.
function AddressField({ label, placeholder, country, value, onType, onPick }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const seq = useRef(0);
  const input = useRef(null);

  const close = () => {
    clearTimeout(timer.current);
    seq.current++;
    setItems([]);
    setActive(-1);
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(close, [country]);

  const onChange = (e) => {
    const q = e.target.value;
    onType(q);
    clearTimeout(timer.current);
    const mine = ++seq.current;
    if (q.trim().length < 3) {
      setItems([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await axios.get(`${API}/checkout/address-suggest`, { params: { q, country } });
        // Browser autofill also fires onChange; don't open a list on a field the buyer isn't in.
        if (mine !== seq.current || document.activeElement !== input.current) return;
        setItems(r.data.items);
        setActive(-1);
      } catch {
        if (mine === seq.current) setItems([]);
      }
    }, 250);
  };

  const pick = (item) => {
    close();
    onPick(item);
  };

  const onKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + items.length + (a < 0 && step < 0 ? 1 : 0)) % items.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <div className="relative sm:col-span-2">
      <label htmlFor="checkout-address1" className={labelCls}>
        {label}
      </label>
      <input
        ref={input}
        id="checkout-address1"
        data-testid="checkout-address1"
        className={inputCls}
        autoComplete="address-line1"
        required
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls="checkout-address-list"
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={close}
      />
      {items.length > 0 && (
        <ul id="checkout-address-list" role="listbox" className="absolute top-full right-0 left-0 z-30 border-2 border-t-0 border-black bg-white" data-testid="checkout-address-list">
          {items.map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              role="option"
              aria-selected={i === active}
              // Keep focus in the input so its blur doesn't close the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-start gap-2 px-3 py-3 text-sm ${i === active ? "bg-[#FFE600]" : ""}`}
              data-testid="checkout-address-option"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">
                <strong className="block font-semibold">{item.address1}</strong>
                <span className="block text-xs text-zinc-600">{[item.zip, item.city].filter(Boolean).join(" ")}</span>
              </span>
            </li>
          ))}
          <li role="presentation" className="px-3 py-1.5 text-right font-mono text-[9px] tracking-[0.15em] text-zinc-400">
            MAPY.COM
          </li>
        </ul>
      )}
    </div>
  );
}

function Field({ id, label, className = "", ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input id={id} data-testid={id} className={inputCls} {...props} />
    </div>
  );
}

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const c = t.checkout;
  const { cart, currency } = useCart();
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => {
    const country = currency === "EUR" ? "SK" : "CZ";
    const empty = { email: "", phone: "", phone_country: country, first_name: "", last_name: "", address1: "", address2: "", city: "", zip: "", country };
    try {
      const stored = { ...empty, ...JSON.parse(sessionStorage.getItem(FORM_KEY) || "{}") };
      return { ...stored, ...splitPhone(stored.phone) };
    } catch {
      return empty;
    }
  });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [noShipping, setNoShipping] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [paying, setPaying] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const quoteSeq = useRef(0);

  // DPD's map runs in an iframe and posts the chosen box (or a close event) back to this window.
  useEffect(() => {
    if (!mapOpen) return;
    const onMessage = (e) => {
      if (e.origin !== new URL(DPD_WIDGET).origin || !e.data?.dpdWidget) return;
      const w = e.data.dpdWidget;
      if (w.id && w.location?.address) {
        const a = w.location.address;
        setPickup({ id: w.id, name: w.name || "", street: a.street || "", zip: a.zip || "", city: a.city || "", country: (a.country || "").toUpperCase() });
      }
      setMapOpen(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mapOpen]);

  useEffect(() => {
    if (pickup && pickup.country && pickup.country !== form.country) setPickup(null);
  }, [form.country]); // eslint-disable-line react-hooks/exhaustive-deps

  const countryNames = useMemo(() => regionNames(lang, COUNTRIES), [lang]);

  useEffect(() => {
    if (params.get("cancelled")) toast(c.cancelled);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // The phone code follows the delivery country until a number has been typed.
  const setCountry = (e) => {
    const country = e.target.value;
    setForm((f) => ({ ...f, country, phone_country: f.phone.trim() ? f.phone_country : country }));
  };

  // Shipping rates come from Shopify for the typed address; re-quote when the address (or cart) changes.
  const addressReady = form.address1.trim() && form.city.trim() && form.zip.trim() && form.country;
  const cartKey = cart ? `${cart.id}|${cart.totalQuantity}|${cart.total?.amount}` : "";
  useEffect(() => {
    if (!cart || !addressReady) return;
    const seq = ++quoteSeq.current;
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const r = await axios.post(`${API}/checkout/shipping`, {
          cart_id: cart.id,
          email: form.email.trim() || null,
          first_name: form.first_name,
          last_name: form.last_name,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          zip: form.zip,
          country: form.country,
        });
        if (seq !== quoteSeq.current) return;
        setQuote(r.data);
        setNoShipping(r.data.options.length === 0);
        setDelivery((d) => (r.data.options.some((o) => o.handle === d) ? d : r.data.options[0]?.handle || null));
      } catch {
        if (seq === quoteSeq.current) {
          setQuote(null);
          setNoShipping(true);
        }
      } finally {
        if (seq === quoteSeq.current) setQuoting(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [cartKey, addressReady, form.address1, form.address2, form.city, form.zip, form.country]); // eslint-disable-line react-hooks/exhaustive-deps

  const money = (amount) => formatPrice({ amount, currencyCode: quote?.currency || cart?.subtotal?.currencyCode }, lang);
  const selected = quote?.options.find((o) => o.handle === delivery);
  // A delivery country in another market (e.g. CZK cart → Slovakia) reprices the cart, so prefer the quoted lines.
  const summaryLines = quote
    ? quote.lines.map((l) => ({ ...l, key: l.variantId }))
    : (cart?.lines || []).map((l) => ({ ...l, key: l.id, price: l.price.amount }));
  const itemsTotal = quote ? quote.itemsTotal : summaryLines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = quote ? quote.discount : Math.max(0, itemsTotal - (cart?.total?.amount || itemsTotal));
  // The quote's total includes Shopify's preselected option, so swap in the chosen one for the preview.
  const total = quote ? quote.total - (quote.shipping?.amount || 0) + (selected?.amount || 0) : itemsTotal - discount;

  const submit = async (e) => {
    e.preventDefault();
    if (paying || !delivery) return;
    if (selected?.pickup && !pickup) {
      setMapOpen(true);
      return;
    }
    setPaying(true);
    try {
      const { phone_country, ...address } = form;
      const r = await axios.post(`${API}/checkout/start`, {
        cart_id: cart.id,
        ...address,
        phone: fullPhone(form),
        delivery_handle: delivery,
        pickup_point: selected?.pickup ? pickup : null,
        lang,
      });
      window.location.href = r.data.redirectUrl;
    } catch (err) {
      const code = err?.response?.data?.detail;
      if (code === "pickup_point_required" || code === "pickup_point_country") setPickup(null);
      toast.error(
        code === "item_unavailable"
          ? c.soldOut
          : code === "payments_not_configured" || code === "payment_unavailable"
            ? c.unavailable
            : code === "pickup_point_required" || code === "pickup_point_country"
              ? c.boxRequired
              : c.error
      );
      setPaying(false);
    }
  };

  const hasStoredCart = !!localStorage.getItem("wino_cart_id");
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 pt-24 pb-16" data-testid="checkout-empty">
        {!cart && hasStoredCart ? (
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        ) : (
          <>
            <p className="font-mono text-xs font-bold tracking-[0.25em] text-zinc-500">{c.empty}</p>
            <Link to="/collection" className="bg-[#0D0D0D] px-8 py-4 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors hover:bg-[#FFE600] hover:text-black">
              {c.backToShop}
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pt-28 pb-20 sm:px-8" data-testid="checkout-page">
      <h1 className="font-display mb-10 text-4xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-6xl">{c.title}</h1>
      <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-16">
        <form onSubmit={submit} className="flex flex-col gap-10" data-testid="checkout-form">
          <section>
            <p className="mb-5 font-mono text-xs font-bold tracking-[0.25em]">{c.contact}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field id="checkout-email" label={c.email} type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
              <PhoneField label={c.phone} codeLabel={c.phoneCode} lang={lang} form={form} setForm={setForm} />
            </div>
          </section>

          <section>
            <p className="mb-5 font-mono text-xs font-bold tracking-[0.25em]">{c.delivery}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field id="checkout-first-name" label={c.firstName} autoComplete="given-name" required value={form.first_name} onChange={set("first_name")} />
              <Field id="checkout-last-name" label={c.lastName} autoComplete="family-name" required value={form.last_name} onChange={set("last_name")} />
              <div className="sm:col-span-2">
                <label htmlFor="checkout-country" className={labelCls}>
                  {c.country}
                </label>
                <select id="checkout-country" data-testid="checkout-country" autoComplete="country" value={form.country} onChange={setCountry} className={`${inputCls} cursor-pointer`}>
                  {countryNames.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <AddressField
                label={c.address1}
                placeholder={c.addressPlaceholder}
                country={form.country}
                value={form.address1}
                onType={(address1) => setForm((f) => ({ ...f, address1 }))}
                onPick={({ address1, city, zip }) => setForm((f) => ({ ...f, address1, city, zip }))}
              />
              <Field id="checkout-address2" className="sm:col-span-2" label={c.address2} autoComplete="address-line2" value={form.address2} onChange={set("address2")} />
              <Field id="checkout-city" label={c.city} autoComplete="address-level2" required value={form.city} onChange={set("city")} />
              <Field id="checkout-zip" label={c.zip} autoComplete="postal-code" required value={form.zip} onChange={set("zip")} />
            </div>
          </section>

          <section data-testid="checkout-shipping">
            <p className="mb-5 flex items-center gap-2 font-mono text-xs font-bold tracking-[0.25em]">
              {c.shipping}
              {quoting && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
            </p>
            {!addressReady || (!quote && !noShipping) ? (
              <p className="text-sm text-zinc-500">{c.shippingHint}</p>
            ) : noShipping ? (
              <p className="text-sm text-red-600" role="alert">{c.shippingNone}</p>
            ) : (
              <div className="flex flex-col gap-2" role="radiogroup">
                {quote.options.map((o) => (
                  <div key={o.handle} className={`border-2 transition-colors ${delivery === o.handle ? "border-black" : "border-zinc-200 hover:border-zinc-400"}`}>
                    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4" data-testid="checkout-shipping-option">
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value={o.handle}
                          checked={delivery === o.handle}
                          onChange={() => {
                            setDelivery(o.handle);
                            if (o.pickup && !pickup) setMapOpen(true);
                          }}
                          className="h-4 w-4 accent-black"
                        />
                        <span className="text-sm font-semibold">{o.title}</span>
                      </span>
                      <span className="text-sm font-bold">{o.amount ? money(o.amount) : c.free}</span>
                    </label>
                    {o.pickup && delivery === o.handle && (
                      <div className="flex items-center justify-between gap-4 border-t border-zinc-200 px-4 py-3" data-testid="checkout-pickup">
                        {pickup ? (
                          <p className="flex min-w-0 items-start gap-2 text-xs">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                              <strong className="block">{pickup.name}</strong>
                              {pickup.street}, {pickup.zip} {pickup.city}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500">{c.boxHint}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => setMapOpen(true)}
                          data-testid="checkout-pickup-button"
                          className="shrink-0 border border-black px-3 py-2 font-mono text-[10px] font-bold tracking-[0.2em] transition-colors hover:bg-black hover:text-[#FFE600]"
                        >
                          {pickup ? c.boxChange : c.boxChoose}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={paying || quoting || !selected}
              data-testid="checkout-pay-button"
              className="flex w-full items-center justify-center gap-3 bg-[#0D0D0D] px-4 py-5 font-mono text-xs leading-relaxed font-bold tracking-[0.25em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#0D0D0D] disabled:hover:text-white"
            >
              {paying ? c.paying : selected?.pickup && !pickup ? c.boxChoose : `${c.pay} ${money(total)}`}
              <Lock className="h-3.5 w-3.5" />
            </motion.button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-balance text-zinc-500">
              {c.agree}{" "}
              <Link to="/legal/terms" className="underline underline-offset-2 hover:text-black">{c.terms}</Link> {c.and}{" "}
              <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-black">{c.privacy}</Link>. {c.secure}
            </p>
          </div>
        </form>

        <aside className="h-fit bg-[#F4F4F0] p-6 lg:sticky lg:top-28" data-testid="checkout-summary">
          <p className="mb-5 font-mono text-xs font-bold tracking-[0.25em]">{c.summary}</p>
          <ul className="divide-y divide-zinc-200">
            {summaryLines.map((l) => (
              <li key={l.key} className="flex gap-4 py-3">
                <div className="relative h-16 w-12 shrink-0 bg-white">
                  {l.image && <img src={l.image} alt={l.productTitle} className="h-full w-full object-cover" />}
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center bg-black px-1 font-mono text-[10px] font-bold text-white">{l.quantity}</span>
                </div>
                <div className="flex flex-1 items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold tracking-tight uppercase">{l.productTitle}</p>
                    {l.variantTitle && l.variantTitle !== "Default Title" && <p className="mt-0.5 text-xs text-zinc-500">{l.variantTitle}</p>}
                  </div>
                  <p className="text-[13px] font-semibold whitespace-nowrap">{money(l.price * l.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-zinc-300 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="font-mono text-[11px] tracking-[0.2em] text-zinc-500">{c.subtotal}</dt>
              <dd>{money(itemsTotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt className="font-mono text-[11px] tracking-[0.2em] text-zinc-500">{c.discount}</dt>
                <dd>−{money(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="font-mono text-[11px] tracking-[0.2em] text-zinc-500">{c.shippingCost}</dt>
              <dd>{selected ? (selected.amount ? money(selected.amount) : c.free) : "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-zinc-300 pt-3">
              <dt className="font-mono text-xs font-bold tracking-[0.2em]">{c.total}</dt>
              <dd className="text-xl font-extrabold" data-testid="checkout-total">{money(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {mapOpen &&
        createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 sm:p-6" data-lenis-prevent data-testid="checkout-pickup-map">
          <div className="relative flex h-full w-full max-w-5xl flex-col bg-white sm:h-[85vh]">
            <div className="flex items-center justify-between bg-[#0D0D0D] px-5 py-3 text-[#FAF9F6]">
              <p className="font-mono text-xs font-bold tracking-[0.25em]">{c.boxChoose}</p>
              <button type="button" onClick={() => setMapOpen(false)} className="p-1 hover:text-[#FFE600]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="DPD Pickup"
              src={`${DPD_WIDGET}?hideCloseButton=true&countries=${form.country}&enabledCountries=${form.country}${lang === "cz" ? "" : "&lang=en"}`}
              allow="geolocation"
              className="w-full flex-1 border-0"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
