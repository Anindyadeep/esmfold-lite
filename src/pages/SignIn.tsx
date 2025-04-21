import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

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
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-white overflow-hidden">
      {/* Enhanced Background with multiple layers */}
      <div className="absolute inset-0 w-full h-full">
        {/* Base Background Image */}
        <div 
          className="absolute inset-0 w-full h-full bg-pattern"
          style={{ 
            backgroundImage: 'url(/assets/bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: '0.12',
            transform: 'scale(1.05)',
            filter: 'contrast(1.05) brightness(1.05)'
          }}
        ></div>
        
        {/* Light Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-white/70 to-white/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40"></div>
        
        {/* Subtle Light Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[30vh] bg-blue-500/10 blur-[80px] rounded-full"></div>
        
        {/* Additional Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-10 px-4">
        {/* Logo and Tagline */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-blue-600 drop-shadow-sm">
            LiteFold
          </h1>
          <p className="text-gray-600 text-lg">
            Protein structure prediction made accessible
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-8 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-800">
              Welcome
            </h2>
            <p className="text-gray-600 text-sm">
              Sign in to access LiteFold
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
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
          
          {/* About LiteFold */}
          <div className="pt-2">
            <p className="text-xs text-gray-500 leading-relaxed">
              LiteFold is a tool for developers and biotechnologists to work with protein folding, RNA folding, and more. Making advanced structural biology accessible to everyone.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
      
      {/* Custom CSS for enhanced background effects */}
      <style jsx>{`
        .bg-pattern {
          background-blend-mode: soft-light;
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        @keyframes subtle-float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.02);
          }
        }
        
        .drop-shadow-sm {
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
        }
      `}</style>
    </div>
  )
} 