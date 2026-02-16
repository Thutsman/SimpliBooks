import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Play, CheckCircle, X } from 'lucide-react'
import Button from '../ui/Button'

const Hero = () => {
  const [showDemo, setShowDemo] = useState(false)

  const benefits = [
    'Tax Compliant (SA, BW, ZW)',
    'Integrated Payroll',
    'Inventory Tracking',
    'Multi-Currency Support',
  ]

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Background Blobs - positioned at edges to not interfere with text */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
            </span>
            The Modern Alternative to SAGE Pastel
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Professional{' '}
            <span className="text-primary-900">Accounting</span>
            <br className="hidden sm:block" />
            Made Simple
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Complete accounting with Payroll and Inventory built in. 
            Generate tax-compliant reports, manage multi-currency transactions, 
            and reconcile bank statements with ease.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setShowDemo(true)}>
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-accent-600" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white px-4 py-1 rounded-md text-sm text-gray-600 border border-gray-200">
                  app.simplibooks.com/dashboard
                </div>
              </div>
            </div>
            <div className="bg-gray-50">
              <img
                src="/1769353591268.png"
                alt="SimpliBooks Dashboard Preview"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Demo Video Modal */}
      {showDemo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowDemo(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDemo(false)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              src="/demo.mp4"
              controls
              autoPlay
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default Hero
