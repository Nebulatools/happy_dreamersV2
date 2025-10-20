"use strict";
/*
  Runner de migraciones v3 (idempotentes, reproducibles)
  Uso:
    - Compilar: npm run v3:build
    - Dry-run:   node core-v3/dist/migrations/index.js --dry-run
    - Apply:     node core-v3/dist/migrations/index.js --apply
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Carga variables de entorno para ejecución standalone (fuera de Next)
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadEnv() {
    try {
        const dotenv = require('dotenv');
        const root = process.cwd();
        const candidates = [
            path_1.default.join(root, '.env.local'),
            path_1.default.join(root, '.env'),
        ];
        for (const p of candidates) {
            if (fs_1.default.existsSync(p)) {
                dotenv.config({ path: p });
            }
        }
    }
    catch {
        // noop (dotenv no instalado)
    }
}
loadEnv();
function parseMode() {
    const argv = process.argv.slice(2);
    if (argv.includes('--apply'))
        return 'apply';
    if (argv.includes('--dry-run'))
        return 'dry-run';
    const env = String(process.env.MIGRATION_MODE || '').toLowerCase();
    if (env === 'apply')
        return 'apply';
    return 'dry-run';
}
function log(event, data = {}) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scope: 'v3-migrate', event, ...data }));
}
async function main() {
    const mode = parseMode();
    log('start', { mode });
    // Import síncrono vía require para compatibilidad CJS al ejecutar con node
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m001 = require('./migrations/001_unify_ids_and_dates');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m002 = require('./migrations/002_remove_phantoms');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m003 = require('./migrations/003_reindex');
    await m001.run({ mode });
    await m002.run({ mode });
    await m003.run({ mode });
    log('done', { mode });
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[v3:migrate] Error', err);
    process.exit(1);
});
