import { useLanguage } from "@/i18n";

function MarqueeRow({ items, ariaHidden }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-mono text-xs font-bold tracking-[0.25em] text-zinc-100 sm:text-sm">
            {item}
          </span>
          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#FFE600]" />
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  const { t } = useLanguage();
  return (
    <div data-testid="brand-marquee" className="overflow-hidden border-y border-black bg-[#0D0D0D] py-3.5">
      <div className="animate-marquee-right flex w-max">
        <MarqueeRow items={t.marquee} ariaHidden={false} />
        <MarqueeRow items={t.marquee} ariaHidden={true} />
      </div>
    </div>
  );
}
