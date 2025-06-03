import { OpenAI } from "openai";
import { Document } from "@langchain/core/documents";
import { getDoctorSystemPrompt } from "./doctor-personality";

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

    // Usar el prompt de la doctora personalizado
    const systemPrompt = getDoctorSystemPrompt(context);

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
        max_tokens: 300, // ✅ REDUCIDO de 800 a 300 para respuestas más cortas
        temperature: 0.8, // ✅ AUMENTADO de 0.7 a 0.8 para más naturalidad
        presence_penalty: 0.1, // ✅ Evita repetición
        frequency_penalty: 0.1, // ✅ Evita patrones robóticos
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