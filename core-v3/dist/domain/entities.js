"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SleepEventType = exports.PlanType = void 0;
// Enumerations
exports.PlanType = {
    initial: 'initial',
    event_based: 'event_based',
    transcript_refinement: 'transcript_refinement',
};
exports.SleepEventType = {
    sleep: 'sleep',
    nap: 'nap',
    night_waking: 'night_waking',
    wake: 'wake',
};
