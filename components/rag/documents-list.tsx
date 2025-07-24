"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { FileText, Trash2, Calendar, Database, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Document {
  id: string;
  source: string;
  type: string;
  uploadDate: string;
  extractedWith?: string;
  size: number;
  createdAt: string;
}

interface DocumentsListProps {
  onDocumentDeleted?: () => void;
}

export function DocumentsList({ onDocumentDeleted }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const { toast } = useToast()

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/rag/documents")
      const data = await response.json()

      if (response.ok) {
        const uniqueDocuments = data.documents.reduce((acc: Document[], current: Document) => {
          const existingDoc = acc.find(doc => doc.source === current.source)
          if (!existingDoc) {
            acc.push(current)
          } else {
            if (new Date(current.createdAt) > new Date(existingDoc.createdAt)) {
              const index = acc.findIndex(doc => doc.source === current.source)
              acc[index] = current
            }
          }
          return acc
        }, [])

        setDocuments(uniqueDocuments)
        setTotalCount(uniqueDocuments.length)
      } else {
        throw new Error(data.error || "Error cargando documentos")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error cargando documentos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteDocument = async (documentId: string, fileName: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar "${fileName}"?`)) {
      return
    }

    try {
      setDeleting(documentId)
      const response = await fetch(`/api/rag/documents?id=${documentId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "🗑️ Documento eliminado",
          description: `"${fileName}" ha sido eliminado del vector store`,
        })
        fetchDocuments()
        onDocumentDeleted?.()
      } else {
        throw new Error(data.error || "Error eliminando documento")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error eliminando documento",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const clearAllDocuments = async () => {
    if (!confirm("¿Estás seguro que deseas ELIMINAR TODOS los documentos del vector store? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      setClearing(true)
      const response = await fetch("/api/rag/clear", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "🧹 Vector store limpiado",
          description: "Todos los documentos han sido eliminados",
        })
        fetchDocuments()
        onDocumentDeleted?.()
      } else {
        throw new Error(data.error || "Error limpiando vector store")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error limpiando vector store",
        variant: "destructive",
      })
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i]
  }

  const getFileTypeIcon = (type: string) => {
    switch(type) {
    case ".pdf": return "📄"
    case ".txt": return "📝"
    case ".md": return "📋"
    default: return "📄"
    }
  }

  const getExtractedWithBadge = (extractedWith?: string) => {
    switch(extractedWith) {
    case "gemini": return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Gemini AI</Badge>
    case "text": return <Badge variant="secondary" className="bg-green-100 text-green-800">Texto plano</Badge>
    default: return <Badge variant="outline">Desconocido</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando documentos...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Documentos en Vector Store ({totalCount})
            </CardTitle>
            <CardDescription>
              Documentos disponibles para consultas RAG en MongoDB
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDocuments}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            {totalCount > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearAllDocuments}
                disabled={clearing}
              >
                {clearing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Limpiar Todo
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No hay documentos subidos</p>
            <p className="text-sm">Sube algunos documentos para empezar a usar RAG</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl">
                    {getFileTypeIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{doc.source}</h4>
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                      {getExtractedWithBadge(doc.extractedWith)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(doc.createdAt)}
                      </span>
                      <span>{formatFileSize(doc.size)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(doc.id, doc.source)}
                  disabled={deleting === doc.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 