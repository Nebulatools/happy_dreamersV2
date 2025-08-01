// Sistema de tabs para navegación en consultas
// Reemplaza el wizard con navegación libre entre opciones

"use client"

import { cn } from "@/lib/utils"
import { 
  FileText, 
  Calendar, 
  Stethoscope, 
  History,
  User,
  Baby
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TabItem {
  id: string
  label: string
  icon: React.ElementType
}

const TABS: TabItem[] = [
  { id: "transcript", label: "Transcript", icon: FileText },
  { id: "plan", label: "Plan", icon: Calendar },
  { id: "analysis", label: "Análisis", icon: Stethoscope },
  { id: "history", label: "Historial", icon: History },
]

interface ConsultationTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  userName?: string
  childName?: string
}

export function ConsultationTabs({
  activeTab,
  onTabChange,
  userName,
  childName,
}: ConsultationTabsProps) {
  return (
    <div className="w-full bg-white border-b">
      <div className="container mx-auto px-4">
        {/* Header con información del paciente */}
        {userName && childName && (
          <div className="py-3 border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{userName}</span>
              <span>›</span>
              <Baby className="h-4 w-4" />
              <span className="font-medium text-foreground">{childName}</span>
            </div>
          </div>
        )}
        
        {/* Tabs de navegación */}
        <div className="flex items-center gap-1 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 h-10",
                  "hover:bg-accent hover:text-accent-foreground",
                  "transition-colors duration-200",
                  isActive && "bg-primary/10 text-primary font-medium"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}