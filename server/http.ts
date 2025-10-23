import { NextResponse } from 'next/server'

export function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export class InsufficientDataError extends Error {
  details?: any
  constructor(details?: any) {
    super('insufficient_data')
    this.name = 'InsufficientDataError'
    this.details = details
  }
}

export function normalizeError(err: any): { type: 'insufficient_data' | 'llm_misconfigured' | 'internal'; details?: any } {
  const msg = (err?.message || '').toString().toLowerCase()
  const name = (err?.name || '').toString().toLowerCase()
  const code = (err?.code || '').toString().toLowerCase()

  if (err instanceof InsufficientDataError) return { type: 'insufficient_data', details: err.details }
  if (name.includes('validation') && msg.includes('insufficient')) return { type: 'insufficient_data', details: err.details }
  if (code === 'insufficient_data' || msg === 'insufficient_data') return { type: 'insufficient_data', details: err.details }

  if (code === 'llm_misconfigured' || msg.includes('llm_misconfigured')) return { type: 'llm_misconfigured' }

  return { type: 'internal' }
}

