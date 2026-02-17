import * as Sentry from "@sentry/nextjs"

// DSN de Sentry es publico por diseno (solo permite enviar eventos, no leer)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  || "https://90876e7ce0f5f658a96e022e5656ce0c@o4510897333534720.ingest.us.sentry.io/4510897337597952"

Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  debug: false,
})
