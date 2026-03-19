/**
 * ActivePlanBanner - Banner colapsable que muestra el plan activo del nino
 *
 * En estado colapsado muestra una linea resumen con version, bedtime,
 * wakeTime y numero de siestas. Expandido muestra detalles de siestas,
 * comidas y objetivos.
 */

"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import {
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CloudMoon,
  Utensils,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivePlanBannerProps {
  plan: any | null
  onViewFullPlan?: () => void
}

// Formatear hora HH:mm a formato legible
function fmtTime(value?: string | null): string {
  if (!value) return "--:--"
  const [hours, minutes] = value.split(":")
  if (hours === undefined || minutes === undefined) return value
  const hh = parseInt(hours, 10)
  if (Number.isNaN(hh)) return value
  const suffix = hh >= 12 ? "PM" : "AM"
  const normalized = hh % 12 === 0 ? 12 : hh % 12
  return `${normalized}:${minutes} ${suffix}`
}

export function ActivePlanBanner({ plan, onViewFullPlan }: ActivePlanBannerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // No renderizar si no hay plan o es el plan por defecto
  if (!plan) return null
  if (plan.isDefault === true) return null

  const schedule = plan.schedule || {}
  const bedtime = schedule.bedtime || null
  const wakeTime = schedule.wakeTime || null
  const naps = schedule.naps || []
  const meals = schedule.meals || []
  const objectives = plan.objectives?.filter(Boolean) || []
  const version = plan.planVersion || plan.planNumber || "?"

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
        {/* Trigger: linea de resumen siempre visible */}
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center justify-between w-full text-left gap-2 group"
            type="button"
          >
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                <Moon className="h-3.5 w-3.5" />
                Plan v{version}
              </span>
              <span className="text-gray-500">|</span>
              <span className="inline-flex items-center gap-1 text-gray-600">
                <Moon className="h-3 w-3 text-indigo-400" />
                BT {bedtime ? fmtTime(bedtime) : "--:--"}
              </span>
              <span className="inline-flex items-center gap-1 text-gray-600">
                <Sun className="h-3 w-3 text-amber-400" />
                Wake {wakeTime ? fmtTime(wakeTime) : "--:--"}
              </span>
              {naps.length > 0 && (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <CloudMoon className="h-3 w-3 text-violet-400" />
                  Siestas: {naps.length}
                </span>
              )}
            </div>
            <div className="shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Contenido expandido */}
        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-indigo-100 space-y-3">
            {/* Siestas */}
            {naps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Siestas planificadas
                </p>
                <div className="space-y-1">
                  {naps.map((nap: any, i: number) => (
                    <div
                      key={nap.id || i}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <CloudMoon className="h-3 w-3 text-violet-400" />
                      <span className="font-medium">{nap.time || "--:--"}</span>
                      {nap.duration && (
                        <span className="text-gray-400">
                          ({nap.duration} min)
                        </span>
                      )}
                      {nap.description && (
                        <span className="text-gray-400 truncate">
                          {nap.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comidas */}
            {meals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Comidas planificadas
                </p>
                <div className="space-y-1">
                  {meals.map((meal: any, i: number) => (
                    <div
                      key={meal.id || i}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <Utensils className="h-3 w-3 text-green-500" />
                      <span className="font-medium">
                        {meal.time || "--:--"}
                      </span>
                      <span className="text-gray-500 capitalize">
                        {meal.type || ""}
                      </span>
                      {meal.description && (
                        <span className="text-gray-400 truncate">
                          - {meal.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objetivos */}
            {objectives.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Objetivos
                </p>
                <ul className="space-y-1">
                  {objectives.slice(0, 3).map((obj: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-gray-600"
                    >
                      <Target className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Boton para ver plan completo */}
            {onViewFullPlan && (
              <div className="flex justify-end pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50"
                  onClick={onViewFullPlan}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver plan completo
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
