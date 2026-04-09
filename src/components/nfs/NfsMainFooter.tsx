import { Link } from "react-router-dom";
import { NfsLogo } from "./NfsLogo";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { Phone, Mail, MessageCircle } from "lucide-react";

/* Inline SVG social icons — matching hub.nfstay.com exactly */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
              <div data-feature="NFSTAY__FOOTER_SOCIAL" className="flex gap-2 mt-1">
                {[
                  { label: "Instagram", href: "https://instagram.com/nfstay", icon: <InstagramIcon className="w-3.5 h-3.5" /> },
                  { label: "Facebook",  href: "https://facebook.com/nfstay",  icon: <FacebookIcon  className="w-3.5 h-3.5" /> },
                  { label: "X",         href: "https://x.com/nfstay",         icon: <XIcon         className="w-3.5 h-3.5" /> },
                  { label: "LinkedIn",  href: "https://linkedin.com/company/nfstay", icon: <LinkedInIcon className="w-3.5 h-3.5" /> },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
            {/* Social links — white-label operator */}
            {isWhiteLabel && socialLinks.length > 0 && (
              <div data-feature="NFSTAY__FOOTER_SOCIAL" className="flex gap-2 mt-2">
                {socialLinks.map((s) => {
                  const icon =
                    s.label === "Instagram" ? <InstagramIcon className="w-3.5 h-3.5" /> :
                    s.label === "Facebook"  ? <FacebookIcon  className="w-3.5 h-3.5" /> :
                    s.label === "Twitter"   ? <XIcon         className="w-3.5 h-3.5" /> :
                    s.label === "TikTok"    ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" />
                      </svg>
                    ) :
                    s.label === "YouTube"   ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    ) :
                    <span className="text-[10px] font-bold">{s.label[0]}</span>;
                  return (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                    >
                      {icon}
                    </a>
                  );
                })}
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
