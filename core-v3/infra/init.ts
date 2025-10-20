import { ensureIndexes } from './indexes'

let initialized: Promise<void> | null = null

export async function initV3Infra() {
  if (!initialized) {
    initialized = (async () => {
      await ensureIndexes()
    })()
  }
  return initialized
}

