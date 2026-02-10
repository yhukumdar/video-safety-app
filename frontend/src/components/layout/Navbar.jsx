import { useState, useRef, useEffect } from 'react'
import { Shield, User, LogOut, Settings, CreditCard, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'

export function Navbar({ children }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { user, logout } = useAuth()
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl flex items-center justify-center shadow-sm">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#2A3D66] hidden sm:block">Video Safety</span>
          </div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex items-center gap-6">
            {children}
          </div>

          {/* Right Side - Profile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6 text-[#2A3D66]" />
              ) : (
                <Menu className="w-6 h-6 text-[#2A3D66]" />
              )}
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-full transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[#A897D4] to-[#9887C4] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-[#2A3D66] hidden sm:block">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-[#2A3D66]">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-1">{user?.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <button className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-[#2A3D66]">
                        <User className="w-5 h-5" />
                        <span className="font-medium">Profile Settings</span>
                      </button>
                      <button className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-[#2A3D66]">
                        <CreditCard className="w-5 h-5" />
                        <span className="font-medium">Membership</span>
                      </button>
                      <button className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-[#2A3D66]">
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4 border-t border-gray-100"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
