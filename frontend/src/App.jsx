import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { supabase } from './supabaseClient'
import HomePage from './components/HomePage'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import SignupOnboarding from './components/SignupOnboarding'

function AppContent() {
  const { user, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    // Check if user needs to complete onboarding
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_${user.uid}`)
      if (!hasCompletedOnboarding) {
        setNeedsOnboarding(true)
      }
    }
  }, [user])

  const handleOnboardingComplete = async (onboardingData) => {
    console.log('✅ Onboarding completed with data:', onboardingData)

    try {
      // Get parent profile
      const { data: parentProfile, error: parentError } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('user_id', user.uid)
        .single()

      if (parentError) {
        console.error('❌ Error fetching parent profile:', parentError)
        throw parentError
      }

      if (!parentProfile) {
        console.error('❌ No parent profile found for user:', user.uid)
        throw new Error('Parent profile not found')
      }

      console.log('✅ Found parent profile:', parentProfile.id)

      if (parentProfile) {
        // Save kid profiles
        console.log(`📝 Saving ${onboardingData.kids.length} kid profile(s)...`)

        for (const kid of onboardingData.kids) {
          console.log(`  - Saving kid: ${kid.name}, age range: ${kid.ageRange}`)

          const { data: kidProfile, error: kidError } = await supabase
            .from('kid_profiles')
            .insert({
              parent_id: parentProfile.id,
              name: kid.name,
              age_range: kid.ageRange
            })
            .select()
            .single()

          if (kidError) {
            console.error('  ❌ Error saving kid profile:', kidError)
            continue
          }

          console.log(`  ✅ Saved kid profile: ${kidProfile.id}`)

          // Save content preferences for this kid
          const { error: prefError } = await supabase
            .from('content_preferences')
            .insert({
              kid_profile_id: kidProfile.id,
              violence_threshold: onboardingData.concerns.includes('violence') ? 'low' : 'medium',
              scary_content_threshold: onboardingData.concerns.includes('scary') ? 'low' : 'medium',
              profanity_threshold: onboardingData.concerns.includes('inappropriate') ? 'low' : 'medium',
              nsfw_threshold: onboardingData.concerns.includes('nsfw') ? 'low' : 'medium'
            })

          if (prefError) {
            console.error('  ⚠️  Error saving preferences:', prefError)
          } else {
            console.log('  ✅ Saved preferences for kid:', kidProfile.id)
          }
        }

        // Save parent onboarding metadata
        console.log('📝 Updating parent profile metadata...')
        const { error: updateError } = await supabase
          .from('parent_profiles')
          .update({
            onboarding_completed: true,
            main_concerns: onboardingData.concerns,
            main_goal: onboardingData.mainGoal
          })
          .eq('id', parentProfile.id)

        if (updateError) {
          console.error('⚠️  Error updating parent profile:', updateError)
        } else {
          console.log('✅ Parent profile updated')
        }
      }

      // Mark onboarding as complete
      console.log('✅ Onboarding complete! Marking as done in localStorage.')
      localStorage.setItem(`onboarding_${user.uid}`, 'true')
      setNeedsOnboarding(false)
    } catch (error) {
      console.error('❌ Error saving onboarding data:', error)
      // Still mark as complete even if save fails to avoid blocking user
      localStorage.setItem(`onboarding_${user.uid}`, 'true')
      setNeedsOnboarding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9C8A] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading...</p>
        </div>
      </div>
    )
  }

  // Show onboarding if user is logged in but hasn't completed it
  if (user && needsOnboarding) {
    return (
      <SignupOnboarding
        onComplete={handleOnboardingComplete}
        userEmail={user.email}
      />
    )
  }

  if (user) {
    return <Dashboard />
  }

  if (showLogin) {
    return <Login onBackToHome={() => setShowLogin(false)} />
  }

  return <HomePage onGetStarted={() => setShowLogin(true)} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}