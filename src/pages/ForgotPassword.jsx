import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { resetPassword } = useAuth()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Check your email
          </h1>
          <p className="text-gray-600 mb-8">
            We've sent a password reset link to <strong>{email}</strong>. Click
            the link to reset your password.
          </p>
          <Link to="/login">
            <Button variant="outline">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-900">SimpliBooks</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot your password?
            </h1>
            <p className="text-gray-600">
              No worries! Enter your email and we'll send you a reset link.
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

            <Button type="submit" className="w-full" loading={loading}>
              Send Reset Link
            </Button>
          </form>

          {/* Back Link */}
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 mt-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
