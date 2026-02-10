// Clasificador AI de alimentos usando OpenAI GPT-4
// Clasifica texto libre de notas de alimentacion en grupos nutricionales

import { OpenAI } from "openai"
import { createLogger } from "@/lib/logger"
import type { NutritionGroup, NutritionClassification } from "./types"

const logger = createLogger("ai-food-classifier")

// Prompt del sistema para clasificacion de alimentos
const FOOD_CLASSIFIER_SYSTEM_PROMPT = `Eres un asistente especializado en nutricion infantil.
Tu tarea es clasificar alimentos en grupos nutricionales.

Los grupos nutricionales validos son:
- proteina: carnes, pollo, pescado, huevo, legumbres, tofu
- carbohidrato: arroz, pasta, pan, avena, cereales, papa, tortilla
- grasa: aguacate, aceite, mantequilla, queso, nueces
- fibra: frutas, verduras, vegetales, legumbres

REGLAS:
1. Analiza el texto de entrada que describe una comida
2. Identifica todos los grupos nutricionales presentes
3. Responde SOLO con un JSON valido en este formato:
   {"groups": ["proteina", "fibra"], "confidence": 0.85}
4. Si no puedes identificar alimentos, responde:
   {"groups": [], "confidence": 0}
5. Confidence va de 0 a 1 (1 = muy seguro)

EJEMPLOS:
- "pollo con arroz y brocoli" -> {"groups": ["proteina", "carbohidrato", "fibra"], "confidence": 0.95}
- "pure de manzana" -> {"groups": ["fibra"], "confidence": 0.90}
- "leche materna" -> {"groups": [], "confidence": 0.80}
- "huevo revuelto con aguacate" -> {"groups": ["proteina", "grasa"], "confidence": 0.95}
- "texto incomprensible" -> {"groups": [], "confidence": 0}
`

// Interfaz interna para respuesta de OpenAI
interface AIClassificationResponse {
  groups: NutritionGroup[]
  confidence: number
}

/**
 * Clasificador AI de alimentos usando OpenAI GPT-4
 * Clasifica texto libre en grupos nutricionales
 */
export class FoodClassifier {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  /**
   * Clasifica un texto de alimentos en grupos nutricionales
   * @param feedingNotes Texto libre describiendo la comida
   * @returns NutritionClassification con grupos, aiClassified y confidence
   */
  async classifyFood(feedingNotes: string): Promise<NutritionClassification> {
    // Si el texto esta vacio, retornar sin clasificar
    if (!feedingNotes || feedingNotes.trim().length === 0) {
      return {
        nutritionGroups: [],
        aiClassified: false,
        rawText: feedingNotes,
      }
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: FOOD_CLASSIFIER_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Clasifica esta comida: "${feedingNotes.trim()}"`,
          },
        ],
        max_tokens: 100, // Respuesta corta (solo JSON)
        temperature: 0.2, // Baja para respuestas consistentes
      })

      const responseText = completion.choices[0]?.message?.content || ""

      // Parsear respuesta JSON
      const parsed = this.parseAIResponse(responseText)

      return {
        nutritionGroups: parsed.groups,
        aiClassified: true,
        confidence: parsed.confidence,
        rawText: feedingNotes,
      }
    } catch (error) {
      logger.error("Error clasificando alimento:", error)

      // Fallback: retornar sin clasificacion AI
      return {
        nutritionGroups: [],
        aiClassified: false,
        rawText: feedingNotes,
      }
    }
  }

  /**
   * Clasifica multiples notas de alimentacion en batch
   * @param feedingNotesArray Array de textos a clasificar
   * @returns Array de NutritionClassification
   */
  async classifyBatch(feedingNotesArray: string[]): Promise<NutritionClassification[]> {
    // Procesar en paralelo para eficiencia
    const results = await Promise.allSettled(
      feedingNotesArray.map((notes) => this.classifyFood(notes))
    )

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      }
      // Si falla, retornar fallback
      return {
        nutritionGroups: [],
        aiClassified: false,
        rawText: feedingNotesArray[index],
      }
    })
  }

  /**
   * Parsea la respuesta JSON de OpenAI
   * @param responseText Texto de respuesta
   * @returns AIClassificationResponse parseado
   */
  private parseAIResponse(responseText: string): AIClassificationResponse {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.warn("No se encontro JSON en respuesta:", responseText)
        return { groups: [], confidence: 0 }
      }

      const parsed = JSON.parse(jsonMatch[0]) as AIClassificationResponse

      // Validar que groups sea un array de NutritionGroup validos
      const validGroups: NutritionGroup[] = ["proteina", "carbohidrato", "grasa", "fibra"]
      const filteredGroups = (parsed.groups || []).filter((g): g is NutritionGroup =>
        validGroups.includes(g as NutritionGroup)
      )

      // Validar confidence entre 0 y 1
      const confidence = typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0

      return {
        groups: filteredGroups,
        confidence,
      }
    } catch (error) {
      logger.warn("Error parseando respuesta AI:", error)
      return { groups: [], confidence: 0 }
    }
  }
}

// Singleton del clasificador
let foodClassifier: FoodClassifier | null = null

/**
 * Obtiene la instancia singleton del clasificador de alimentos
 * @returns FoodClassifier singleton
 */
export function getFoodClassifier(): FoodClassifier {
  if (!foodClassifier) {
    foodClassifier = new FoodClassifier()
  }
  return foodClassifier
}

/**
 * Funcion helper para clasificar un alimento directamente
 * @param feedingNotes Texto de la comida
 * @returns NutritionClassification
 */
export async function classifyFood(feedingNotes: string): Promise<NutritionClassification> {
  return getFoodClassifier().classifyFood(feedingNotes)
}

/**
 * Funcion helper para clasificar multiples alimentos
 * @param feedingNotesArray Array de textos
 * @returns Array de NutritionClassification
 */
export async function classifyFoodBatch(feedingNotesArray: string[]): Promise<NutritionClassification[]> {
  return getFoodClassifier().classifyBatch(feedingNotesArray)
}
