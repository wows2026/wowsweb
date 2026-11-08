
function MarqueeRow({ ariaHidden }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="font-display flex items-center text-lg font-extrabold tracking-tight whitespace-nowrap text-black uppercase sm:text-2xl">
          FIRST DROP ORIGIN STORY OUT NOW
          <img src="/logo-mark-black.png" alt="" draggable="false" className="mx-8 h-7 w-auto sm:mx-14 sm:h-9" />
          LIMITED STOCK
          <img src="/logo-mark-black.png" alt="" draggable="false" className="mx-8 h-7 w-auto sm:mx-14 sm:h-9" />
        </span>
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
