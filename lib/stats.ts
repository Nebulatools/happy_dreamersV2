export function quantile(sortedNumbers: number[], q: number): number {
  if (!sortedNumbers || sortedNumbers.length === 0) return NaN
  const pos = (sortedNumbers.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const baseVal = sortedNumbers[base]
  const nextVal = sortedNumbers[base + 1]
  return nextVal !== undefined ? baseVal + rest * (nextVal - baseVal) : baseVal
}

export function median(sortedNumbers: number[]): number {
  return quantile(sortedNumbers, 0.5)
}

export function iqr(sortedNumbers: number[]): number {
  const q75 = quantile(sortedNumbers, 0.75)
  const q25 = quantile(sortedNumbers, 0.25)
  return q75 - q25
}

export function toHHMM(minutes: number): string {
  let m = minutes
  if (m >= 24 * 60) m -= 24 * 60
  if (m < 0) m += 24 * 60
  const h = Math.floor(m / 60)
  const mm = Math.round(m % 60)
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

