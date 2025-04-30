import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { FaGithub } from 'react-icons/fa'
import { motion } from 'framer-motion'

export default function SignIn() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })
  }, [navigate])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      // Use different redirect URLs for development and production
      const redirectTo = window.location.hostname === 'localhost' 
        ? 'http://localhost:8080/auth/callback'
        : 'https://ltskewxzroguaigrlucv.supabase.co/auth/v1/callback'

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) {
        console.error('Supabase OAuth error:', error)
        throw error
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto py-6 md:py-8 px-4 md:px-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-0 sm:justify-between">
        <div className="flex items-center space-x-0 -mr-2">
          <img 
            src="/logo.png" 
            alt="LiteFold Logo" 
            style={{ width: '50px', height: '60px', objectFit: 'contain' }} 
            className="md:w-[120px] md:h-[120px]"
          />
          <h1 className="font-instrument text-3xl md:text-5xl font-normal text-slate-900">LiteFold</h1>
        </div>
        <button 
          className="border border-slate-800 text-slate-800 hover:bg-slate-50 flex items-center gap-2 text-sm md:text-base px-3 py-2 md:px-4 md:py-2 rounded-md transition-colors"
          onClick={() => window.open("https://github.com/Anindyadeep/litefold", "_blank")}
        >
          <FaGithub className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Star on GitHub</span>
          <span className="sm:hidden">Star</span>
        </button>
      </header>

      {/* Sign In Content */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-16 flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-10"
        >
          {/* Welcome Text */}
          <div className="text-center space-y-4">
            <h2 className="font-instrument text-4xl md:text-5xl font-normal text-teal-800 mb-2">
              Welcome
            </h2>
            <p className="text-lg text-slate-700">
              Sign in to access LiteFold's protein structure prediction tools
            </p>
          </div>

          {/* Sign In Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-md p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-4 rounded-md text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            <a
              href="https://github.com/Anindyadeep/litefold"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center px-4 py-4 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 shadow-md"
            >
              <FaGithub className="w-5 h-5 mr-2" />
              View project on GitHub
            </a>
            
            {/* About LiteFold */}
            <div className="pt-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                LiteFold is an open-source protein structure prediction and visualization server, designed to make AI-powered protein research easier with the best available tools.
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
      
      {/* Custom CSS for fonts and styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Cascadia+Code:wght@400&display=swap');
        
        .font-instrument {
          font-family: 'Instrument Serif', serif;
        }
        
        .font-mono {
          font-family: 'Cascadia Code', monospace;
        }
      `}</style>
    </div>
  )
} 