import Link from "next/link"
import { LandmarkIcon } from "lucide-react"

export const metadata = { title: "Terms of Service — Anchor" }

export default function TermsPage() {
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: January 1, 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-base font-semibold">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By creating an account with Anchor (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), accessing our website, or using our mobile
              or web applications (collectively, the &ldquo;Services&rdquo;), you agree to be bound by these Terms of Service
              (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not access or use the Services. We may amend
              these Terms at any time by posting a revised version. Your continued use of the Services after any
              such change constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">2. Eligibility</h2>
            <p className="mt-2">
              You must be at least 18 years old and a legal resident of a jurisdiction in which our Services are
              offered to open an account. By opening an account, you represent and warrant that you meet these
              eligibility requirements and that all information you provide to us is accurate, current, and
              complete.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">3. Account Registration and Security</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. You agree to notify us immediately of any unauthorized
              use of your account or any other breach of security. We are not liable for any loss or damage
              arising from your failure to comply with this section.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">4. Deposits, Withdrawals, and Transfers</h2>
            <p className="mt-2">
              All deposits are subject to verification and our standard funds availability policy. We reserve the
              right to place holds on deposits, delay processing of transactions, or decline any transaction at
              our sole discretion, including where we suspect fraud, error, or a violation of these Terms.
              Transfers between accounts, whether internal or to third parties, are processed on a best-efforts
              basis and are not guaranteed to complete instantaneously.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">5. Fees</h2>
            <p className="mt-2">
              We may charge fees for certain Services, including but not limited to overdrafts, insufficient
              funds, wire transfers, and card replacement. A current schedule of fees will be made available to
              you and may be updated from time to time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">6. Prohibited Uses</h2>
            <p className="mt-2">
              You agree not to use the Services for any unlawful purpose, including but not limited to money
              laundering, financing of terrorism, fraud, or any activity that violates applicable local, state,
              federal, or international law. We reserve the right to suspend or terminate your account immediately
              if we reasonably believe you have violated this section.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">7. Limitation of Liability</h2>
            <p className="mt-2">
              To the fullest extent permitted by law, Anchor and its officers, employees, and affiliates shall not
              be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits or revenues, whether incurred directly or indirectly, arising from your use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">8. Account Closure</h2>
            <p className="mt-2">
              You may close your account at any time by contacting us, subject to settlement of any outstanding
              balances or obligations. We reserve the right to suspend or close your account at our discretion,
              with or without notice, where required by law or where we believe it necessary to protect the
              integrity of our Services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">9. Governing Law</h2>
            <p className="mt-2">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in
              which Anchor is chartered or licensed to operate, without regard to its conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">10. Contact</h2>
            <p className="mt-2">
              If you have any questions about these Terms, please contact us through the support options
              available in your account settings.
            </p>
          </section>

          <p className="pt-4 text-xs text-muted-foreground">
            This is placeholder legal text for demonstration purposes and does not constitute a binding legal
            agreement. Consult a qualified attorney before using this or similar language in a production
            financial product.
          </p>
        </div>
      </main>
    </div>
  )
}
