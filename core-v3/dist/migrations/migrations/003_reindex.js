"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const indexes_1 = require("../../infra/indexes");
function log(event, data = {}) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scope: 'migrate-003', event, ...data }));
}
async function run({ mode }) {
    if (mode === 'dry-run') {
        log('skip_apply', { note: 'indexes creation would run in apply mode' });
        return;
    }
    await (0, indexes_1.ensureIndexes)();
    log('indexes_ensured');
}
