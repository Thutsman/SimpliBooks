const Privacy = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: {new Date().getFullYear()}
        </p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Who we are</h2>
            <p>
              SimpliBooks is cloud-based accounting software designed for small and
              medium businesses. We help you capture transactions, manage payroll and
              inventory, and generate financial reports in a secure environment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Information we collect</h2>
            <p className="mb-2">
              We collect and process information so that we can provide and improve
              the SimpliBooks service, including:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Account information such as your name, email address, and password.</li>
              <li>
                Company profile information such as legal name, registration details,
                contact details, and tax numbers.
              </li>
              <li>
                Transaction data that you choose to capture in the product, such as
                invoices, purchases, payroll runs, and bank reconciliations.
              </li>
              <li>
                Usage information such as log-in activity, device type, browser
                information, and basic analytics.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. How we use your information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Provide, operate and maintain the SimpliBooks application.</li>
              <li>
                Communicate with you about your account, product updates, billing and
                support.
              </li>
              <li>
                Improve our product by understanding how features are used and where
                we can simplify workflows.
              </li>
              <li>
                Comply with legal obligations, including record-keeping and security
                requirements.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data storage and security</h2>
            <p className="mb-2">
              Your data is stored in secure cloud infrastructure and is protected by
              technical and organisational measures aligned with industry best
              practices. These include:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Encrypted connections (HTTPS) for all traffic to and from our app.</li>
              <li>Access controls based on user roles within your company.</li>
              <li>
                Regular monitoring of our platform for unusual or suspicious activity.
              </li>
            </ul>
            <p className="mt-2">
              While we take security seriously, no online system can be guaranteed to
              be 100% secure. You are responsible for keeping your password and login
              details safe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Sharing your data</h2>
            <p className="mb-2">
              We do not sell your personal or company data. We may share limited
              information with:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Service providers that help us run SimpliBooks (for example, hosting,
                email delivery or payment processing), subject to appropriate data
                protection agreements.
              </li>
              <li>
                Authorities or regulators if we are legally required to do so or to
                protect our rights and the rights of others.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Your rights</h2>
            <p className="mb-2">
              Depending on your location, you may have rights to access, correct or
              delete certain personal information that we hold about you. You can
              usually do this directly in the app by updating your profile or company
              information, or you can contact us for help.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Contact us</h2>
            <p>
              If you have any questions about this Privacy Policy or how we handle
              your data, please contact us at{' '}
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

export default Privacy

