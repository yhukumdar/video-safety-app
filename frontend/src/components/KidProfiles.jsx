import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Save, User } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

export default function KidProfiles() {
  const { parentProfile } = useAuth()
  const [kids, setKids] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingKid, setEditingKid] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    date_of_birth: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (parentProfile) {
      fetchKids()
    }
  }, [parentProfile])

  const fetchKids = async () => {
    try {
      const { data, error } = await supabase
        .from('kid_profiles')
        .select('*')
        .eq('parent_id', parentProfile.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setKids(data || [])
    } catch (err) {
      console.error('Error fetching kids:', err)
      setError('Failed to load profiles')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (editingKid) {
        // Update existing kid
        const { error } = await supabase
          .from('kid_profiles')
          .update({
            name: formData.name,
            age: parseInt(formData.age),
            date_of_birth: formData.date_of_birth || null,
          })
          .eq('id', editingKid.id)

        if (error) throw error
      } else {
        // Create new kid
        const { error } = await supabase
          .from('kid_profiles')
          .insert([{
            parent_id: parentProfile.id,
            name: formData.name,
            age: parseInt(formData.age),
            date_of_birth: formData.date_of_birth || null,
          }])

        if (error) throw error
      }

      // Reset form
      setFormData({ name: '', age: '', date_of_birth: '' })
      setShowAddModal(false)
      setEditingKid(null)
      fetchKids()
    } catch (err) {
      console.error('Error saving kid profile:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (kid) => {
    setEditingKid(kid)
    setFormData({
      name: kid.name,
      age: kid.age.toString(),
      date_of_birth: kid.date_of_birth || '',
    })
    setShowAddModal(true)
  }

  const handleDelete = async (kidId) => {
    if (!confirm('Are you sure? This will delete all analysis history for this profile.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('kid_profiles')
        .delete()
        .eq('id', kidId)

      if (error) throw error
      fetchKids()
    } catch (err) {
      console.error('Error deleting kid:', err)
      setError(err.message)
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingKid(null)
    setFormData({ name: '', age: '', date_of_birth: '' })
    setError(null)
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2B4570]">Kid Profiles</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm mt-1 mb-1">
            Create profiles for each child to customize content filtering
          </p>
          <p className="text-xs text-[#8FA888]">
            You're doing a great job keeping your kids safe
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-[#8FA888] to-[#7a9377] hover:from-[#7a9377] hover:to-[#6b8468] text-white rounded-xl flex items-center justify-center gap-2 transition-all touch-manipulation w-full sm:w-auto shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold">➕ Add Kid Profile</span>
        </button>
      </div>

      {/* Kids Grid */}
      {kids.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-[#8FA888]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-[#8FA888]" />
          </div>
          <h3 className="text-xl font-bold text-[#2B4570] mb-2">Create your first kid profile</h3>
          <p className="text-[#6B7280] max-w-md mx-auto mb-6">
            Each profile lets you set personalized content preferences and age-appropriate filters. It only takes a minute!
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-[#8FA888] hover:bg-[#7a9377] text-white rounded-2xl font-semibold transition-colors shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {kids.map((kid) => (
            <div
              key={kid.id}
              className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl p-6 border-2 border-gray-100 hover:border-[#8FA888] hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              {/* Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-[#8FA888] to-[#7a9377] rounded-2xl flex items-center justify-center text-3xl font-black text-white mb-4 shadow-lg">
                {kid.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <h3 className="text-2xl font-bold text-[#2B4570] mb-2">{kid.name}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🎂</span>
                <p className="text-[#6B7280] text-base font-medium">{kid.age} years old</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(kid)}
                  className="flex-1 px-3 py-3 bg-white border-2 border-gray-200 hover:border-[#8FA888] text-[#2B4570] rounded-xl flex items-center justify-center gap-2 transition-all touch-manipulation hover:shadow-md font-semibold"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm">Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(kid.id)}
                  className="px-4 py-3 bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100 text-red-600 rounded-xl flex items-center justify-center gap-2 transition-all touch-manipulation hover:shadow-md font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 border border-gray-200 my-8 shadow-2xl animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#2B4570]">
                {editingKid ? 'Edit Profile' : 'Add Kid Profile'}
              </h3>
              <button
                onClick={closeModal}
                className="text-[#6B7280] hover:text-[#2B4570] transition-colors p-1 touch-manipulation"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2B4570] mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] text-base focus:outline-none focus:ring-2 focus:ring-[#8FA888] focus:border-transparent"
                  placeholder="Enter child's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B4570] mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                  min="0"
                  max="18"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] text-base focus:outline-none focus:ring-2 focus:ring-[#8FA888] focus:border-transparent"
                  placeholder="Enter age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B4570] mb-2">
                  Date of Birth (Optional)
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] text-base focus:outline-none focus:ring-2 focus:ring-[#8FA888] focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-[#2B4570] rounded-2xl transition-colors touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-[#8FA888] hover:bg-[#7a9377] text-white rounded-2xl flex items-center justify-center gap-2 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>{editingKid ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingKid ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}