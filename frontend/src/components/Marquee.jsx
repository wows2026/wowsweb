function MarqueeRow({ ariaHidden }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="flex items-center">
          <img
            src="/brand-logo-white.png"
            alt="WINORWINS"
            className="h-12 w-auto px-8 sm:h-14"
            draggable="false"
          />
          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#FFE600]" />
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div data-testid="brand-marquee" className="overflow-hidden border-y border-black bg-[#0D0D0D] py-5">
      <div className="animate-marquee-right flex w-max">
        <MarqueeRow ariaHidden={false} />
        <MarqueeRow ariaHidden={true} />
      </div>
    </div>
  );
}
