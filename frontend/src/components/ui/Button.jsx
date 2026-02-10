import { motion } from 'framer-motion'

export function PrimaryButton({ children, onClick, disabled, className = '', icon, loading, ...props }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] hover:from-[#FF8B7A] hover:to-[#FF6A5A] text-white font-semibold rounded-full transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  )
}

export function SecondaryButton({ children, onClick, disabled, className = '', icon, ...props }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 bg-white border-2 border-gray-300 hover:border-[#FF9C8A] text-[#2A3D66] font-semibold rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  )
}

export function DangerButton({ children, onClick, disabled, className = '', icon, ...props }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-full transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  )
}

export function TextButton({ children, onClick, disabled, className = '', icon, ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-[#6B7280] hover:text-[#2A3D66] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
