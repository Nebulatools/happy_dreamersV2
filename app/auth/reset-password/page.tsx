"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const token = searchParams.get("token")
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validar token al cargar la página
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Token no válido")
        setValidatingToken(false)
        return
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await res.json()
        
        if (data.valid) {
          setTokenValid(true)
          setUserEmail(data.email)
        } else {
          setError(data.error || "Token inválido o expirado")
        }
      } catch (err) {
        setError("Error al validar el token")
      } finally {
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validaciones
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido actualizada exitosamente.",
        })
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      } else {
        setError(data.error || "Error al resetear la contraseña")
      }
    } catch (err) {
      setError("Error de conexión. Por favor, intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)' }}>
        <div className="backdrop-blur-sm shadow-2xl border border-white/20" style={{ backgroundColor: '#EFFFFF', width: '451px', minHeight: '200px', borderRadius: '20px', padding: '32px' }}>
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#68A1C8]" />
            <span className="ml-2 text-[#374151] century-gothic">Validating token...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)' }}>
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mr-16">
          <img
            src="/LOGO.svg"
            alt="Happy Dreamers Logo"
            style={{ width: 594, height: 381.2064208984375 }}
            draggable={false}
          />
        </div>
        
        {/* Error Card */}
        <div className="flex items-center justify-center">
          <div className="w-[451px]">
            <div className="backdrop-blur-sm shadow-2xl border border-white/20" style={{ backgroundColor: '#EFFFFF', width: '451px', minHeight: '400px', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#374151] mb-2 ludicrous-title" style={{ fontSize: '32px' }}>
                  Invalid Token
                </h2>
                <p className="text-[#718096] century-gothic mb-6">
                  {error || "The reset link is invalid or has expired. Please request a new one."}
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push("/auth/forgot-password")}
                    className="w-full text-white border-0 rounded-xl py-3 font-normal text-[13px]"
                    style={{ 
                      fontFamily: 'Century Gothic, sans-serif',
                      background: '#68A1C8',
                      backgroundColor: '#68A1C8'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a91b8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#68A1C8'}
                  >
                    Request New Link
                  </Button>
                  
                  <Link href="/auth/login" className="text-sm text-[#4299E1] hover:underline century-gothic flex items-center justify-center mt-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)' }}>
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mr-16">
          <img
            src="/LOGO.svg"
            alt="Happy Dreamers Logo"
            style={{ width: 594, height: 381.2064208984375 }}
            draggable={false}
          />
        </div>
        
        {/* Success Card */}
        <div className="flex items-center justify-center">
          <div className="w-[451px]">
            <div className="backdrop-blur-sm shadow-2xl border border-white/20" style={{ backgroundColor: '#EFFFFF', width: '451px', minHeight: '400px', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#374151] mb-2 ludicrous-title" style={{ fontSize: '32px' }}>
                  Password Updated!
                </h2>
                <p className="text-[#718096] century-gothic mb-6">
                  Your password has been successfully updated.
                </p>
                <p className="text-sm text-[#718096] century-gothic mb-6">
                  Redirecting to login...
                </p>
                
                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full text-white border-0 rounded-xl py-3 font-normal text-[13px]"
                  style={{ 
                    fontFamily: 'Century Gothic, sans-serif',
                    background: '#68A1C8',
                    backgroundColor: '#68A1C8'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a91b8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#68A1C8'}
                >
                  Go to Login Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)' }}>
      {/* Logo */}
      <div className="flex flex-col items-center justify-center mr-16">
        <img
          src="/LOGO.svg"
          alt="Happy Dreamers Logo"
          style={{ width: 594, height: 381.2064208984375 }}
          draggable={false}
        />
      </div>
      
      {/* Reset Form */}
      <div className="flex items-center justify-center">
        <div className="w-[451px]">
          <div className="backdrop-blur-sm shadow-2xl border border-white/20" style={{ backgroundColor: '#EFFFFF', width: '451px', minHeight: '550px', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#DEF1F1] rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#68A1C8]" />
              </div>
              <h1 className="mb-2 ludicrous-title" style={{ fontSize: '48px' }}>
                New Password
              </h1>
              <p className="text-[#718096] text-sm century-gothic">
                Create a new password for: <strong className="text-[#374151]">{userEmail}</strong>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800 text-sm century-gothic">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 century-gothic">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    disabled={loading}
                    style={{ fontFamily: 'Century Gothic, sans-serif', backgroundColor: '#DEF1F1' }}
                    className="w-full border-0 rounded-lg px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#A0AEC0] hover:text-[#4299E1]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 century-gothic">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    disabled={loading}
                    style={{ fontFamily: 'Century Gothic, sans-serif', backgroundColor: '#DEF1F1' }}
                    className="w-full border-0 rounded-lg px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#A0AEC0] hover:text-[#4299E1]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full text-white border-0 rounded-xl py-3 font-normal text-[13px]"
                style={{ 
                  fontFamily: 'Century Gothic, sans-serif',
                  background: '#68A1C8',
                  backgroundColor: '#68A1C8'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#5a91b8')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#68A1C8')}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
              
              {/* Back Link */}
              <Link href="/auth/login" className="text-sm text-[#4299E1] hover:underline century-gothic flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}