import { Link } from "react-router-dom";
import { NfsLogo } from "./NfsLogo";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { Phone, Mail, MessageCircle } from "lucide-react";

export function NfsMainFooter() {
  const { operator, isWhiteLabel } = useWhiteLabel();

  // Collect operator social links that exist
  const socialLinks = isWhiteLabel && operator
    ? [
        operator.social_instagram && { label: "Instagram", url: operator.social_instagram },
        operator.social_facebook && { label: "Facebook", url: operator.social_facebook },
        operator.social_twitter && { label: "Twitter", url: operator.social_twitter },
        operator.social_tiktok && { label: "TikTok", url: operator.social_tiktok },
        operator.social_youtube && { label: "YouTube", url: operator.social_youtube },
      ].filter(Boolean) as { label: string; url: string }[]
    : [];

  return (
    <footer data-feature="NFSTAY__FOOTER" className={isWhiteLabel ? "bg-gray-900 text-gray-300" : "bg-[#f0f3f7] mt-8"}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div data-feature="NFSTAY__FOOTER_ABOUT">
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
            {/* Social links — main site */}
            {!isWhiteLabel && (
              <div data-feature="NFSTAY__FOOTER_SOCIAL" className="flex gap-3">
                {['Instagram', 'Twitter', 'Facebook', 'TikTok'].map((s) => (
                  <a key={s} href="#" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">{s}</a>
                ))}
              </div>
            )}
            {/* Social links — white-label operator */}
            {isWhiteLabel && socialLinks.length > 0 && (
              <div data-feature="NFSTAY__FOOTER_SOCIAL" className="flex gap-3 mt-2">
                {socialLinks.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">{s.label}</a>
                ))}
              </div>
            )}
          </div>

          {/* For Operators -- main site only */}
          {!isWhiteLabel && (
            <div data-feature="NFSTAY__FOOTER_OPERATORS">
              <h4 className="text-sm font-semibold text-foreground mb-3">For Operators</h4>
              <ul className="space-y-2">
                <li><a href="https://hub.nfstay.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">List your property</a></li>
                <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">How it works</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
              </ul>
            </div>
          )}

          {/* Contact — white-label only */}
          {isWhiteLabel && operator && (operator.contact_email || operator.contact_phone || operator.contact_whatsapp) && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Contact</h4>
              <ul className="space-y-2">
                {operator.contact_email && (
                  <li>
                    <a href={`mailto:${operator.contact_email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      {operator.contact_email}
                    </a>
                  </li>
                )}
                {operator.contact_phone && (
                  <li>
                    <a href={`tel:${operator.contact_phone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      {operator.contact_phone}
                    </a>
                  </li>
                )}
                {operator.contact_whatsapp && (
                  <li>
                    <a href={`https://wa.me/${operator.contact_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* For Travelers / Quick Links */}
          <div data-feature="NFSTAY__FOOTER_TRAVELERS">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {isWhiteLabel ? "Quick Links" : "For Travelers"}
            </h4>
            <ul className="space-y-2">
              <li><Link to="/search" className="text-sm text-muted-foreground hover:text-primary transition-colors">Search properties</Link></li>
              <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">How to book</a></li>
              {!isWhiteLabel && (
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Guest protection</a></li>
              )}
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div data-feature="NFSTAY__FOOTER_LEGAL">
            <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of service</Link></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Cookie policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {isWhiteLabel && operator
              ? `© 2026 ${operator.brand_name}. Powered by nfstay.`
              : "© 2026 nfstay. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}
