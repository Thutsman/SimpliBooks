import { UserPlus, Settings, LayoutDashboard, HeartHandshake } from 'lucide-react'

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Easy Onboarding',
    description:
      'Sign up and set up your business details in minutes. Our 6-step wizard configures everything for your region.',
  },
  {
    icon: LayoutDashboard,
    step: '02',
    title: 'Automate Transactions',
    description:
      'Create quotes, invoices, and purchase orders. Watch as the system auto-posts journal entries and updates inventory.',
  },
  {
    icon: HeartHandshake,
    step: '03',
    title: 'Scale & Comply',
    description:
      'Process payroll, reconcile bank statements, and generate SARS-ready reports. Focus on growth, we handle the compliance.',
  },
]

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-blue-50 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(148,163,184,0.15)_1px,transparent_0)] bg-[size:24px_24px]" />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">
            Lifecycle
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
            A Day in the Life with SimpliBooks
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Automate every part of your business from initial quote to final tax filing.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200" />

          {steps.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={item.step} className="relative">
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                    Step {item.step}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mt-4 mb-6">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
