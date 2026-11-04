import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/i18n";
import { API, useCart, formatPrice } from "@/shop";

// The Shopify store ships to the EU; country names come from the browser in the page language.
const COUNTRIES = ["CZ", "SK", "AT", "BE", "BG", "CY", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI"];
const FORM_KEY = "wino_checkout_form";

const labelCls = "mb-2 block font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500";
const inputCls =
  "w-full border-b-2 border-zinc-300 bg-transparent py-3 text-base outline-none transition-colors placeholder-zinc-400 focus:border-black sm:text-sm";

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
    const empty = { email: "", phone: "", first_name: "", last_name: "", address1: "", address2: "", city: "", zip: "", country: currency === "EUR" ? "SK" : "CZ" };
    try {
      return { ...empty, ...JSON.parse(sessionStorage.getItem(FORM_KEY) || "{}") };
    } catch {
      return empty;
    }
  });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [noShipping, setNoShipping] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [paying, setPaying] = useState(false);
  const quoteSeq = useRef(0);

  const countryNames = useMemo(() => {
    const dn = new Intl.DisplayNames([lang === "cz" ? "cs" : "en"], { type: "region" });
    return COUNTRIES.map((code) => ({ code, name: dn.of(code) })).sort((a, b) =>
      a.code === "CZ" ? -1 : b.code === "CZ" ? 1 : a.code === "SK" ? -1 : b.code === "SK" ? 1 : a.name.localeCompare(b.name)
    );
  }, [lang]);

  useEffect(() => {
    if (params.get("cancelled")) toast(c.cancelled);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

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
    setPaying(true);
    try {
      const r = await axios.post(`${API}/checkout/start`, { cart_id: cart.id, ...form, delivery_handle: delivery, lang });
      window.location.href = r.data.redirectUrl;
    } catch (err) {
      const code = err?.response?.data?.detail;
      toast.error(code === "item_unavailable" ? c.soldOut : code === "payments_not_configured" || code === "payment_unavailable" ? c.unavailable : c.error);
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
              <Field id="checkout-phone" label={c.phone} type="tel" autoComplete="tel" required placeholder="+420" value={form.phone} onChange={set("phone")} />
            </div>
          </section>

          <section>
            <p className="mb-5 font-mono text-xs font-bold tracking-[0.25em]">{c.delivery}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field id="checkout-first-name" label={c.firstName} autoComplete="given-name" required value={form.first_name} onChange={set("first_name")} />
              <Field id="checkout-last-name" label={c.lastName} autoComplete="family-name" required value={form.last_name} onChange={set("last_name")} />
              <Field id="checkout-address1" className="sm:col-span-2" label={c.address1} autoComplete="address-line1" required value={form.address1} onChange={set("address1")} />
              <Field id="checkout-address2" className="sm:col-span-2" label={c.address2} autoComplete="address-line2" value={form.address2} onChange={set("address2")} />
              <Field id="checkout-city" label={c.city} autoComplete="address-level2" required value={form.city} onChange={set("city")} />
              <Field id="checkout-zip" label={c.zip} autoComplete="postal-code" required value={form.zip} onChange={set("zip")} />
              <div className="sm:col-span-2">
                <label htmlFor="checkout-country" className={labelCls}>
                  {c.country}
                </label>
                <select id="checkout-country" data-testid="checkout-country" autoComplete="country" value={form.country} onChange={set("country")} className={`${inputCls} cursor-pointer`}>
                  {countryNames.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
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
                  <label
                    key={o.handle}
                    className={`flex cursor-pointer items-center justify-between gap-4 border-2 px-4 py-4 transition-colors ${delivery === o.handle ? "border-black" : "border-zinc-200 hover:border-zinc-400"}`}
                    data-testid="checkout-shipping-option"
                  >
                    <span className="flex items-center gap-3">
                      <input type="radio" name="delivery" value={o.handle} checked={delivery === o.handle} onChange={() => setDelivery(o.handle)} className="h-4 w-4 accent-black" />
                      <span className="text-sm font-semibold">{o.title}</span>
                    </span>
                    <span className="text-sm font-bold">{o.amount ? money(o.amount) : c.free}</span>
                  </label>
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
              className="flex w-full items-center justify-center gap-3 bg-[#0D0D0D] py-5 font-mono text-xs font-bold tracking-[0.25em] text-white transition-colors duration-300 hover:bg-[#FFE600] hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#0D0D0D] disabled:hover:text-white"
            >
              {paying ? c.paying : `${c.pay} ${money(total)}`}
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
    </div>
  );
}
