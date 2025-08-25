"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  BarChart3, 
  Calendar, 
  PlusCircle,
  User
} from 'lucide-react'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

export function MobileBottomNav() {
  const pathname = usePathname()
  
  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: 'Inicio'
    },
    {
      href: '/dashboard/sleep-statistics',
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Estadísticas'
    },
    {
      href: '/dashboard/event',
      icon: <PlusCircle className="h-6 w-6" />,
      label: 'Registrar'
    },
    {
      href: '/dashboard/calendar',
      icon: <Calendar className="h-5 w-5" />,
      label: 'Calendario'
    },
    {
      href: '/dashboard/profile',
      icon: <User className="h-5 w-5" />,
      label: 'Perfil'
    }
  ]
  
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const isRegister = item.href === '/dashboard/event'
          
          if (item.onClick) {
            return (
              <button
                key={item.href}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 min-h-[44px]",
                  "text-gray-600 hover:text-primary transition-colors",
                  isActive && "text-primary"
                )}
              >
                {item.icon}
                <span className="text-[10px] mt-1">{item.label}</span>
              </button>
            )
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 min-h-[44px] relative",
                "text-gray-600 hover:text-primary transition-colors",
                isActive && "text-primary",
                isRegister && "text-white"
              )}
            >
              {isRegister ? (
                <div className="absolute -top-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-3 shadow-lg">
                  {item.icon}
                </div>
              ) : (
                <>
                  {item.icon}
                  <span className="text-[10px] mt-1">{item.label}</span>
                </>
              )}
              {isRegister && (
                <span className="text-[10px] mt-5 text-gray-600">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}