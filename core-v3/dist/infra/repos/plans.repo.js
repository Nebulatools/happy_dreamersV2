"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlansRepo = void 0;
const db_1 = require("../db");
function collection(db) {
    return db.collection('plans');
}
function log(event, data) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scope: 'PlansRepo', event, ...data }));
}
exports.PlansRepo = {
    async findLatestByCreatedAt(childId) {
        const db = await (0, db_1.getDb)();
        const doc = await collection(db)
            .find({ childId })
            .sort({ createdAt: -1 })
            .limit(1)
            .next();
        log('findLatestByCreatedAt', { childId: String(childId), found: !!doc });
        return doc;
    },
    // Base para calcular progresión (p.ej., últimos N planes por fecha ascendente)
    async findProgressionBase(childId, limit = 10) {
        const db = await (0, db_1.getDb)();
        const cur = collection(db)
            .find({ childId })
            .sort({ createdAt: 1 })
            .limit(limit);
        const out = await cur.toArray();
        log('findProgressionBase', { childId: String(childId), count: out.length });
        return out;
    },
};
