const Security = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Security Overview</h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: {new Date().getFullYear()}
        </p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Our approach</h2>
            <p>
              SimpliBooks is built for SMEs that rely on accurate financial data.
              Protecting that data is a core part of how we design and operate the
              platform. This page explains, in plain language, the controls we use
              to help keep your information safe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Data in transit and at rest</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>All connections to SimpliBooks use HTTPS (TLS) encryption.</li>
              <li>
                Your data is stored in managed databases on secure cloud
                infrastructure.
              </li>
              <li>
                Regular backups are taken to help protect against accidental data
                loss.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Access control</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Access to company data inside SimpliBooks is controlled by user
                roles (for example admin, accountant, viewer).
              </li>
              <li>
                Administrative access to our infrastructure is restricted to a
                small number of authorised personnel and is logged.
              </li>
              <li>
                We encourage customers to use unique logins for each team member
                rather than sharing accounts.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Application security</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>We apply security fixes and updates to our platform regularly.</li>
              <li>
                Changes to production systems follow a review and testing process
                before deployment.
              </li>
              <li>
                We monitor logs and metrics for unusual behaviour that may indicate
                abuse or misuse of the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Your responsibilities</h2>
            <p className="mb-2">
              Security is a shared responsibility. To help keep your account safe,
              please:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use strong, unique passwords for each user.</li>
              <li>Limit access to sensitive data to staff who genuinely need it.</li>
              <li>Keep your devices and browsers up to date with security patches.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Reporting a concern</h2>
            <p>
              If you believe your account has been compromised or you discover a
              potential security issue, please contact us immediately at{' '}
              <a
                href="mailto:enquiries@simplibooks.org"
                className="text-primary-700 underline"
              >
                enquiries@simplibooks.org
              </a>
              . We will investigate and respond as quickly as we reasonably can.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Security

