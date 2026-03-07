/**
 * DayColumn - Columna de resumen diario para la vista de analisis
 *
 * Muestra un resumen compacto de las actividades de un dia:
 * despertar, siestas con ventanas de vigilia, alimentacion,
 * medicamentos, actividades, bedtime, dream feeds y despertares nocturnos.
 */

"use client"

import {
  Sun,
  Moon,
  CloudMoon,
  Utensils,
  Pill,
  Activity,
  Baby,
  Clock,
  Heart,
  Milk,
  UtensilsCrossed,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type {
  DayAnalysis,
  NapSummary,
  WakeWindow,
  FeedingSummary,
  MedicationSummary,
  ActivitySummary,
  NightWakingSummary,
} from "@/lib/bitacora/analysis-utils"
import {
  formatDuration,
  feedingTypeLabel,
  emotionalStateLabel,
} from "@/lib/bitacora/analysis-utils"

interface DayColumnProps {
  analysis: DayAnalysis
  isToday?: boolean
}

export function DayColumn({ analysis, isToday = false }: DayColumnProps) {
  const dayLabel = format(analysis.date, "EEE", { locale: es })
  const dateLabel = format(analysis.date, "d MMM", { locale: es })
  const hasData =
    analysis.wakeTime !== null ||
    analysis.bedtime !== null ||
    analysis.naps.length > 0 ||
    analysis.feedings.length > 0 ||
    analysis.medications.length > 0 ||
    analysis.activities.length > 0

  return (
    <div
      className={cn(
        "flex flex-col border rounded-lg overflow-hidden h-full min-w-[200px]",
        isToday ? "border-blue-300 bg-blue-50/30" : "border-gray-200 bg-white"
      )}
    >
      {/* Header del dia */}
      <div
        className={cn(
          "px-3 py-2 text-center border-b",
          isToday
            ? "bg-blue-100/60 border-blue-200"
            : "bg-gray-50 border-gray-100"
        )}
      >
        <p className="text-xs font-medium text-gray-500 capitalize">
          {dayLabel}
        </p>
        <p
          className={cn(
            "text-sm font-semibold",
            isToday ? "text-blue-700" : "text-gray-800"
          )}
        >
          {dateLabel}
        </p>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!hasData ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-xs text-gray-400">Sin datos</p>
          </div>
        ) : (
          <>
            {/* Despertar */}
            {analysis.wakeTime && (
              <SectionRow
                icon={<Sun className="h-3.5 w-3.5 text-amber-500" />}
                label="Despertar"
                value={analysis.wakeTime}
                className="bg-amber-50/60"
              />
            )}

            {/* Siestas y Ventanas de vigilia intercaladas */}
            {(analysis.naps.length > 0 || analysis.wakeWindows.length > 0) && (
              <div className="space-y-1">
                {renderNapsAndWindows(analysis.naps, analysis.wakeWindows)}
              </div>
            )}

            {/* Alimentacion diurna */}
            {analysis.feedings.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1">
                  Alimentacion
                </p>
                {analysis.feedings.map((f, i) => (
                  <FeedingRow key={i} feeding={f} />
                ))}
              </div>
            )}

            {/* Medicamentos */}
            {analysis.medications.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1">
                  Medicamentos
                </p>
                {analysis.medications.map((m, i) => (
                  <MedicationRow key={i} medication={m} />
                ))}
              </div>
            )}

            {/* Actividades */}
            {analysis.activities.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1">
                  Actividades
                </p>
                {analysis.activities.map((a, i) => (
                  <ActivityRow key={i} activity={a} />
                ))}
              </div>
            )}

            {/* Bedtime */}
            {analysis.bedtime && (
              <SectionRow
                icon={<Moon className="h-3.5 w-3.5 text-indigo-500" />}
                label="Dormir"
                value={analysis.bedtime}
                subtitle={
                  analysis.bedtimeSleepDelay
                    ? `Tardo ${analysis.bedtimeSleepDelay} min`
                    : undefined
                }
                className="bg-indigo-50/60"
              />
            )}

            {/* Dream Feeds */}
            {analysis.dreamFeeds.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1">
                  Tomas nocturnas
                </p>
                {analysis.dreamFeeds.map((f, i) => (
                  <FeedingRow key={i} feeding={f} isNight />
                ))}
              </div>
            )}

            {/* Despertares nocturnos */}
            {analysis.nightWakings.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1">
                  Despertares nocturnos
                </p>
                {analysis.nightWakings.map((nw, i) => (
                  <NightWakingRow key={i} waking={nw} />
                ))}
              </div>
            )}

            {/* Total siestas */}
            {analysis.totalNapMinutes > 0 && (
              <div className="border-t border-gray-100 pt-1 mt-1">
                <p className="text-[10px] text-gray-500 text-center">
                  Total siestas: {formatDuration(analysis.totalNapMinutes)}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-componentes
// ============================================================================

function SectionRow({
  icon,
  label,
  value,
  subtitle,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md",
        className
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">{label}</span>
          <span className="text-sm font-semibold text-gray-800">{value}</span>
        </div>
        {subtitle && (
          <p className="text-[10px] text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function WakeWindowBadge({ window }: { window: WakeWindow }) {
  return (
    <div className="flex items-center justify-center py-0.5 px-2 mx-auto w-fit">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
        <Clock className="h-2.5 w-2.5" />
        {window.durationFormatted}
      </span>
    </div>
  )
}

function NapRow({ nap, index }: { nap: NapSummary; index: number }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-violet-50/60">
      <CloudMoon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Siesta {index + 1}</span>
          <span className="text-[11px] font-medium text-gray-700">
            {nap.startTime} - {nap.endTime}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {nap.durationMinutes > 0 && (
            <span className="text-[10px] text-violet-600 font-medium">
              {formatDuration(nap.durationMinutes)}
            </span>
          )}
          {nap.emotionalState && (
            <span className="text-[10px] text-gray-400">
              {emotionalStateLabel(nap.emotionalState)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function renderNapsAndWindows(naps: NapSummary[], windows: WakeWindow[]) {
  const elements: React.ReactNode[] = []

  // Intercalar: ventana 0 (despertar->siesta1), siesta 1, ventana 1 (siesta1->siesta2), etc.
  let windowIdx = 0
  for (let i = 0; i < naps.length; i++) {
    // Ventana antes de esta siesta
    if (windowIdx < windows.length && windows[windowIdx].toLabel === `Siesta ${i + 1}`) {
      elements.push(
        <WakeWindowBadge key={`ww-${windowIdx}`} window={windows[windowIdx]} />
      )
      windowIdx++
    }
    // La siesta
    elements.push(<NapRow key={`nap-${i}`} nap={naps[i]} index={i} />)
  }

  // Ventana despues de la ultima siesta (hasta dormir)
  if (windowIdx < windows.length) {
    elements.push(
      <WakeWindowBadge key={`ww-${windowIdx}`} window={windows[windowIdx]} />
    )
  }

  return elements
}

function getFeedingIcon(feedingType: string) {
  switch (feedingType) {
    case "breast":
      return <Heart className="h-3 w-3 text-pink-500 shrink-0" />
    case "bottle":
      return <Milk className="h-3 w-3 text-sky-500 shrink-0" />
    case "solids":
      return <UtensilsCrossed className="h-3 w-3 text-emerald-500 shrink-0" />
    default:
      return <Utensils className="h-3 w-3 text-green-500 shrink-0" />
  }
}

function FeedingRow({
  feeding,
  isNight,
}: {
  feeding: FeedingSummary
  isNight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]",
        isNight ? "bg-indigo-50/40" : ""
      )}
    >
      {getFeedingIcon(feeding.feedingType)}
      <span className="text-gray-500">{feeding.time}</span>
      <span className="text-gray-700 font-medium">
        {feedingTypeLabel(feeding.feedingType)}
      </span>
      {feeding.amount && (
        <span className="text-gray-400">
          {feeding.amount}
          {feeding.unit}
        </span>
      )}
      {feeding.duration && (
        <span className="text-gray-400">{feeding.duration}min</span>
      )}
    </div>
  )
}

function MedicationRow({ medication }: { medication: MedicationSummary }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]">
      <Pill className="h-3 w-3 text-amber-500 shrink-0" />
      <span className="text-gray-500">{medication.time}</span>
      <span className="text-gray-700 font-medium truncate">
        {medication.name}
      </span>
      <span className="text-gray-400 truncate">{medication.dose}</span>
    </div>
  )
}

function ActivityRow({ activity }: { activity: ActivitySummary }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]">
      <Activity className="h-3 w-3 text-orange-500 shrink-0" />
      <span className="text-gray-500">{activity.time}</span>
      <span className="text-gray-700 truncate">{activity.description}</span>
      {activity.duration && (
        <span className="text-gray-400">{activity.duration}min</span>
      )}
    </div>
  )
}

function NightWakingRow({ waking }: { waking: NightWakingSummary }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50/40 text-[11px]">
      <Baby className="h-3 w-3 text-red-500 shrink-0" />
      <span className="text-gray-500">{waking.time}</span>
      {waking.awakeDelay !== undefined && (
        <span className="text-red-600 font-medium">
          {waking.awakeDelay}min despierto
        </span>
      )}
      {waking.emotionalState && (
        <span className="text-gray-400">
          {emotionalStateLabel(waking.emotionalState)}
        </span>
      )}
    </div>
  )
}
