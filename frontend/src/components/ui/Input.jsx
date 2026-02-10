export function Input({ label, error, icon, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#2A3D66] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-3 ${icon ? 'pl-12' : ''} bg-white border-2 ${
            error ? 'border-red-500' : 'border-gray-200'
          } rounded-xl focus:outline-none focus:border-[#FF9C8A] transition-colors text-[#2A3D66] placeholder-gray-400 ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#2A3D66] mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-3 bg-white border-2 ${
          error ? 'border-red-500' : 'border-gray-200'
        } rounded-xl focus:outline-none focus:border-[#FF9C8A] transition-colors text-[#2A3D66] placeholder-gray-400 resize-none ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#2A3D66] mb-2">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-3 bg-white border-2 ${
          error ? 'border-red-500' : 'border-gray-200'
        } rounded-xl focus:outline-none focus:border-[#FF9C8A] transition-colors text-[#2A3D66] ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
