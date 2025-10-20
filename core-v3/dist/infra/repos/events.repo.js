"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsRepo = void 0;
const db_1 = require("../db");
function assertDate(d, name) {
    if (!(d instanceof Date) || isNaN(d.getTime())) {
        throw new Error(`${name} must be a valid Date`);
    }
}
function log(event, data) {
    // logging estructurado simple
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scope: 'EventsRepo', event, ...data }));
}
function collection(db) {
    return db.collection('events');
}
exports.EventsRepo = {
    async findByChildAndRange(childId, from, to) {
        assertDate(from, 'from');
        assertDate(to, 'to');
        const db = await (0, db_1.getDb)();
        const cur = collection(db).find({
            childId,
            startTime: { $gte: from, $lte: to },
        });
        const out = await cur.toArray();
        log('findByChildAndRange', { childId: String(childId), from, to, count: out.length });
        return out;
    },
    async countByTypes(childId, from, to) {
        assertDate(from, 'from');
        assertDate(to, 'to');
        const db = await (0, db_1.getDb)();
        const pipeline = [
            { $match: { childId, startTime: { $gte: from, $lte: to } } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
        ];
        const rows = await collection(db).aggregate(pipeline).toArray();
        const result = {};
        for (const r of rows)
            result[r._id] = r.count;
        log('countByTypes', { childId: String(childId), from, to, result });
        return result;
    },
    async insertManyValidated(events) {
        if (!Array.isArray(events) || events.length === 0)
            return { insertedCount: 0 };
        // Validaciones básicas de Date vs Date + invariantes mínimos
        for (const ev of events) {
            assertDate(ev.startTime, 'startTime');
            if (ev.endTime)
                assertDate(ev.endTime, 'endTime');
            if (ev.endTime && !(ev.endTime > ev.startTime)) {
                throw new Error('endTime must be greater than startTime');
            }
            if (ev.sleepDelay !== undefined) {
                if (ev.sleepDelay < 0 || ev.sleepDelay > 180) {
                    throw new Error('sleepDelay must be between 0 and 180');
                }
                if (ev.type !== 'sleep') {
                    throw new Error('sleepDelay only allowed for type "sleep"');
                }
            }
        }
        const db = await (0, db_1.getDb)();
        const res = await collection(db).insertMany(events);
        log('insertManyValidated', { count: events.length });
        return { insertedCount: res.insertedCount };
    },
};
