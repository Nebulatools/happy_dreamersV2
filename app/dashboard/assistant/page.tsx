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
import { Send, Bot, Settings } from "lucide-react"
import { DocumentUpload } from "@/components/rag/document-upload"
import { DocumentsList } from "@/components/rag/documents-list"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function AssistantPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hola, soy tu asistente mejorado de Happy Dreamers. Ahora puedo acceder a documentos especializados para brindarte mejores consejos sobre el sueño infantil. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAdmin = session?.user?.role === "admin"

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
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      })

      const result = await response.json()

      if (response.ok) {
        // Añadir respuesta del asistente
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
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
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle>Chat con el asistente</CardTitle>
              <CardDescription>
                Haz preguntas sobre el sueño de tus hijos y recibe consejos basados en documentos especializados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-20rem)] px-4">
                <div className="space-y-4 pt-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8">
                          {message.role === "assistant" ? (
                            <>
                              <AvatarImage src="/futuristic-helper-robot.png" alt="Asistente" />
                              <AvatarFallback>AI</AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src="/placeholder.svg" alt="Usuario" />
                              <AvatarFallback>U</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-50 mt-1" suppressHydrationWarning={true}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicador de "escribiendo..." cuando está cargando */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/futuristic-helper-robot.png" alt="Asistente" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg px-4 py-2 bg-muted">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></div>
                            </div>
                            <p className="text-sm text-muted-foreground">está escribiendo...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                <Input
                  placeholder="Escribe tu mensaje..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon">
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
