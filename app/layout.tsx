import type React from "react"
// Archivo principal de layout que configura la estructura básica de la aplicación
// Incluye el ThemeProvider para gestionar el modo oscuro/claro y la configuración global

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Happy Dreamers - Seguimiento del Sueño Infantil",
  description: "Aplicación para el seguimiento del sueño de niños",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
            {children}
            <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
