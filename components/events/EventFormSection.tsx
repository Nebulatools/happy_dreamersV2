import { ReactNode } from "react"

interface EventFormSectionProps {
  title: string
  children: ReactNode
  className?: string
}

/**
 * Componente para secciones del formulario de eventos
 * Proporciona un diseño consistente para agrupar campos relacionados
 */
export function EventFormSection({ title, children, className = "" }: EventFormSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-lg border bg-card p-4">
        {children}
      </div>
    </div>
  )
}