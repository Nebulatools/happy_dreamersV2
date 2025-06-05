// Página del asistente IA
// Permite al usuario interactuar con un chatbot basado en OpenAI

"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Send, Bot, Settings, User, Database, FileText } from "lucide-react"
import { DocumentUpload } from "@/components/rag/document-upload"
import { DocumentsList } from "@/components/rag/documents-list"
import { useActiveChild } from "@/context/active-child-context"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  documentsUsed?: number
  sources?: Array<{
    source: string
    type: string
    preview: string
  }>
  childContext?: {
    name: string
    hasPersonalData: boolean
    recentEventsCount: number
  }
}

interface Child {
  _id: string
  firstName: string
  lastName: string
}

export default function AssistantPage() {
  const { data: session } = useSession()
  const { activeChildId } = useActiveChild()
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy la Dra. Mariana, especialista en sueño infantil. Estoy aquí para ayudarte con cualquier duda sobre el descanso de tu pequeño. ¿En qué puedo apoyarte hoy?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAdmin = session?.user?.role === "admin"

  // Cargar información del niño activo cuando cambie
  useEffect(() => {
    const fetchActiveChild = async () => {
      if (!activeChildId) {
        setActiveChild(null)
        return
      }

      try {
        const response = await fetch(`/api/children?id=${activeChildId}`)
        if (response.ok) {
          const child = await response.json()
          setActiveChild(child)
        } else {
          setActiveChild(null)
        }
      } catch (error) {
        console.error('Error cargando información del niño:', error)
        setActiveChild(null)
      }
    }

    fetchActiveChild()
  }, [activeChildId])

  // Scroll al final de los mensajes cuando se añade uno nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    // Añadir mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Preparar historial de conversación (últimos 10 mensajes para mantener contexto sin sobrecargar)
      const conversationHistory = messages
        .slice(-10) // Solo últimos 10 mensajes para evitar tokens excesivos
        .filter(msg => msg.id !== "welcome") // Excluir mensaje de bienvenida
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          childId: activeChildId, // Pasar el ID del niño activo
          conversationHistory // Enviar historial para mantener contexto
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Añadir respuesta del asistente
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
          documentsUsed: result.documentsUsed || 0,
          sources: result.sources || [],
          childContext: result.childContext
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error(result.error || 'Error en la respuesta')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo conectar con el asistente. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDocuments = () => {
    // Esta función se llama cuando se sube un nuevo documento
    // Los componentes DocumentUpload y DocumentsList la usan para sincronizarse
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asistente IA Mejorado</h1>
        <p className="text-muted-foreground">
          Consulta con nuestro asistente especializado con acceso a documentos de conocimiento
          {activeChild && (
            <span className="block mt-1 text-sm font-medium text-primary">
              💡 El asistente tiene acceso a la información de {activeChild.firstName} {activeChild.lastName}
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Chat
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="configuracion" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="chat">
          <Card className="h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <CardTitle>Chat con el asistente</CardTitle>
              <CardDescription>
                Haz preguntas sobre el sueño de tus hijos y recibe consejos basados en documentos especializados
                {activeChild && (
                  <span className="block mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <User className="inline h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-blue-900 font-medium">
                      Contexto activo: <strong>{activeChild.firstName} {activeChild.lastName}</strong>
                    </span>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-6 pb-8">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-4 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                          {message.role === "assistant" ? (
                            <>
                              <AvatarImage src="/futuristic-helper-robot.png" alt="Asistente" />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">AI</AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src="/placeholder.svg" alt="Usuario" />
                              <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">U</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        
                        <div className={`rounded-2xl px-5 py-4 shadow-md ${
                          message.role === "assistant" 
                            ? "bg-white border border-gray-200" 
                            : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                        }`}>
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                            message.role === "assistant" ? "text-gray-800" : "text-white"
                          }`}>
                            {message.content}
                          </p>
                          
                          {/* Indicador de fuente de información para respuestas del asistente */}
                          {message.role === "assistant" && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {/* Información de documentos RAG */}
                                {message.documentsUsed && message.documentsUsed > 0 ? (
                                  <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium">
                                    <FileText className="h-3 w-3" />
                                    <span>{message.documentsUsed} documento{message.documentsUsed > 1 ? 's' : ''}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium">
                                    <span>🧠</span>
                                    <span>Conocimiento general</span>
                                  </div>
                                )}

                                {/* Información de contexto personal */}
                                {message.childContext && (
                                  <div className="flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full font-medium">
                                    <Database className="h-3 w-3" />
                                    <span>
                                      Datos de {message.childContext.name}
                                      {message.childContext.recentEventsCount > 0 && 
                                        ` (${message.childContext.recentEventsCount} eventos recientes)`
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Fuentes específicas de documentos */}
                              {message.sources && message.sources.length > 0 && (
                                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                                  <strong>Fuentes:</strong> {message.sources.map(s => s.source).join(', ')}
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-400 mt-2" suppressHydrationWarning={true}>
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          )}
                          
                          {message.role === "user" && (
                            <p className="text-xs opacity-70 mt-2" suppressHydrationWarning={true}>
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicador de "escribiendo..." cuando está cargando */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-4 max-w-[85%]">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                          <AvatarImage src="/futuristic-helper-robot.png" alt="Asistente" />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">AI</AvatarFallback>
                        </Avatar>
                        <div className="rounded-2xl px-5 py-4 bg-white border border-gray-200 shadow-md">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></div>
                            </div>
                            <p className="text-sm text-gray-600">está escribiendo...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
              <form onSubmit={handleSendMessage} className="flex w-full gap-3">
                <div className="flex-1 relative">
                  <Input
                    placeholder={
                      activeChild 
                        ? `Pregunta sobre ${activeChild.firstName}...` 
                        : "Escribe tu mensaje..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="pr-12 py-3 text-base rounded-full border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={isLoading || !input.trim()}
                  className="rounded-full px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Enviar mensaje</span>
                </Button>
              </form>
            </CardFooter>
          </Card>
        </TabsContent>

        {session?.user?.role === 'admin' && (
          <TabsContent value="configuracion" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DocumentUpload onUploadSuccess={refreshDocuments} />
              <DocumentsList onDocumentDeleted={refreshDocuments} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
