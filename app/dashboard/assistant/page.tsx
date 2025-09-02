// Página del Asistente Happy Dreamers según diseño de Figma
// Chat interactivo con el asistente de sueño infantil

"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { 
  Send, 
  Paperclip, 
  Mic, 
  Bot, 
  MoreHorizontal,
  HelpCircle,
  Settings,
  Upload,
  Trash2,
  FileText,
  MessageSquare,
  Info,
} from "lucide-react"
import { useActiveChild } from "@/context/active-child-context"
import { cn } from "@/lib/utils"
import { GoogleDriveSync } from "@/components/rag/google-drive-sync"
import { ChildPlan } from "@/types/models"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  documentsUsed?: number
  sources?: Array<{source: string, type: string, preview: string}>
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

const quickSuggestions = [
  "Rutinas de sueño",
  "Pesadillas",
  "Siestas",
]

export default function AssistantPage() {
  const { data: session } = useSession()
  const { activeChildId } = useActiveChild()
  const sessionId = useRef<string>(crypto.randomUUID())
  const [childData, setChildData] = useState<Child | null>(null)
  const [currentPlan, setCurrentPlan] = useState<ChildPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy el asistente de Happy Dreamers. Estoy aquí para ayudarte con cualquier consulta sobre el sueño de tu hijo/a. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = session?.user?.role === "admin"

  // Reiniciar sessionId cuando se monta el componente (nueva sesión)
  useEffect(() => {
    sessionId.current = crypto.randomUUID()
    logger.info(`Nueva sesión del asistente iniciada: ${sessionId.current}`)
  }, [])

  // Cargar información del niño activo
  useEffect(() => {
    const fetchActiveChild = async () => {
      if (!activeChildId) {
        setChildData(null)
        setCurrentPlan(null)
        return
      }

      try {
        const response = await fetch(`/api/children?id=${activeChildId}`)
        if (response.ok) {
          const result = await response.json()
          const child = result.data || result
          setChildData(child)
          
          // Cargar el plan activo del niño
          await loadActivePlan(activeChildId, child.parentId)
        } else {
          setChildData(null)
          setCurrentPlan(null)
        }
      } catch (error) {
        logger.error("Error cargando información del niño:", error)
        setChildData(null)
        setCurrentPlan(null)
      }
    }

    fetchActiveChild()
  }, [activeChildId])

  // Función para cargar el plan activo del niño
  const loadActivePlan = async (childId: string, userId: string) => {
    try {
      setLoadingPlan(true)
      const response = await fetch(`/api/consultas/plans?childId=${childId}&userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        const plans = data.plans || []
        
        // Buscar el plan activo (status: "active") o el más reciente
        const activePlan = plans.find((plan: ChildPlan) => plan.status === "active") || 
                          plans[plans.length - 1] // El último si no hay activo
        
        setCurrentPlan(activePlan || null)
        
        if (activePlan) {
          logger.info(`Plan activo cargado: Plan ${activePlan.planNumber}`)
        } else {
          logger.info("No se encontró plan activo para este niño")
        }
      } else {
        logger.warn("Error cargando planes del niño")
        setCurrentPlan(null)
      }
    } catch (error) {
      logger.error("Error cargando plan activo:", error)
      setCurrentPlan(null)
    } finally {
      setLoadingPlan(false)
    }
  }

  // Auto-scroll a mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Cargar documentos RAG si es admin
  useEffect(() => {
    if (isAdmin) {
      loadDocuments()
    }
  }, [isAdmin])

  const loadDocuments = async () => {
    if (!isAdmin) return
    
    try {
      setLoadingDocs(true)
      const response = await fetch("/api/rag/documents")
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      logger.error("Error cargando documentos:", error)
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/rag/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Error uploading ${file.name}`)
        }
      }

      toast({
        title: "Documentos subidos",
        description: `Se subieron ${files.length} documento(s) exitosamente.`,
      })
      
      loadDocuments() // Recargar lista
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir los documentos.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/rag/documents?id=${documentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Documento eliminado",
          description: "El documento se eliminó exitosamente.",
        })
        loadDocuments() // Recargar lista
      } else {
        throw new Error("Error eliminando documento")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim()) return

    // 🚫 Verificar que hay un niño activo seleccionado
    if (!activeChildId || !childData) {
      toast({
        title: "Sin niño seleccionado",
        description: "Por favor selecciona un niño desde el menú superior para usar el asistente.",
        variant: "destructive",
      })
      return
    }

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

      const conversationHistory = messages
        .slice(-6)  // Optimizado: solo últimos 6 mensajes (más eficiente)
        .filter(msg => msg.id !== "welcome")
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }))

      const response = await fetch("/api/rag/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          childId: childData?._id,
          conversationHistory: conversationHistory,
          sessionId: sessionId.current,
          currentPlan: currentPlan,
        }),
      })

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor")
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        documentsUsed: data.documentsUsed || 0,
        sources: data.sources || [],
        childContext: data.childContext,
      }

      setMessages((prev) => [...prev, assistantMessage])
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

  const handleQuickSuggestion = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const handleRecordToggle = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      toast({
        title: "Grabación iniciada",
        description: "Habla cerca del micrófono",
      })
    } else {
      toast({
        title: "Grabación detenida",
        description: "Procesando audio...",
      })
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "¡Hola! Soy el asistente de Happy Dreamers. Estoy aquí para ayudarte con cualquier consulta sobre el sueño de tu hijo/a. ¿En qué puedo ayudarte hoy?",
        timestamp: new Date(),
      },
    ])
    // Reiniciar sessionId para nueva conversación
    sessionId.current = crypto.randomUUID()
    toast({
      title: "Chat reiniciado",
      description: "Se ha iniciado una nueva conversación.",
    })
  }

  const handleShowInfo = () => {
    toast({
      title: "Información del Asistente",
      description: "El asistente usa inteligencia artificial para responder consultas sobre sueño infantil basándose en documentos especializados.",
    })
  }

  const formatContent = (content: string) => {
    // Dividir el contenido en secciones si contiene listas
    const lines = content.split("\n")
    return lines.map((line, index) => {
      if (line.trim().startsWith("•")) {
        return (
          <li key={index} className="ml-4 mb-1">
            {line.substring(1).trim()}
          </li>
        )
      }
      return <p key={index} className="mb-2">{line}</p>
    })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#2F2F2F]">Asistente Happy Dreamers</h1>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chat
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Documentos
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="drive" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Google Drive
            </TabsTrigger>
          )}
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card className="h-[calc(100vh-16rem)] flex flex-col overflow-hidden">
        {/* Assistant Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Tu Coach de Sueño Virtual</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  {childData 
                    ? `Consultando sobre ${childData.firstName}` 
                    : "Selecciona un niño para comenzar"
                  }
                </p>
                {childData && (
                  <div className="flex items-center gap-2">
                    {loadingPlan ? (
                      <span className="text-gray-400">Cargando plan...</span>
                    ) : currentPlan ? (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Plan {currentPlan.planNumber} Activo
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        Sin plan activo
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearChat}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Limpiar chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShowInfo}>
                <Info className="w-4 h-4 mr-2" />
                Información
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 bg-gray-50/30 chat-messages-scroll">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-[#4A90E2] rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    "rounded-2xl p-4 max-w-[70%]",
                    message.role === "assistant" 
                      ? "chat-bubble-assistant" 
                      : "chat-bubble-user"
                  )}
                >
                  <div className="text-sm">
                    {formatContent(message.content)}
                  </div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <a href="#" className="text-xs text-[#4A90E2] hover:underline">
                        Ver guía completa sobre ambientes de sueño
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-[#4A90E2] rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="chat-bubble-assistant">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggestions */}
        <div className="px-4 py-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Sugerencias:
            </span>
            <div className="flex gap-2">
              {quickSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="text-xs rounded-full"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <input
              ref={inputRef}
              type="text"
              placeholder="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRecordToggle}
              className={cn(
                "text-gray-500",
                isRecording && "text-red-500"
              )}
            >
              <div className="relative">
                <Mic className="w-5 h-5" />
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-500/20 rounded-full animate-ping" />
                  </div>
                )}
              </div>
            </Button>
            
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim() || !childData}
              className="hd-gradient-button text-white rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
          </Card>
        </TabsContent>

        {/* Documentos Tab - Solo para Admins */}
        {isAdmin && (
          <TabsContent value="settings">
            <Card className="h-[calc(100vh-16rem)] flex flex-col overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-[#2F2F2F] flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Gestión de Documentos Individuales
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Sube documentos individuales que usa el asistente para generar respuestas
                </p>
              </div>

              <ScrollArea className="flex-1 p-6">
                {/* Upload Section */}
                <div className="mb-6">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="hd-gradient-button text-white flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Subiendo..." : "Subir Documentos"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.zip"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos soportados: PDF, TXT, MD, DOCX, PPTX, XLSX, PNG, JPG, ZIP
                  </p>
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-[#2F2F2F]">
                    Documentos ({documents.length})
                  </h3>
                  
                  {loadingDocs ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Cargando documentos...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No hay documentos subidos</p>
                      <p className="text-sm">Sube documentos para mejorar las respuestas del asistente</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <div>
                              <p className="font-medium text-sm">{doc.source}</p>
                              <p className="text-xs text-gray-500">
                                {doc.type.toUpperCase()} • {Math.round(doc.size / 1024)} KB
                                {doc.chunksCount && doc.chunksCount > 1 && ` • ${doc.chunksCount} chunks`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        )}

        {/* Google Drive Tab - Solo para Admins */}
        {isAdmin && (
          <TabsContent value="drive">
            <Card className="h-[calc(100vh-16rem)] overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-[#2F2F2F] flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Sincronización con Google Drive
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Sincroniza automáticamente documentos desde Google Drive para el RAG
                </p>
              </div>
              
              <ScrollArea className="flex-1 p-6">
                <GoogleDriveSync />
              </ScrollArea>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}