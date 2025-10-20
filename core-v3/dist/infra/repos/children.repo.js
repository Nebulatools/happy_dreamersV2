"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildrenRepo = void 0;
const db_1 = require("../db");
function collection(db) {
    return db.collection('children');
}
function log(event, data) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scope: 'ChildrenRepo', event, ...data }));
}
exports.ChildrenRepo = {
    async findById(id) {
        const db = await (0, db_1.getDb)();
        const doc = await collection(db).findOne({ _id: id });
        log('findById', { id: String(id), found: !!doc });
        return doc;
    },
    async upsert(doc) {
        const db = await (0, db_1.getDb)();
        let id = doc._id;
        if (!id) {
            // Import dinámico para no cargar mongodb ESM en tests
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { ObjectId: RuntimeObjectId } = require('mongodb');
            id = new RuntimeObjectId();
        }
        const now = new Date();
        const res = await collection(db).updateOne({ _id: id }, { $set: { ...doc, _id: id, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
        log('upsert', { id: String(id), upserted: !!res.upsertedId, matched: res.matchedCount });
        return { _id: id, upserted: !!res.upsertedId };
    },
    // Acceso explícito al modelo operativo: children.events[] (si se usa)
    async listEventsOperational(childId) {
        const db = await (0, db_1.getDb)();
        const child = await collection(db).findOne({ _id: childId }, { projection: { events: 1 } });
        const events = child?.events ?? [];
        log('listEventsOperational', { childId: String(childId), count: Array.isArray(events) ? events.length : 0 });
        return events;
    },
};
