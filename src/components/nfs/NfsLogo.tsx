import { Link } from "react-router-dom";

export function NfsLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-0 text-xl font-bold text-foreground ${className}`}>
      NFsTay
    </Link>
  );
}
