"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureIndexes = ensureIndexes;
const db_1 = require("./db");
/**
 * Crea índices necesarios para v3. Idempotente.
 */
async function ensureIndexes() {
    const db = await (0, db_1.getDb)();
    await db.collection('events').createIndexes([
        {
            key: { childId: 1, startTime: 1 },
            name: 'events_childId_startTime',
            background: true,
        },
    ]);
    await db.collection('plans').createIndexes([
        {
            key: { childId: 1, createdAt: -1 },
            name: 'plans_childId_createdAt_desc',
            background: true,
        },
    ]);
}
