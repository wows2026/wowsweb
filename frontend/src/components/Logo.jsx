export default function Logo({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M3 6 L10 27 L16 11 L22 27 L29 6"
        stroke="#0D0D0D"
        strokeWidth="3.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="24" y="3" width="6" height="6" fill="#FFE600" />
    </svg>
  );
}
