function MarqueeRow({ ariaHidden }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {Array.from({ length: 6 }).map((_, i) => (
        <img
          key={i}
          src="/logo-mark-black.png"
          alt="WINORWINS"
          className="h-10 w-auto px-10 sm:h-12"
          draggable="false"
        />
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div data-testid="brand-marquee" className="overflow-hidden border-y border-black bg-[#FFE600] py-5">
      <div className="animate-marquee-right flex w-max">
        <MarqueeRow ariaHidden={false} />
        <MarqueeRow ariaHidden={true} />
      </div>
    </div>
  );
}
