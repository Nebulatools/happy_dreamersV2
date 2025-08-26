import type React from "react"
// Archivo principal de layout que configura la estructura básica de la aplicación
// Incluye el ThemeProvider para gestionar el modo oscuro/claro y la configuración global

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { DevTimeProvider } from "@/context/dev-time-context"
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider"
import { Toaster as Sonner } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Happy Dreamers - Seguimiento del Sueño Infantil",
  description: "Aplicación para el seguimiento del sueño de niños",
  generator: "v0.dev",
  manifest: "/manifest.json",
  themeColor: "#3B82F6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
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
          <DevTimeProvider>
            <ServiceWorkerProvider>
              {children}
              <Toaster />
              <Sonner richColors position="top-right" />
            </ServiceWorkerProvider>
          </DevTimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
