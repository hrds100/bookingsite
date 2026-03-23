import { Link } from "react-router-dom";
import { NfsLogo } from "./NfsLogo";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

export function NfsMainFooter() {
  const { operator, isWhiteLabel } = useWhiteLabel();

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            {isWhiteLabel && operator ? (
              <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
                {operator.logo_url ? (
                  <img src={operator.logo_url} alt={operator.brand_name} className="h-7 w-auto" />
                ) : (
                  <span>{operator.brand_name}</span>
                )}
              </Link>
            ) : (
              <NfsLogo className="mb-3" />
            )}
            <p className="text-sm text-muted-foreground mb-4">
              {isWhiteLabel && operator
                ? `Book your stay directly with ${operator.brand_name}. No middlemen, no hidden fees.`
                : "Book unique vacation rentals directly from verified hosts. No middlemen, no hidden fees."}
            </p>
            {!isWhiteLabel && (
              <div className="flex gap-3">
                {['Instagram', 'Twitter', 'Facebook', 'TikTok'].map((s) => (
                  <a key={s} href="#" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{s}</a>
                ))}
              </div>
            )}
            {isWhiteLabel && operator?.contact_email && (
              <p className="text-sm text-muted-foreground">
                <a href={`mailto:${operator.contact_email}`} className="hover:text-foreground transition-colors">
                  {operator.contact_email}
                </a>
              </p>
            )}
          </div>

          {/* For Operators — hidden on white-label */}
          {!isWhiteLabel && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">For Operators</h4>
              <ul className="space-y-2">
                <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">List your property</Link></li>
                <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign up</Link></li>
                <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
          )}

          {/* For Travelers */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {isWhiteLabel ? "Quick Links" : "For Travelers"}
            </h4>
            <ul className="space-y-2">
              <li><Link to="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Search properties</Link></li>
              <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How to book</a></li>
              {!isWhiteLabel && (
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Guest protection</a></li>
              )}
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of service</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {isWhiteLabel && operator
              ? `© 2026 ${operator.brand_name}. Powered by NFsTay.`
              : "© 2026 NFsTay. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}
