import { useState } from 'react'
import { X, MailWarning, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EmailVerificationBanner = () => {
  const { isEmailVerified, user, resendVerificationEmail } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  if (isEmailVerified || dismissed || !user) return null

  const handleResend = async () => {
    setSending(true)
    setError(null)
    const { error } = await resendVerificationEmail(user.email)
    setSending(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <MailWarning className="w-4 h-4 text-amber-600 shrink-0" />
          {sent ? (
            <span className="flex items-center gap-1.5 text-sm text-amber-800">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Verification email sent — check your inbox.
            </span>
          ) : (
            <span className="text-sm text-amber-800 truncate">
              Please verify your email address. Check your inbox for a confirmation link.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!sent && (
            <button
              onClick={handleResend}
              disabled={sending}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {sending ? 'Sending…' : 'Resend email'}
            </button>
          )}
          {error && (
            <span className="text-xs text-red-600">{error}</span>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-amber-500 hover:text-amber-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationBanner
