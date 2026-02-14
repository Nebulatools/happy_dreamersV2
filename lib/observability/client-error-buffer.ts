export type ClientErrorType = "runtime" | "unhandledrejection" | "fetch"

export type ClientObservedError = {
  id: string
  type: ClientErrorType
  message: string
  timestamp: string
  route?: string
  endpoint?: string
  statusCode?: number
  traceId?: string
  details?: string
}

type ClientObservedErrorInput = Omit<ClientObservedError, "id" | "timestamp">

const MAX_BUFFER_SIZE = 80

let clientErrors: ClientObservedError[] = []
const listeners = new Set<() => void>()

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

function createClientErrorId() {
  return `cer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function extractTraceId(message: string): string | undefined {
  const match = message.match(/Ref:\s*([a-zA-Z0-9_-]+)/i)
  if (!match?.[1]) return undefined
  return match[1]
}

export function recordClientError(input: ClientObservedErrorInput): ClientObservedError {
  const next: ClientObservedError = {
    id: createClientErrorId(),
    timestamp: new Date().toISOString(),
    ...input,
  }

  clientErrors = [next, ...clientErrors].slice(0, MAX_BUFFER_SIZE)
  notifyListeners()
  return next
}

export function getClientErrorBuffer(): ClientObservedError[] {
  return [...clientErrors]
}

export function clearClientErrorBuffer() {
  clientErrors = []
  notifyListeners()
}

export function subscribeClientErrorBuffer(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
