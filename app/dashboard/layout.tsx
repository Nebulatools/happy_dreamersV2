// Layout para el dashboard
// Incluye la navegación lateral y la barra superior

import type { ReactNode } from "react"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ActiveChildProvider } from "@/context/active-child-context"
import { PageHeaderProvider } from "@/context/page-header-context"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import ErrorBoundary from "@/components/ErrorBoundary"
import { DevTools } from "@/components/dev/DevTools"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <ActiveChildProvider>
      <PageHeaderProvider>
        <ErrorBoundary 
          context="dashboard" 
          showDetails={process.env.NODE_ENV === 'development'}
        >
          <div className="min-h-screen w-full">
            <Sidebar />
            <div className="flex flex-col lg:ml-[256px]">
              <Header />
              <main className="flex flex-1 flex-col gap-4 p-3 md:p-4 lg:gap-8 lg:p-6">
                <ErrorBoundary 
                  context="página" 
                  showDetails={process.env.NODE_ENV === 'development'}
                >
                  {children}
                </ErrorBoundary>
              </main>
            </div>
            {/* Herramientas de desarrollo - solo en desarrollo */}
            <DevTools />
          </div>
        </ErrorBoundary>
      </PageHeaderProvider>
    </ActiveChildProvider>
  )
}
