import OpenAI from 'openai'
import { normalizeAIPlan, Plan0AI } from './plan0-schema'
import { surveyToFacts, weakStatsFromSurvey, prettySurveyFacts } from './survey-utils'

type Input = {
  child: { firstName?: string; lastName?: string; ageInMonths?: number }
  surveyData: any
  ragContext: any
  policies: any
  enrichedStats?: { napStats?: any; bedtimeStats?: any; feedingStats?: any }
}

const PROMPT_VERSION = 'plan0-survey-2025-10-24-v1'

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('llm_misconfigured')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.HD_OPENAI_BASE_URL })
}

function serializeRag(ragContext: any): string {
  if (!Array.isArray(ragContext) || ragContext.length === 0) return 'Sin RAG disponible; aplica guías generales.'
  return ragContext
    .map((entry: any, index: number) => `Fuente ${index + 1}: ${(entry.title || entry.source || 'RAG')} -> ${entry.content || entry.text || ''}`)
    .join('\n')
}

export async function generatePlan0WithAIFromSurvey(input: Input): Promise<Plan0AI> {
  const client = getClient()
  const facts = surveyToFacts(input.surveyData || {})
  const fallbackStats = weakStatsFromSurvey(facts)
  const stats = input.enrichedStats ?? fallbackStats

  const systemPrompt = [
    'Eres pediatra del sueño especializada en Planes Iniciales (Plan 0).',
    'Responde ÚNICAMENTE con JSON válido usando las claves: schedule, objectives, recommendations.',
    'Reglas:',
    '- Formato de hora HH:MM (24h).',
    '- Mantén horarios naturales y un primer paso suave (máx ±30 min respecto a hábitos declarados).',
    '- Si la familia indicó que NO hay siestas, permite 0 siestas.',
    '- No inventes comidas inexistentes; puedes sugerir bloques genéricos (ej. desayuno, almuerzo).',
    '- Objetivos y recomendaciones concretos, accionables y en español neutro.',
  ].join('\n')

  const ragBlock = serializeRag(input.ragContext)

  const userPrompt = [
    `PROMPT_VERSION=${PROMPT_VERSION}`,
    `Niño: ${input.child.firstName || 'N/A'} (${input.child.ageInMonths ?? 'N/A'} meses)` ,
    `Encuesta:\n${prettySurveyFacts(facts)}`,
    `Estadísticas (pueden provenir de eventos o encuesta):\n${JSON.stringify(stats, null, 2)}`,
    `Políticas por edad:\n${JSON.stringify(input.policies, null, 2)}`,
    `RAG relevante:\n${ragBlock}`,
    'Devuelve solo el JSON exigido.'
  ].join('\n\n')

  const model = process.env.HD_PLAN_LLM_MODEL || 'gpt-4o-mini'
  const temperature = Number.isFinite(Number(process.env.HD_PLAN_LLM_TEMPERATURE)) ? Number(process.env.HD_PLAN_LLM_TEMPERATURE) : 0.4
  const maxTokens = Number.isFinite(Number(process.env.HD_PLAN_LLM_MAX_TOKENS)) ? Number(process.env.HD_PLAN_LLM_MAX_TOKENS) : 2000

  const completion = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = {}
  }
  return normalizeAIPlan(parsed)
}

export { PROMPT_VERSION }
