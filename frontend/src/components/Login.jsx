import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'

export default function Login({ onBackToHome }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) throw error

      if (isSignUp) {
        alert('Check your email to confirm your account!')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#2B4570] via-[#1e3151] to-[#2B4570] text-white py-20 px-4 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8FA888]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#8FA888]/10 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to home</span>
            </button>
          )}
          <div className="flex items-center gap-4 mb-8">
            <img
              src="/PopSightLogo.svg"
              alt="PopSight Logo"
              className="w-20 h-20"
            />
            <h1 className="text-4xl font-black tracking-tight">PopSight</h1>
          </div>
          <h2 className="text-5xl sm:text-6xl font-black mb-6 max-w-2xl leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Know what your kids are watching
          </h2>
          <p className="text-xl sm:text-2xl text-gray-200 max-w-2xl font-medium">
            AI-powered video analysis to keep your children safe online
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div className="max-w-md mx-auto px-4 -mt-12">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-gray-100 hover:shadow-3xl transition-shadow">
          <div className="flex gap-2 mb-8 p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-200 ${
                !isSignUp
                  ? 'bg-gradient-to-r from-[#2B4570] to-[#1e3151] text-white shadow-lg scale-[1.02]'
                  : 'text-[#6B7280] hover:text-[#2B4570] hover:bg-white/50'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-200 ${
                isSignUp
                  ? 'bg-gradient-to-r from-[#2B4570] to-[#1e3151] text-white shadow-lg scale-[1.02]'
                  : 'text-[#6B7280] hover:text-[#2B4570] hover:bg-white/50'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#2B4570] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8FA888] focus:border-transparent transition-all"
                placeholder="parent@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2B4570] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8FA888] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#8FA888] to-[#7a9377] hover:from-[#7a9377] hover:to-[#6b8468] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Loading...' : isSignUp ? '🚀 Sign Up' : '🔐 Sign In'}
            </button>
          </form>

          {isSignUp && (
            <p className="text-xs text-[#6B7280] mt-4 text-center">
              By signing up, you agree to keep your children safe online
            </p>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-12 pb-16 text-center">
          <h3 className="text-2xl font-bold text-[#2B4570] mb-8">Why parents trust Video Safety</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-white to-green-50/50 rounded-3xl p-8 border-2 border-gray-100 hover:border-[#8FA888] hover:shadow-xl transition-all transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="font-bold text-lg text-[#2B4570] mb-3">AI-Powered Analysis</h3>
              <p className="text-sm text-[#6B7280]">Advanced AI scans every video for safety concerns</p>
            </div>
            <div className="bg-gradient-to-br from-white to-yellow-50/50 rounded-3xl p-8 border-2 border-gray-100 hover:border-[#8FA888] hover:shadow-xl transition-all transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="font-bold text-lg text-[#2B4570] mb-3">Fast & Accurate</h3>
              <p className="text-sm text-[#6B7280]">Get detailed reports in minutes, not hours</p>
            </div>
            <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl p-8 border-2 border-gray-100 hover:border-[#8FA888] hover:shadow-xl transition-all transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="font-bold text-lg text-[#2B4570] mb-3">Family-Friendly</h3>
              <p className="text-sm text-[#6B7280]">Customizable settings for each child's age</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}