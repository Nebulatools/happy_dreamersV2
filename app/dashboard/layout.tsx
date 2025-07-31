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
        <div className="min-h-screen w-full">
          <Sidebar />
          <div className="flex flex-col lg:ml-[256px]">
            <Header />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </PageHeaderProvider>
    </ActiveChildProvider>
  )
}
