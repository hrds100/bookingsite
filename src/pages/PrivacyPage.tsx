import { NfsLogo } from "@/components/nfs/NfsLogo";

export default function PrivacyPage() {
  return (
    <div data-feature="NFSTAY__PRIVACY" className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-8"><NfsLogo /></div>
        <h1 className="text-3xl font-bold text-foreground mb-2">nfstay Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect the following types of personal information when you use the nfstay platform:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Name, email address, and phone number (provided during registration)</li>
              <li>Payment information (processed securely by Stripe; we do not store card details)</li>
              <li>Booking history and reservation details</li>
              <li>Device information, IP address, and browser type</li>
              <li>Usage data such as pages visited, search queries, and interaction patterns</li>
              <li>Communications you send to us or through the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">We use your personal information to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Process and manage your bookings</li>
              <li>Create and maintain your account</li>
              <li>Communicate with you about reservations, updates, and support</li>
              <li>Send booking confirmations and reminders via email or WhatsApp</li>
              <li>Improve our Platform through analytics and usage insights</li>
              <li>Prevent fraud and maintain the security of the Platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Sharing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We share your personal information only in the following circumstances:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
              <li><strong>Property operators:</strong> When you make a booking, the operator receives your name, email, phone number, and booking details to fulfil your reservation.</li>
              <li><strong>Payment processors:</strong> Stripe processes your payment securely. We do not store your full card details.</li>
              <li><strong>Service providers:</strong> We use trusted third-party services (hosting, email delivery, analytics) that process data on our behalf under strict data protection agreements.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, regulation, or legal process.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies and Tracking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to improve your experience on the Platform. These include:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
              <li><strong>Essential cookies:</strong> Required for the Platform to function (authentication, session management).</li>
              <li><strong>Analytics cookies:</strong> Help us understand how visitors use the Platform so we can improve it.</li>
              <li><strong>Preference cookies:</strong> Remember your settings such as currency and language preferences.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              You can manage cookie preferences through your browser settings. Disabling essential cookies may affect Platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide our services. If you request account deletion, we will delete your personal data within 30 days, except where we are required to retain it for legal, regulatory, or legitimate business purposes (such as fraud prevention or financial record-keeping).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights (GDPR)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Under the General Data Protection Regulation (GDPR), you have the following rights:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
              <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Right to erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong>Right to data portability:</strong> Request a machine-readable copy of your data.</li>
              <li><strong>Right to object:</strong> Object to processing of your data for certain purposes, including direct marketing.</li>
              <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@nfstay.com" className="text-primary underline">privacy@nfstay.com</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We take appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. This includes encryption of data in transit and at rest, secure server infrastructure, and regular security reviews. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Platform is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a person under 18, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Your continued use of the Platform after changes are posted constitutes your acceptance of the revised policy. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <ul className="list-none mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Email: <a href="mailto:privacy@nfstay.com" className="text-primary underline">privacy@nfstay.com</a></li>
              <li>nfstay, United Kingdom</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
