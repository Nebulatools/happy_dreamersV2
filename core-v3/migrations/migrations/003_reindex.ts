import { ensureIndexes } from '../../infra/indexes'

type Mode = 'dry-run' | 'apply'

function log(event: string, data: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'migrate-003', event, ...data }))
}

export async function run({ mode }: { mode: Mode }) {
  if (mode === 'dry-run') {
    log('skip_apply', { note: 'indexes creation would run in apply mode' })
    return
  }
  await ensureIndexes()
  log('indexes_ensured')
}

