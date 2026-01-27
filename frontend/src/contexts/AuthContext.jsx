import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [parentProfile, setParentProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchParentProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchParentProfile(session.user.id)
      } else {
        setParentProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchParentProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('parent_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await createParentProfile(userId)
      } else if (error) {
        console.error('Error fetching parent profile:', error)
        setLoading(false)
      } else {
        setParentProfile(data)
        setLoading(false)
      }
    } catch (err) {
      console.error('Error in fetchParentProfile:', err)
      setLoading(false)
    }
  }

  const createParentProfile = async (userId) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const email = userData?.user?.email

      const { data, error } = await supabase
        .from('parent_profiles')
        .insert([
          {
            user_id: userId,
            email: email,
            full_name: email?.split('@')[0] || 'Parent',
          },
        ])
        .select()
        .single()

      if (error) throw error
      setParentProfile(data)
      setLoading(false)
    } catch (err) {
      console.error('Error creating parent profile:', err)
      setLoading(false)
    }
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setParentProfile(null)
    }
    return { error }
  }

  const value = {
    user,
    parentProfile,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}