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
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-lg text-center">
        <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-400 mb-4">No kid profiles found. Create a kid profile first.</p>
        <p className="text-sm text-slate-500">Go to "Kid Profiles" to add your first child.</p>
      </div>
    )
  }

  const selectedKidProfile = kidProfiles.find(k => k.id === selectedKid)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Kid Selector */}
      <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 shadow-lg">
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">
          Select Kid Profile
        </label>
        <select
          value={selectedKid || ''}
          onChange={(e) => setSelectedKid(e.target.value)}
          className="w-full px-3 sm:px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 touch-manipulation"
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
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">Allowed Themes</h3>
              <TooltipIcon
                content="Select themes you want to encourage. Videos with these themes will be marked as suitable. Leave empty to allow all themes."
                position="top"
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Videos with these themes will be marked as suitable for {selectedKidProfile?.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_THEMES.map(theme => (
                <button
                  key={theme}
                  onClick={() => toggleAllowedTheme(theme)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                    preferences.allowed_themes.includes(theme)
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Blocked Themes */}
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">Blocked Themes</h3>
              <TooltipIcon
                content="Select themes you want to avoid. Videos with these themes will be flagged as unsuitable, regardless of safety scores."
                position="top"
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Videos with these themes will be flagged as unsuitable for {selectedKidProfile?.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_THEMES.map(theme => (
                <button
                  key={theme}
                  onClick={() => toggleBlockedTheme(theme)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                    preferences.blocked_themes.includes(theme)
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Thresholds */}
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 shadow-lg">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Safety Thresholds</h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Videos exceeding these scores will be flagged for {selectedKidProfile?.name}
            </p>

            <div className="space-y-6">
              {/* Violence Threshold */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-300">
                      Maximum Violence Score
                    </label>
                    <TooltipIcon
                      content="Videos with violence scores above this value will be flagged as unsuitable. 0-20: Minimal, 21-50: Moderate, 51+: High violence."
                      position="top"
                    />
                  </div>
                  <span className="text-lg font-bold text-white">
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
                  className="w-full h-3 sm:h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 touch-manipulation"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>None (0)</span>
                  <span>Some (50)</span>
                  <span>High (100)</span>
                </div>
              </div>

              {/* Scary Threshold */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-300">
                      Maximum Scary Score
                    </label>
                    <TooltipIcon
                      content="Videos with scary scores above this value will be flagged. 0-20: Not scary, 21-50: Mildly frightening, 51+: Very scary."
                      position="top"
                    />
                  </div>
                  <span className="text-lg font-bold text-white">
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
                  className="w-full h-3 sm:h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 touch-manipulation"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>None (0)</span>
                  <span>Some (50)</span>
                  <span>Very (100)</span>
                </div>
              </div>

              {/* NSFW Threshold */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-300">
                      Maximum NSFW Score
                    </label>
                    <TooltipIcon
                      content="Videos with NSFW scores above this value will be flagged. 0-20: Family-friendly, 21-50: Mild suggestive content, 51+: Explicit content."
                      position="top"
                    />
                  </div>
                  <span className="text-lg font-bold text-white">
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
                  className="w-full h-3 sm:h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 touch-manipulation"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>None (0)</span>
                  <span>Some (50)</span>
                  <span>Explicit (100)</span>
                </div>
              </div>

              {/* Profanity Toggle */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-300">
                      Allow Profanity
                    </label>
                    <TooltipIcon
                      content="If disabled, videos containing any profanity or inappropriate language will be flagged as unsuitable."
                      position="top"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Allow videos with mild language
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    allow_profanity: !prev.allow_profanity
                  }))}
                  className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 items-center rounded-full transition-colors touch-manipulation ml-4 ${
                    preferences.allow_profanity ? 'bg-blue-500' : 'bg-slate-600'
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
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500 text-green-400'
                : 'bg-red-500/10 border-red-500 text-red-400'
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
