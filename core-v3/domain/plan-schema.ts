export const PLAN_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  additionalProperties: false,
  required: [
    "planType",
    "title",
    "summary",
    "schedule",
    "objectives",
    "recommendations",
    "metrics"
  ],
  properties: {
    planType: {
      type: "string",
      enum: ["initial", "event_based", "transcript_refinement"]
    },
    title: { type: "string", minLength: 1 },
    summary: { type: "string", minLength: 1 },
    schedule: {
      type: "object",
      additionalProperties: false,
      required: ["bedtime", "wakeTime", "meals", "activities", "naps"],
      properties: {
        bedtime: { type: "string", minLength: 1 },
        wakeTime: { type: "string", minLength: 1 },
        meals: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["time", "type", "description"],
            properties: {
              time: { type: "string", minLength: 1 },
              type: { type: "string", minLength: 1 },
              description: { type: "string", minLength: 1 }
            }
          }
        },
        activities: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["time", "activity", "duration", "description"],
            properties: {
              time: { type: "string", minLength: 1 },
              activity: { type: "string", minLength: 1 },
              duration: { type: "number", minimum: 0 },
              description: { type: "string" }
            }
          }
        },
        naps: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["time", "duration"],
            properties: {
              time: { type: "string", minLength: 1 },
              duration: { type: "number", minimum: 0 },
              description: { type: "string" }
            }
          }
        }
      }
    },
    objectives: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 }
    },
    recommendations: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 }
    },
    metrics: {
      type: "object",
      additionalProperties: false,
      required: ["eventCount", "distinctTypes", "byType"],
      properties: {
        eventCount: { type: "integer", minimum: 0 },
        distinctTypes: { type: "integer", minimum: 0 },
        byType: {
          type: "object",
          additionalProperties: { type: "integer", minimum: 0 }
        },
        ageInMonths: { type: "integer", minimum: 0 }
      }
    },
    metadata: {
      type: "object",
      additionalProperties: true
    }
  }
} as const
