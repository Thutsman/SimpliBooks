import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { resendVerificationEmail } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setUnconfirmed(false)
    setResent(false)

    const { error } = await signIn(email, password)

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setUnconfirmed(true)
      } else {
        toast.error(error.message)
      }
      setLoading(false)
    } else {
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    }
  }

  const handleResend = async () => {
    setResending(true)
    const { error } = await resendVerificationEmail(email)
    setResending(false)
    if (error) {
      toast.error(error.message)
    } else {
      setResent(true)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary-900">SimpliBooks</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
                <span className="text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-accent-600 hover:text-accent-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {unconfirmed && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                <p className="text-amber-800 font-medium mb-1">Email not confirmed</p>
                {resent ? (
                  <p className="text-green-700">Confirmation email sent — check your inbox.</p>
                ) : (
                  <p className="text-amber-700">
                    Please verify your email before signing in.{' '}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="font-medium underline inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {resending && <Loader2 className="w-3 h-3 animate-spin" />}
                      {resending ? 'Sending…' : 'Resend confirmation email'}
                    </button>
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-accent-600 hover:text-accent-700 font-medium"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-900 to-primary-800 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Manage Your Finances with Confidence
          </h2>
          <p className="text-primary-200 text-lg">
            Join thousands of businesses using SimpliBooks to track invoices,
            expenses, and generate professional reports.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
