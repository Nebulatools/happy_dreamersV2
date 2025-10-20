"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planDTOSchema = exports.eventDTOSchema = exports.childDTOSchema = exports.sleepEventTypeSchema = exports.planTypeSchema = exports.objectIdString = void 0;
const zod_1 = require("zod");
const entities_1 = require("./entities");
// ObjectId string (24 hex)
exports.objectIdString = zod_1.z
    .string()
    .regex(/^[a-f\d]{24}$/i, { message: 'Invalid ObjectId string' });
// Enumerations
exports.planTypeSchema = zod_1.z.nativeEnum(Object.assign({}, entities_1.PlanType));
exports.sleepEventTypeSchema = zod_1.z.nativeEnum(Object.assign({}, entities_1.SleepEventType));
// Common fields
const requiredDates = {
    createdAt: zod_1.z.date({ required_error: 'createdAt is required and must be Date' }),
    updatedAt: zod_1.z.date({ required_error: 'updatedAt is required and must be Date' }),
};
// Child DTO schema (API)
exports.childDTOSchema = zod_1.z.object({
    id: exports.objectIdString.optional(),
    userId: exports.objectIdString,
    name: zod_1.z.string().min(1),
    tz: zod_1.z.string().optional(),
    birthdate: zod_1.z.date().optional(),
    ...requiredDates,
});
// Event DTO schema (API)
exports.eventDTOSchema = zod_1.z
    .object({
    id: exports.objectIdString.optional(),
    childId: exports.objectIdString,
    type: exports.sleepEventTypeSchema,
    startTime: zod_1.z.date({ required_error: 'startTime must be a Date' }),
    endTime: zod_1.z.date().optional(),
    notes: zod_1.z.string().optional(),
    sleepDelay: zod_1.z.number().int().min(0).max(180).optional(),
    ...requiredDates,
})
    .superRefine((data, ctx) => {
    // Invariante: endTime > startTime cuando aplique
    if (data.endTime && !(data.endTime > data.startTime)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'endTime must be greater than startTime',
            path: ['endTime'],
        });
    }
    // Invariante: sleepDelay sólo aplica para type === 'sleep'
    if (data.sleepDelay !== undefined && data.type !== entities_1.SleepEventType.sleep) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'sleepDelay is only allowed for type "sleep"',
            path: ['sleepDelay'],
        });
    }
});
// Plan DTO schema (API)
exports.planDTOSchema = zod_1.z.object({
    id: exports.objectIdString.optional(),
    childId: exports.objectIdString,
    planType: exports.planTypeSchema,
    title: zod_1.z.string().optional(),
    content: zod_1.z.unknown().optional(),
    ...requiredDates,
});
