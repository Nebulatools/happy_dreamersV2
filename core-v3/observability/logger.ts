// Logger estructurado v3. Envoltorio simple sobre el logger del proyecto.
import { createLogger as baseCreateLogger } from '@/lib/logger'

export function createLogger(scope: string) {
  return baseCreateLogger(`v3:${scope}`)
}

