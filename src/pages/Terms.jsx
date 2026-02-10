const Terms = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: {new Date().getFullYear()}
        </p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
            <p>
              These Terms of Use govern your access to and use of the SimpliBooks
              accounting application and related services. By creating an account or
              using the product, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Your account</h2>
            <p className="mb-2">
              You are responsible for maintaining the confidentiality of your login
              credentials and for all activity that occurs under your account.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use a strong, unique password and keep it secure.</li>
              <li>Notify us promptly if you suspect unauthorised access.</li>
              <li>
                Ensure that your contact and company details are accurate and kept
                up to date.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Acceptable use</h2>
            <p className="mb-2">
              You agree not to misuse SimpliBooks. In particular, you will not:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the service for any unlawful, fraudulent or harmful purpose.</li>
              <li>
                Attempt to gain unauthorised access to the platform or interfere
                with its normal operation.
              </li>
              <li>
                Reverse engineer, decompile or otherwise attempt to derive the
                source code of the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Billing and subscriptions</h2>
            <p className="mb-2">
              SimpliBooks is offered on a subscription basis. Specific pricing and
              billing terms are shown in the product at the time you subscribe.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Fees are typically billed monthly or annually in advance.</li>
              <li>
                You may cancel your subscription at any time; access will continue
                until the end of the current billing period.
              </li>
              <li>
                We may update pricing from time to time, and will notify you in
                advance where required.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data ownership</h2>
            <p>
              You retain ownership of the financial and business data you capture
              in SimpliBooks. We do not claim ownership of your underlying business
              records. You grant us a limited licence to process this data solely to
              provide and improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Disclaimers</h2>
            <p>
              SimpliBooks is a tool to assist with bookkeeping and reporting. It
              does not constitute legal, tax or accounting advice. You should
              consult a qualified professional for guidance specific to your
              business and jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Termination</h2>
            <p>
              We may suspend or terminate your access to SimpliBooks if you breach
              these Terms of Use or if required by law. Where reasonable, we will
              provide notice and an opportunity to resolve the issue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{' '}
              <a
                href="mailto:enquiries@simplibooks.org"
                className="text-primary-700 underline"
              >
                enquiries@simplibooks.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Terms

