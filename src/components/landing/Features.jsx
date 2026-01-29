import {
  FileText,
  Package,
  Wallet,
  Globe,
  ShieldCheck,
  TrendingUp,
  Clock,
  LayoutDashboard
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Professional Accounting',
    description:
      'Full double-entry engine. Generate General Ledger, Trial Balance, and SARS-compliant VAT 201 reports instantly.',
  },
  {
    icon: Package,
    title: 'Smart Inventory',
    description:
      'Track stock levels in real-time. Automated COGS calculations, FIFO valuation, and low-stock alerts to keep you selling.',
  },
  {
    icon: Wallet,
    title: 'Integrated Payroll',
    description:
      'Pay your team with ease. Automated PAYE, UIF, and SDL calculations with digital payslips and IRP5 generation.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency & SADC',
    description:
      'Built for South Africa, Botswana, and Zimbabwe. Manage ZAR, USD, and BWP with automated forex gain/loss tracking.',
  },
  {
    icon: Clock,
    title: 'Bank Reconciliation',
    description:
      'Connect your bank and reconcile in minutes. Intelligent matching rules learn your business patterns to save you time.',
  },
  {
    icon: LayoutDashboard,
    title: 'Enterprise Controls',
    description:
      'Full audit trails, customizable user roles, and advanced data exports. Secure, scalable management for growing teams.',
  },
]

const Features = () => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent-400 font-semibold text-sm uppercase tracking-wider">
            Features
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Everything You Need to Run Your Business
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Powerful tools designed specifically for small and medium businesses.
            No accounting degree required.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-accent-500 hover:bg-slate-800 transition-all duration-300 backdrop-blur-sm"
              >
                <div className="w-12 h-12 bg-accent-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-600 transition-colors duration-300">
                  <Icon className="w-6 h-6 text-accent-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Features
