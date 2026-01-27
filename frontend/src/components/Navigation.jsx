import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChevronDown, User, Users, Settings, LogOut, Shield } from 'lucide-react'

export default function Navigation({ currentView, setCurrentView }) {
  const { user, parentProfile, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <nav className="bg-slate-800 border-b border-slate-700 mb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            <span className="text-lg sm:text-xl font-bold text-white">
              <span className="hidden sm:inline">Video Safety</span>
              <span className="sm:hidden">VS</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`text-xs sm:text-sm font-medium transition-colors px-2 py-1 rounded touch-manipulation ${
                currentView === 'dashboard'
                  ? 'text-white bg-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </button>
            <button
              onClick={() => setCurrentView('profiles')}
              className={`text-xs sm:text-sm font-medium transition-colors px-2 py-1 rounded touch-manipulation ${
                currentView === 'profiles'
                  ? 'text-white bg-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="hidden sm:inline">Kid Profiles</span>
              <span className="sm:hidden">Profiles</span>
            </button>
          </div>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors touch-manipulation"
              aria-label="User menu"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {parentProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {parentProfile?.full_name || 'Parent'}
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />

                {/* Dropdown content */}
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                  <div className="p-2">
                    {/* Show user info on mobile */}
                    <div className="sm:hidden px-3 py-2 border-b border-slate-700 mb-2">
                      <p className="text-sm font-medium text-white">
                        {parentProfile?.full_name || 'Parent'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentView('account')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors touch-manipulation"
                    >
                      <User className="w-5 h-5" />
                      Account Settings
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView('profiles')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors touch-manipulation"
                    >
                      <Users className="w-5 h-5" />
                      Manage Kid Profiles
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView('preferences')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors touch-manipulation"
                    >
                      <Settings className="w-5 h-5" />
                      Content Preferences
                    </button>

                    <hr className="my-2 border-slate-700" />

                    <button
                      onClick={() => {
                        signOut()
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:bg-red-900/20 rounded transition-colors touch-manipulation"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}