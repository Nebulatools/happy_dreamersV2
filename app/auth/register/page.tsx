// Página de registro de usuarios
// Permite a los usuarios crear una cuenta nueva

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft } from 'lucide-react'

const registerSchema = z
  .object({
    name: z.string().min(2, {
      message: "El nombre debe tener al menos 2 caracteres.",
    }),
    email: z.string().email({
      message: "Por favor ingresa un email válido.",
    }),
    password: z.string().min(8, {
      message: "La contraseña debe tener al menos 8 caracteres.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    if (!acceptTerms) {
      toast({
        title: "Error",
        description: "Debes aceptar los términos y condiciones",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          role: "parent", // Por defecto, los usuarios que se registran son padres
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al registrar usuario")
      }

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente.",
      })

      // Redirigir a la página de inicio de sesión
      router.push("/auth/login")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error durante el registro",
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
          style={{ width: 594, height: 381.21 }}
          draggable={false}
        />
      </div>
      {/* Registration form */}
      <div className="flex items-center justify-center">
        <div className="w-[451px]">
          {/* Back button */}
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center text-white/90 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Página Principal
            </Link>
          </div>

          {/* Registration Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-[24px] p-6 lg:p-8 shadow-2xl border border-white/20">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2D3748] mb-2">
                Create Your Account
              </h1>
              <p className="text-[#718096] text-sm">
                Join us and tracking your sleep better!
              </p>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-[#2D3748] mb-2">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="Enter your full name"
                            className="w-full bg-[#EDF2F7] border-0 rounded-lg px-10 py-3 text-sm placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
                          />
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-[#2D3748] mb-2">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            className="w-full bg-[#EDF2F7] border-0 rounded-lg px-10 py-3 text-sm placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
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
                      <FormLabel className="block text-sm font-medium text-[#2D3748] mb-2">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="w-full bg-[#EDF2F7] border-0 rounded-lg px-10 py-3 text-sm placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
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

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-[#2D3748] mb-2">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="w-full bg-[#EDF2F7] border-0 rounded-lg px-10 py-3 text-sm placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Terms checkbox */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 border border-gray-300 rounded focus:ring-[#4299E1] focus:ring-2"
                  />
                  <label htmlFor="acceptTerms" className="text-xs text-[#4A5568] leading-relaxed">
                    I agree to the{' '}
                    <Link href="#" className="text-[#4299E1] hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="#" className="text-[#4299E1] hover:underline">Privacy Policy</Link>
                  </label>
                </div>

                {/* Submit buttons */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={!acceptTerms || isLoading}
                    className="w-full bg-[#68A1C8] hover:bg-[#68A1C8] text-white border-0 rounded-xl py-3 font-normal text-[13px]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-[#A0D8D0] hover:bg-[#A0D8D0] text-[#EBFFFC] border-0 rounded-xl py-3 font-normal text-[13px]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                  >
                    Sign up with Google
                  </Button>
                </div>
              </form>
            </Form>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-sm text-[#718096]">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-[#4299E1] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}