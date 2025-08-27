// Página de inicio de sesión
// Permite a los usuarios acceder a su cuenta

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email({
    message: "Por favor ingresa un email válido.",
  }),
  password: z.string().min(1, {
    message: "La contraseña es requerida.",
  }),
})

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error("Credenciales inválidas")
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      })

      // Obtener la sesión actualizada para verificar el rol
      const session = await getSession()
      
      // Redirigir al dashboard principal para todos los usuarios
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error durante el inicio de sesión",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)'
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center justify-center mr-16">
        <img
          src="/LOGO.svg"
          alt="Happy Dreamers Logo"
          style={{ width: 594, height: 381.2064208984375 }}
          draggable={false}
        />
      </div>
      {/* Login form */}
      <div className="flex items-center justify-center">
        <div className="w-[451px]">
          {/* Back button */}
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center text-white/90 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Página Principal
            </Link>
          </div>

          {/* Login Card */}
          <div className="backdrop-blur-sm shadow-2xl border border-white/20" style={{ backgroundColor: '#EFFFFF', width: '451px', height: '624px', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="mb-2 ludicrous-title" style={{ fontSize: '48px' }}>
                Welcome Back!
              </h1>
              <p className="text-[#718096] text-sm century-gothic">
                Sign in to continue tracking your sleep!
              </p>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-[#374151] mb-2 century-gothic">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            style={{ fontFamily: 'Century Gothic, sans-serif', backgroundColor: '#DEF1F1' }}
                            autoComplete="off"
                            data-form-type="other"
                            data-lpignore="true"
                            className="w-full border-0 rounded-lg px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
                          />
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="block text-sm font-medium text-[#374151] century-gothic">
                          Password
                        </FormLabel>
                        <Link href="#" className="text-sm text-[#4299E1] hover:underline century-gothic">
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            style={{ fontFamily: 'Century Gothic, sans-serif', backgroundColor: '#DEF1F1' }}
                            autoComplete="new-password"
                            data-form-type="other"
                            data-lpignore="true"
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Remember me */}
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 border border-gray-300 rounded focus:ring-[#4299E1] focus:ring-2"
                  />
                  <label htmlFor="remember" className="text-sm text-[#4A5568] century-gothic">
                    Remember me
                  </label>
                </div>

                {/* Submit buttons */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white border-0 rounded-xl py-3 font-normal text-[13px]"
                    style={{ 
                      fontFamily: 'Century Gothic, sans-serif',
                      background: '#68A1C8',
                      backgroundColor: '#68A1C8'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a91b8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#68A1C8'}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-[#A0D8D0] hover:bg-[#A0D8D0] text-[#EBFFFC] border-0 rounded-xl py-3 font-normal text-[13px]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                  >
                    Sign in with Google
                  </Button>
                </div>
              </form>
            </Form>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-sm text-[#718096] century-gothic">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-[#4299E1] hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
