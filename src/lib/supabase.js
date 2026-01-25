import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'simplibooks-web',
      },
    },
    db: {
      schema: 'public',
    },
  }
)

// Auth helper functions
export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  })
  return { data, error }
}

export const signOut = async () => {
  console.log('supabase.signOut called')
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sign out timeout')), 5000)
    })
    
    const signOutPromise = supabase.auth.signOut()
    
    const { error } = await Promise.race([signOutPromise, timeoutPromise])
      .catch(err => {
        console.warn('Sign out timed out or failed, forcing local clear:', err)
        return { error: null } // Treat timeout as success, we'll clear locally
      })
    
    console.log('supabase.auth.signOut completed, error:', error)
    
    // Clear any cached data
    localStorage.removeItem('activeCompanyId')
    localStorage.removeItem('sidebarCollapsed')
    localStorage.clear() // Clear all localStorage just to be safe
    console.log('Local storage cleared')
    
    return { error }
  } catch (err) {
    console.error('Exception in signOut:', err)
    // Clear local data anyway
    localStorage.clear()
    return { error: null } // Return success to allow navigation
  }
}

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { data, error }
}

export const updatePassword = async (password) => {
  const { data, error } = await supabase.auth.updateUser({
    password,
  })
  return { data, error }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Storage helper functions for company logos
const LOGO_BUCKET = 'company-logos'

export const uploadCompanyLogo = async (companyId, file) => {
  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload PNG, JPG, or WebP images.')
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 2MB.')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${companyId}/logo-${Date.now()}.${fileExt}`

  // Delete existing logo first (if any)
  const { data: existingFiles } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(companyId)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${companyId}/${f.name}`)
    await supabase.storage.from(LOGO_BUCKET).remove(filesToDelete)
  }

  // Upload new logo
  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(fileName)

  return publicUrl
}

export const deleteCompanyLogo = async (companyId) => {
  // List and delete all files in the company's folder
  const { data: files, error: listError } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(companyId)

  if (listError) {
    throw new Error(`Failed to list files: ${listError.message}`)
  }

  if (files && files.length > 0) {
    const filesToDelete = files.map(f => `${companyId}/${f.name}`)
    const { error: deleteError } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove(filesToDelete)

    if (deleteError) {
      throw new Error(`Failed to delete logo: ${deleteError.message}`)
    }
  }

  return true
}
