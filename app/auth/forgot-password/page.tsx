// Página para recuperar contraseña
// Permite a los usuarios solicitar un enlace para resetear su contraseña

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
import { Mail, ArrowLeft } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Por favor ingresa un email válido.",
  }),
})

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el email")
      }

      setEmailSent(true)
      toast({
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para continuar con el proceso.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el email",
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
      
      {/* Reset password form */}
      <div className="flex items-center justify-center">
        <div className="w-[451px]">
          {/* Reset Card */}
          <div className="backdrop-blur-sm shadow-2xl border border-white/20" style={{ backgroundColor: '#EFFFFF', width: '451px', minHeight: '500px', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!emailSent ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className="mb-2 ludicrous-title" style={{ fontSize: '48px' }}>
                    Reset Password
                  </h1>
                  <p className="text-[#718096] text-sm century-gothic">
                    Enter your email to receive reset instructions
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
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your email"
                                style={{ fontFamily: 'Century Gothic, sans-serif', backgroundColor: '#DEF1F1' }}
                                autoComplete="email"
                                className="w-full border-0 rounded-lg px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#4299E1] text-[#2D3748]"
                              />
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit button */}
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
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                </Form>

                {/* Footer */}
                <div className="text-center mt-6">
                  <Link href="/auth/login" className="text-sm text-[#4299E1] hover:underline century-gothic flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Login
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#374151] mb-2 century-gothic">
                    Check your email
                  </h2>
                  <p className="text-[#718096] century-gothic">
                    We've sent password reset instructions to:
                  </p>
                  <p className="font-medium text-[#374151] mt-2 century-gothic">
                    {form.getValues("email")}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-[#718096] century-gothic">
                    Didn't receive the email? Check your spam folder or
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEmailSent(false)
                      form.reset()
                    }}
                    className="w-full border-[#68A1C8] text-[#68A1C8] hover:bg-[#68A1C8] hover:text-white rounded-xl py-3 font-normal text-[13px]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                  >
                    Try another email
                  </Button>
                  
                  <Link href="/auth/login" className="text-sm text-[#4299E1] hover:underline century-gothic flex items-center justify-center mt-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}