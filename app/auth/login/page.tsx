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
      
      // Redirigir según el rol del usuario
      if (session?.user?.role === 'admin') {
        router.push("/dashboard/stats")  // Admin → Dashboard de admin
      } else {
        router.push("/dashboard")        // Usuario normal → Dashboard normal
      }
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
    <div className="min-h-screen hd-gradient-secondary flex items-center justify-center p-4">
      {/* Header flotante */}
      <div className="absolute top-8 left-8 flex items-center gap-2 text-white/90">
        <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span className="font-medium text-base">Página Principal</span>
        </Link>
      </div>

      {/* Logo principal */}
      <div className="absolute top-8 right-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-white"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
        <span className="font-medium text-xl text-white">Happy Dreamers</span>
      </div>

      {/* Card principal centrado */}
      <div className="w-full max-w-md bg-white rounded-3xl hd-card-shadow p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-hd-primary mb-2">
            ¡Bienvenido de nuevo!
          </h1>
          <p className="text-hd-secondary">
            Te extrañamos. Por favor, ingresa tus datos.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="hd-label">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingresa tu email" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="hd-label">Contraseña</FormLabel>
                    <Link href="#" className="text-sm text-primary hover:underline">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <FormControl>
                    <Input placeholder="Ingresa tu contraseña" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember" className="text-sm text-hd-secondary">
                Recordarme
              </label>
            </div>

            <div className="space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
              
              <Button type="button" variant="outline" className="w-full">
                Iniciar sesión con Google
              </Button>
            </div>
          </form>
        </Form>

        <div className="text-center text-sm mt-8">
          <span className="text-hd-secondary">¿No tienes una cuenta? </span>
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  )
}
