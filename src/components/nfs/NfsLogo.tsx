import { Link } from "react-router-dom";

export function NfsLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" data-feature="NFSTAY__LOGO" className={`flex items-center gap-[3px] no-underline ${className}`}>
      <span
        className="flex items-center justify-center font-bold leading-none"
        style={{
          width: 28,
          height: 28,
          border: '2px solid #0a0a0a',
          borderRadius: 6,
          fontFamily: "'Sora', sans-serif",
          fontSize: 12,
          color: '#0a0a0a',
        }}
      >
        nf
      </span>
      <span
        className="leading-none"
        style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 400,
          fontSize: 20,
          color: '#0a0a0a',
          letterSpacing: 1.5,
        }}
      >
        stay
      </span>
    </Link>
  );
}
