import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { LoadingCard } from './LoadingSpinner'
import { TooltipIcon } from './Tooltip'

const AVAILABLE_THEMES = [
  'educational', 'animated', 'scary', 'religious', 
  'lgbtq', 'political', 'musical', 'action', 
  'romantic', 'live-action'
]

export default function ContentPreferences() {
  const { parentProfile } = useAuth()
  const [kidProfiles, setKidProfiles] = useState([])
  const [selectedKid, setSelectedKid] = useState(null)
  const [preferences, setPreferences] = useState({
    allowed_themes: [],
    blocked_themes: [],
    max_violence_score: 30,
    max_scary_score: 20,
    max_nsfw_score: 10,
    allow_profanity: false
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Fetch kid profiles
  useEffect(() => {
    if (parentProfile) {
      fetchKidProfiles()
    }
  }, [parentProfile])

  // Fetch preferences when kid is selected
  useEffect(() => {
    if (selectedKid) {
      fetchPreferences()
    }
  }, [selectedKid])

  const fetchKidProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('kid_profiles')
        .select('*')
        .eq('parent_id', parentProfile.id)
        .order('name')

      if (error) throw error
      setKidProfiles(data || [])
      if (data && data.length > 0) {
        setSelectedKid(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching kid profiles:', error)
    }
  }

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('content_preferences')
        .select('*')
        .eq('kid_profile_id', selectedKid)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not an error, just no preferences yet)
        throw error
      }

      if (data) {
        setPreferences({
          allowed_themes: data.allowed_themes || [],
          blocked_themes: data.blocked_themes || [],
          max_violence_score: data.max_violence_score || 30,
          max_scary_score: data.max_scary_score || 20,
          max_nsfw_score: data.max_nsfw_score || 10,
          allow_profanity: data.allow_profanity || false
        })
      } else {
        // Reset to defaults if no preferences exist
        setPreferences({
          allowed_themes: [],
          blocked_themes: [],
          max_violence_score: 30,
          max_scary_score: 20,
          max_nsfw_score: 10,
          allow_profanity: false
        })
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from('content_preferences')
        .select('id')
        .eq('kid_profile_id', selectedKid)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('content_preferences')
          .update(preferences)
          .eq('kid_profile_id', selectedKid)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('content_preferences')
          .insert({
            kid_profile_id: selectedKid,
            ...preferences
          })

        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    } finally {
      setSaving(false)
    }
  }

  const toggleAllowedTheme = (theme) => {
    setPreferences(prev => {
      const newAllowed = prev.allowed_themes.includes(theme)
        ? prev.allowed_themes.filter(t => t !== theme)
        : [...prev.allowed_themes, theme]
      
      // Remove from blocked if adding to allowed
      const newBlocked = newAllowed.includes(theme)
        ? prev.blocked_themes.filter(t => t !== theme)
        : prev.blocked_themes

      return {
        ...prev,
        allowed_themes: newAllowed,
        blocked_themes: newBlocked
      }
    })
  }

  const toggleBlockedTheme = (theme) => {
    setPreferences(prev => {
      const newBlocked = prev.blocked_themes.includes(theme)
        ? prev.blocked_themes.filter(t => t !== theme)
        : [...prev.blocked_themes, theme]
      
      // Remove from allowed if adding to blocked
      const newAllowed = newBlocked.includes(theme)
        ? prev.allowed_themes.filter(t => t !== theme)
        : prev.allowed_themes

      return {
        ...prev,
        allowed_themes: newAllowed,
        blocked_themes: newBlocked
      }
    })
  }

  if (kidProfiles.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-gray-200 shadow-sm text-center">
        <div className="w-20 h-20 bg-[#8FA888]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-[#8FA888]" />
        </div>
        <h3 className="text-xl font-bold text-[#2B4570] mb-2">Create a kid profile first</h3>
        <p className="text-[#6B7280] mb-2 max-w-md mx-auto">
          Content preferences are customized for each child. Start by creating a kid profile.
        </p>
        <p className="text-sm text-[#8FA888] mb-6">
          Every parent's values are different—we help you set what works for your family.
        </p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            // This would normally navigate to profiles, but since we're in Dashboard, the user can use nav
          }}
          className="inline-block px-6 py-3 bg-[#8FA888] hover:bg-[#7a9377] text-white rounded-2xl font-semibold transition-colors shadow-md"
        >
          Go to Kid Profiles
        </a>
      </div>
    )
  }

  const selectedKidProfile = kidProfiles.find(k => k.id === selectedKid)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Kid Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
        <label className="block text-xs sm:text-sm font-medium text-[#2B4570] mb-1">
          Select Kid Profile
        </label>
        <p className="text-xs text-[#8FA888] mb-3">
          Customize content filters for each child's age and your family's values
        </p>
        <select
          value={selectedKid || ''}
          onChange={(e) => setSelectedKid(e.target.value)}
          className="w-full px-3 sm:px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-sm sm:text-base text-[#2B4570] focus:outline-none focus:ring-2 focus:ring-[#8FA888] focus:border-transparent touch-manipulation"
        >
          {kidProfiles.map(kid => (
            <option key={kid.id} value={kid.id}>
              {kid.name} ({kid.age} years old)
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingCard message="Loading preferences..." />
      ) : (
        <>
          {/* Allowed Themes */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-[#2B4570]">Allowed Themes</h3>
              <TooltipIcon
                content="Select themes you want to encourage. Videos with these themes will be marked as suitable. Leave empty to allow all themes."
                position="top"
              />
            </div>
            <p className="text-xs sm:text-sm text-[#6B7280] mb-4">
              Videos with these themes will be marked as suitable for {selectedKidProfile?.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_THEMES.map(theme => (
                <button
                  key={theme}
                  onClick={() => toggleAllowedTheme(theme)}
                  className={`px-3 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                    preferences.allowed_themes.includes(theme)
                      ? 'bg-green-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200 hover:text-[#2B4570] hover:scale-105'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Blocked Themes */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-[#2B4570]">Blocked Themes</h3>
              <TooltipIcon
                content="Select themes you want to avoid. Videos with these themes will be flagged as unsuitable, regardless of safety scores."
                position="top"
              />
            </div>
            <p className="text-xs sm:text-sm text-[#6B7280] mb-4">
              Videos with these themes will be flagged as unsuitable for {selectedKidProfile?.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_THEMES.map(theme => (
                <button
                  key={theme}
                  onClick={() => toggleBlockedTheme(theme)}
                  className={`px-3 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                    preferences.blocked_themes.includes(theme)
                      ? 'bg-red-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200 hover:text-[#2B4570] hover:scale-105'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Thresholds */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-[#2B4570] mb-4">Safety Thresholds</h3>
            <p className="text-xs sm:text-sm text-[#6B7280] mb-6">
              Videos exceeding these scores will be flagged for {selectedKidProfile?.name}
            </p>

            <div className="space-y-6">
              {/* Violence Threshold */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[#2B4570]">
                      Maximum Violence Score
                    </label>
                    <TooltipIcon
                      content="Videos with violence scores above this value will be flagged as unsuitable. 0-20: Minimal, 21-50: Moderate, 51+: High violence."
                      position="top"
                    />
                  </div>
                  <span className="text-lg font-bold text-[#2B4570]">
                    {preferences.max_violence_score}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.max_violence_score}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    max_violence_score: parseInt(e.target.value)
                  }))}
                  className="w-full h-3 sm:h-2 bg-gray-200 rounded-2xl appearance-none cursor-pointer accent-[#8FA888] touch-manipulation"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>None (0)</span>
                  <span>Some (50)</span>
                  <span>High (100)</span>
                </div>
              </div>

              {/* Scary Threshold */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[#2B4570]">
                      Maximum Scary Score
                    </label>
                    <TooltipIcon
                      content="Videos with scary scores above this value will be flagged. 0-20: Not scary, 21-50: Mildly frightening, 51+: Very scary."
                      position="top"
                    />
                  </div>
                  <span className="text-lg font-bold text-[#2B4570]">
                    {preferences.max_scary_score}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.max_scary_score}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    max_scary_score: parseInt(e.target.value)
                  }))}
                  className="w-full h-3 sm:h-2 bg-gray-200 rounded-2xl appearance-none cursor-pointer accent-[#8FA888] touch-manipulation"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>None (0)</span>
                  <span>Some (50)</span>
                  <span>Very (100)</span>
                </div>
              </div>

              {/* NSFW Threshold */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[#2B4570]">
                      Maximum NSFW Score
                    </label>
                    <TooltipIcon
                      content="Videos with NSFW scores above this value will be flagged. 0-20: Family-friendly, 21-50: Mild suggestive content, 51+: Explicit content."
                      position="top"
                    />
                  </div>
                  <span className="text-lg font-bold text-[#2B4570]">
                    {preferences.max_nsfw_score}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.max_nsfw_score}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    max_nsfw_score: parseInt(e.target.value)
                  }))}
                  className="w-full h-3 sm:h-2 bg-gray-200 rounded-2xl appearance-none cursor-pointer accent-[#8FA888] touch-manipulation"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>None (0)</span>
                  <span>Some (50)</span>
                  <span>Explicit (100)</span>
                </div>
              </div>

              {/* Profanity Toggle */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-2xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-xs sm:text-sm font-medium text-[#2B4570]">
                      Allow Profanity
                    </label>
                    <TooltipIcon
                      content="If disabled, videos containing any profanity or inappropriate language will be flagged as unsuitable."
                      position="top"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Allow videos with mild language
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    allow_profanity: !prev.allow_profanity
                  }))}
                  className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 items-center rounded-full transition-colors touch-manipulation ml-4 ${
                    preferences.allow_profanity ? 'bg-[#8FA888]' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle profanity"
                >
                  <span
                    className={`inline-block h-5 w-5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                      preferences.allow_profanity ? 'translate-x-6 sm:translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="w-full py-3 sm:py-4 bg-[#8FA888] hover:bg-[#7a9377] rounded-2xl font-semibold text-base sm:text-lg transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation text-white"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-300 text-green-600'
                : 'bg-red-50 border-red-300 text-red-600'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
