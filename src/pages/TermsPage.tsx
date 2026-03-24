export default function TermsPage() {
  return (
    <div data-feature="NFSTAY__TERMS" className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-2">nfstay Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using the nfstay platform ("Platform"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you must not use the Platform. These Terms apply to all users, including guests, property operators, and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              nfstay is a vacation rental booking platform that connects guests with property operators. The Platform enables operators to list their properties and guests to search, view, and book short-term accommodation. nfstay acts as an intermediary marketplace and is not itself a property operator, landlord, or accommodation provider.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To use certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Bookings</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you make a reservation through the Platform, you enter into a direct agreement with the property operator. nfstay facilitates the booking process but is not a party to the rental agreement between guest and operator. All pricing displayed on the Platform is set by the operator and may include service fees, cleaning fees, and applicable taxes. Cancellation policies are set by individual operators and will be displayed before you confirm your booking. Please review the cancellation policy carefully before completing your reservation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Operator Responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Operators are responsible for ensuring that their property listings are accurate, up to date, and not misleading. Operators must maintain their properties to a reasonable standard of cleanliness, safety, and habitability. Operators must comply with all applicable local laws, regulations, and licensing requirements related to short-term rental accommodation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Guest Responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Guests must treat the property with reasonable care and respect during their stay. Guests must comply with any house rules set by the operator. Guests must provide accurate information about the number of guests staying and must not exceed the maximum occupancy stated in the listing. Guests are liable for any damage caused to the property during their stay.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Payments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payments are processed securely through Stripe, our third-party payment processor. All transactions are conducted in the currency displayed at the time of booking. Refunds are subject to the cancellation policy of the individual listing. nfstay may charge a service fee for facilitating bookings, which will be clearly displayed before payment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Platform, including its design, code, content, logos, and trademarks, is owned by nfstay and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the Platform without our prior written consent. By uploading content to the Platform (such as property photos or descriptions), you grant nfstay a non-exclusive, worldwide, royalty-free licence to use, display, and distribute that content in connection with the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              nfstay operates as a marketplace and does not own, manage, or control any of the properties listed on the Platform. We are not responsible for the condition, safety, legality, or suitability of any property. We are not liable for any loss, damage, or injury arising from your use of the Platform or from any booking made through the Platform, except where such liability cannot be excluded by law. Our total liability to you in any event shall not exceed the total fees paid by you to nfstay in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your use of the Platform is also governed by our{" "}
              <a href="/privacy" className="text-primary underline">Privacy Policy</a>, which explains how we collect, use, and protect your personal information. By using the Platform, you consent to the practices described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Modifications</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to update or modify these Terms at any time. Changes will be effective when posted on the Platform. Your continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@nfstay.com" className="text-primary underline">legal@nfstay.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
