import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChevronDown, User, Users, Settings, LogOut, Shield, CreditCard } from 'lucide-react'

export default function Navigation({ currentView, setCurrentView, onViewChange }) {
  const { user, parentProfile, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleViewChange = (view) => {
    if (onViewChange) onViewChange()
    setCurrentView(view)
  }

  return (
    <nav className="bg-white border-b-2 border-gray-100 mb-8 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <img
              src="/PopSightLogo.svg"
              alt="PopSight"
              className="h-10 sm:h-12 w-auto"
            />
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleViewChange('dashboard')}
              className={`text-xs sm:text-sm font-bold transition-all px-3 sm:px-4 py-2 rounded-xl touch-manipulation ${
                currentView === 'dashboard'
                  ? 'text-white bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] shadow-lg scale-105'
                  : 'text-[#6B7280] hover:text-[#FF9C8A] hover:bg-orange-50 hover:scale-105'
              }`}
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </button>
            <button
              onClick={() => handleViewChange('history')}
              className={`text-xs sm:text-sm font-bold transition-all px-3 sm:px-4 py-2 rounded-xl touch-manipulation ${
                currentView === 'history'
                  ? 'text-white bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] shadow-lg scale-105'
                  : 'text-[#6B7280] hover:text-[#FF9C8A] hover:bg-orange-50 hover:scale-105'
              }`}
            >
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">History</span>
            </button>
            <button
              onClick={() => handleViewChange('suggestions')}
              className={`text-xs sm:text-sm font-bold transition-all px-3 sm:px-4 py-2 rounded-xl touch-manipulation ${
                currentView === 'suggestions'
                  ? 'text-white bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] shadow-lg scale-105'
                  : 'text-[#6B7280] hover:text-[#FF9C8A] hover:bg-orange-50 hover:scale-105'
              }`}
            >
              <span className="hidden sm:inline">Suggestions</span>
              <span className="sm:hidden">Lists</span>
            </button>
            <button
              onClick={() => handleViewChange('articles')}
              className={`text-xs sm:text-sm font-bold transition-all px-3 sm:px-4 py-2 rounded-xl touch-manipulation ${
                currentView === 'articles'
                  ? 'text-white bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] shadow-lg scale-105'
                  : 'text-[#6B7280] hover:text-[#FF9C8A] hover:bg-orange-50 hover:scale-105'
              }`}
            >
              <span className="hidden sm:inline">Articles</span>
              <span className="sm:hidden">Learn</span>
            </button>
          </div>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-2xl hover:bg-gray-100 transition-colors touch-manipulation"
              aria-label="User menu"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#8FA888] rounded-full flex items-center justify-center text-sm font-bold text-white">
                {parentProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-[#2A3D66]">
                  {parentProfile?.full_name || 'Parent'}
                </p>
                <p className="text-xs text-[#6B7280] truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
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
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-20">
                  <div className="p-2">
                    {/* Show user info on mobile */}
                    <div className="sm:hidden px-3 py-2 border-b border-gray-200 mb-2">
                      <p className="text-sm font-medium text-[#2A3D66]">
                        {parentProfile?.full_name || 'Parent'}
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">
                        {user?.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        handleViewChange('account')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[#2A3D66] hover:bg-gray-100 rounded-2xl transition-colors touch-manipulation"
                    >
                      <User className="w-5 h-5" />
                      Account Settings
                    </button>

                    <button
                      onClick={() => {
                        handleViewChange('profiles')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[#2A3D66] hover:bg-gray-100 rounded-2xl transition-colors touch-manipulation"
                    >
                      <Users className="w-5 h-5" />
                      Manage Kid Profiles
                    </button>

                    <button
                      onClick={() => {
                        handleViewChange('preferences')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[#2A3D66] hover:bg-gray-100 rounded-2xl transition-colors touch-manipulation"
                    >
                      <Settings className="w-5 h-5" />
                      Content Preferences
                    </button>

                    <button
                      onClick={() => {
                        handleViewChange('membership')
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[#2A3D66] hover:bg-gray-100 rounded-2xl transition-colors touch-manipulation"
                    >
                      <CreditCard className="w-5 h-5" />
                      Membership
                    </button>

                    <hr className="my-2 border-gray-200" />

                    <button
                      onClick={() => {
                        signOut()
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-2xl transition-colors touch-manipulation"
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