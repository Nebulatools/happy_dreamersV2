import { OpenAI } from "openai";
import { Document } from "@langchain/core/documents";

export class ChatAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(query: string, relevantDocs: Document[]): Promise<string> {
    // Construir contexto desde los documentos relevantes
    const context = relevantDocs.length > 0 
      ? relevantDocs.map(doc => {
          const source = doc.metadata.source || 'documento';
          return `Fuente: ${source}\nContenido: ${doc.pageContent}`;
        }).join('\n\n---\n\n')
      : '';

    const systemPrompt = `Eres un asistente especializado en el cuidado infantil y desarrollo de niños, enfocado en el proyecto Happy Dreamers.

Tu objetivo es ayudar a padres y cuidadores con:
- Problemas de sueño infantil
- Desarrollo emocional y cognitivo
- Rutinas y hábitos saludables
- Consejos de crianza
- Manejo de comportamientos

${context ? `
INFORMACIÓN DE CONTEXTO RELEVANTE:
${context}

Usa esta información cuando sea relevante para responder la pregunta del usuario. Si la información del contexto no es directamente relevante, responde basándote en tu conocimiento general sobre cuidado infantil.
` : 'No hay documentos específicos disponibles, responde basándote en tu conocimiento general sobre cuidado infantil.'}

Instrucciones:
- Responde de manera clara, empática y práctica
- Si mencionas información del contexto, puedes referenciar la fuente
- Si no tienes información específica, sé honesto al respecto
- Proporciona consejos accionables cuando sea apropiado
- Mantén un tono profesional pero cálido`;

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      {
        role: "user" as const,
        content: query
      }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";
    } catch (error) {
      console.error("Error generando respuesta:", error);
      throw new Error("Error al procesar la consulta");
    }
  }
}

let chatAgent: ChatAgent | null = null;

export function getChatAgent(): ChatAgent {
  if (!chatAgent) {
    chatAgent = new ChatAgent();
  }
  return chatAgent;
} 