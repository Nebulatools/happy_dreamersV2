"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initV3Infra = initV3Infra;
const indexes_1 = require("./indexes");
let initialized = null;
async function initV3Infra() {
    if (!initialized) {
        initialized = (async () => {
            await (0, indexes_1.ensureIndexes)();
        })();
    }
    return initialized;
}
