import Link from "next/link"
import { LandmarkIcon } from "lucide-react"

export const metadata = { title: "Privacy Policy — Anchor" }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LandmarkIcon className="size-4" />
          </div>
          <Link href="/" className="font-display text-sm font-semibold">Anchor</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: January 1, 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-base font-semibold">1. Information We Collect</h2>
            <p className="mt-2">
              We collect information you provide directly to us, such as your name, date of birth, address, email,
              phone number, and government-issued identification when you open an account. We also collect
              information automatically when you use our Services, including device information, IP address,
              browser type, and usage data such as login activity and transaction history.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">2. How We Use Your Information</h2>
            <p className="mt-2">
              We use the information we collect to: provide, maintain, and improve the Services; process
              transactions and send related information; verify your identity and prevent fraud; comply with
              legal and regulatory obligations, including know-your-customer (KYC) and anti-money-laundering (AML)
              requirements; communicate with you about your account, security alerts, and support requests; and
              analyze usage trends to improve our product.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">3. Information Sharing</h2>
            <p className="mt-2">
              We do not sell your personal information. We may share your information with: service providers who
              perform functions on our behalf (such as identity verification, hosting, and customer support);
              regulators, law enforcement, or other parties as required by law or legal process; and other
              financial institutions as necessary to process transactions you initiate, such as transfers to
              external accounts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">4. Data Security</h2>
            <p className="mt-2">
              We implement administrative, technical, and physical safeguards designed to protect your personal
              information from unauthorized access, disclosure, alteration, and destruction. Passwords are stored
              using industry-standard hashing algorithms and are never stored or transmitted in plain text.
              However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">5. Data Retention</h2>
            <p className="mt-2">
              We retain your personal information for as long as your account is active or as needed to provide
              you Services, comply with our legal obligations (including regulatory record-keeping requirements
              for financial institutions), resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">6. Your Rights and Choices</h2>
            <p className="mt-2">
              Depending on your jurisdiction, you may have the right to access, correct, or request deletion of
              your personal information, or to object to or restrict certain processing. You may update most of
              your account information directly in your account settings, or contact us to exercise other
              applicable rights.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">7. Cookies and Tracking</h2>
            <p className="mt-2">
              We use cookies and similar technologies to keep you signed in, remember your preferences, and
              understand how you use our Services. You can control cookies through your browser settings, though
              disabling them may affect the functionality of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">8. Children&apos;s Privacy</h2>
            <p className="mt-2">
              Our Services are not directed to individuals under the age of 18, and we do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">9. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              posting the updated policy on this page and revising the &ldquo;Last updated&rdquo; date above.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">10. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or our data practices, please contact us through the
              support options available in your account settings.
            </p>
          </section>

          <p className="pt-4 text-xs text-muted-foreground">
            This is placeholder legal text for demonstration purposes and does not constitute a binding legal
            agreement or an accurate description of actual data practices. Consult a qualified attorney and
            privacy professional before using this or similar language in a production financial product.
          </p>
        </div>
      </main>
    </div>
  )
}
