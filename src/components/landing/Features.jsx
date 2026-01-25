import {
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Building2,
  Shield,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Invoice Management',
    description:
      'Create professional invoices in seconds. Track payments, send reminders, and get paid faster with automated follow-ups.',
  },
  {
    icon: CreditCard,
    title: 'Expense Tracking',
    description:
      'Record purchases, categorize expenses, and keep your books organized. Import bank statements with a single click.',
  },
  {
    icon: BarChart3,
    title: 'Financial Reports',
    description:
      'Generate trial balance, VAT reports, and profit/loss statements instantly. Export to PDF or Excel anytime.',
  },
  {
    icon: Users,
    title: 'Client Management',
    description:
      'Store client details, track their invoices, and maintain relationships. Everything you need in one place.',
  },
  {
    icon: Building2,
    title: 'Multi-Company Support',
    description:
      'Manage multiple businesses from a single account. Switch between companies seamlessly with separate books.',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description:
      'Your data is encrypted and secured with industry-standard protocols. Regular backups ensure you never lose data.',
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
