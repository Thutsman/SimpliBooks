import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)

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
            Password updated!
          </h1>
          <p className="text-gray-600 mb-8">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </p>
          <Link to="/login">
            <Button>Sign In</Button>
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
              Set new password
            </h1>
            <p className="text-gray-600">
              Enter your new password below.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={6}
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

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
