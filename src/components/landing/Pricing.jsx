import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import Button from '../ui/Button'

const plans = [
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    description: 'Perfect for freelancers and side hustlers',
    features: [
      '1 Company',
      'Full Accounting Engine',
      'VAT 201 Reports',
      '100 Invoices/month',
      'Email Support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$29',
    period: '/month',
    description: 'Ideal for growing small businesses',
    features: [
      '3 Companies',
      'Unlimited Invoices',
      'Inventory Management',
      'Bank Reconciliation',
      'Payroll (Up to 10 employees)',
      'Multi-Currency Support',
      'PDF/Excel Export',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Business',
    price: '$69',
    period: '/month',
    description: 'For established businesses with complex needs',
    features: [
      'Unlimited Companies',
      'Unlimited Payroll',
      'Advanced Inventory',
      'Full Audit Trails',
      'Team Collaboration',
      'Custom User Roles',
      'Dedicated Account Manager',
      'Custom Integrations',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
]

const Pricing = () => {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent-400 font-semibold text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Choose the plan that fits your business. Upgrade or downgrade
            anytime.
          </p>
          <p className="mt-3 text-accent-400 font-medium">
            14-day free trial on all plans. No credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`
                relative rounded-2xl p-8 border-2 transition-all duration-300 backdrop-blur-sm
                ${
                  plan.popular
                    ? 'border-accent-500 bg-slate-800 shadow-2xl shadow-accent-500/20 scale-105'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                }
              `}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold px-4 py-1 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent-400 flex-shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link to="/signup" className="block">
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Pricing
