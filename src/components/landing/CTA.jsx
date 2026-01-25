import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'

const CTA = () => {
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Navigate to signup with email prefilled
    window.location.href = `/signup?email=${encodeURIComponent(email)}`
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Simplify Your Accounting?
        </h2>
        <p className="text-lg text-primary-200 mb-8 max-w-2xl mx-auto">
          Join thousands of business owners who trust SimpliBooks to manage
          their finances. Start your free trial today - no credit card required.
        </p>

        {/* Email Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
        >
          <div className="flex-1">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-primary-200 focus:ring-white"
              required
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="bg-white text-primary-900 hover:bg-gray-50"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Trust Badge */}
        <p className="mt-6 text-sm text-primary-200">
          14-day free trial • No credit card required • Cancel anytime
        </p>
      </div>
    </section>
  )
}

export default CTA
