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
          <h2 className="text-xl sm:text-2xl font-bold text-white">Kid Profiles</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Create profiles for each child to customize content filtering
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors touch-manipulation w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Kid Profile</span>
        </button>
      </div>

      {/* Kids Grid */}
      {kids.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
          <User className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No kid profiles yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kids.map((kid) => (
            <div
              key={kid.id}
              className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Avatar */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4">
                {kid.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <h3 className="text-xl font-semibold text-white mb-2">{kid.name}</h3>
              <p className="text-slate-400 text-sm mb-4">Age: {kid.age} years old</p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(kid)}
                  className="flex-1 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center justify-center gap-2 transition-colors touch-manipulation"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm">Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(kid.id)}
                  className="px-3 py-2.5 bg-red-900/50 hover:bg-red-900 text-red-300 rounded flex items-center justify-center gap-2 transition-colors touch-manipulation"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-4 sm:p-6 border border-slate-700 my-8 shadow-2xl animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {editingKid ? 'Edit Profile' : 'Add Kid Profile'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors p-1 touch-manipulation"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter child's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                  min="0"
                  max="18"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date of Birth (Optional)
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-2 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
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