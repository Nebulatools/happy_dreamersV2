// Página del Asistente Happy Dreamers según diseño de Figma
// Chat interactivo con el asistente de sueño infantil

"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { 
  Send, 
  Paperclip, 
  Mic, 
  Bot, 
  User,
  MoreHorizontal,
  HelpCircle
} from "lucide-react"
import { useActiveChild } from "@/context/active-child-context"
import { cn } from "@/lib/utils"

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
  "Siestas"
]

export default function AssistantPage() {
  const { data: session } = useSession()
  const { activeChildId } = useActiveChild()
  const [activeChild, setActiveChild] = useState<Child | null>(null)
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
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar información del niño activo
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
        }
      } catch (error) {
        console.error('Error cargando información del niño:', error)
        setActiveChild(null)
      }
    }

    fetchActiveChild()
  }, [activeChildId])

  // Auto-scroll a mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim()) return

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
        .slice(-10)
        .filter(msg => msg.id !== "welcome")
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
          childId: activeChild?._id,
          conversationHistory: conversationHistory
        }),
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        documentsUsed: data.documentsUsed || 0,
        sources: data.sources || [],
        childContext: data.childContext
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

  const formatContent = (content: string) => {
    // Dividir el contenido en secciones si contiene listas
    const lines = content.split('\n')
    return lines.map((line, index) => {
      if (line.trim().startsWith('•')) {
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

      {/* Main Chat Container */}
      <Card className="h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
        {/* Assistant Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Tu Coach de Sueño Virtual</h3>
              <p className="text-xs text-gray-500">Disponible 24/7 para ayudarte</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-[#4A90E2] rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    "rounded-2xl p-4 max-w-[70%]",
                    message.role === 'assistant' 
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
              disabled={isLoading || !input.trim()}
              className="hd-gradient-button text-white rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}