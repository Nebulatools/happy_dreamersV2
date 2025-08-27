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
import { MobileBottomNav } from "@/components/dashboard/mobile-nav"
import ErrorBoundary from "@/components/ErrorBoundary"
import { DevTools } from "@/components/dev/DevTools"
import { UserProvider } from "@/context/UserContext"

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
        <UserProvider>
          <ErrorBoundary 
            context="dashboard" 
            showDetails={process.env.NODE_ENV === 'development'}
          >
            <div className="min-h-screen w-full" style={{ backgroundColor: '#DEF1F1' }}>
              <Sidebar />
              <div className="flex flex-col lg:ml-[256px]" style={{ backgroundColor: '#DEF1F1' }}>
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-3 md:p-4 lg:gap-8 lg:p-6 pb-20 lg:pb-6" style={{ backgroundColor: '#DEF1F1' }}>
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
              {/* Bottom navigation for mobile */}
              <MobileBottomNav />
            </div>
          </ErrorBoundary>
        </UserProvider>
      </PageHeaderProvider>
    </ActiveChildProvider>
  )
}