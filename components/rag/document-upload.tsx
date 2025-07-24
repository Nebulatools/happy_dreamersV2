"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, Loader2, FileIcon } from "lucide-react"

interface DocumentUploadProps {
  onUploadSuccess?: () => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const handleFile = async (file: File) => {
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = [".txt", ".md", ".pdf"]
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Tipo de archivo no válido",
        description: `Solo se permiten archivos: ${allowedTypes.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo debe ser menor a 100MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "🚀 Documento procesado",
          description: `${result.chunksAdded} chunks guardados en MongoDB. Tipo: ${result.fileType}`,
        })
        onUploadSuccess?.()
      } else {
        throw new Error(result.error || "Error subiendo documento")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error subiendo documento",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Documentos al Vector Store
        </CardTitle>
        <CardDescription>
          Sube documentos (.txt, .md, .pdf) para mejorar las respuestas del asistente con búsqueda semántica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Procesando con embeddings y Vector Store...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <FileIcon className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-medium">Arrastra y suelta un archivo aquí</p>
                <p className="text-sm text-muted-foreground">
                  Formatos: .txt, .md, .pdf (máx. 100MB)
                </p>
              </div>
              <Input
                type="file"
                accept=".txt,.md,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Seleccionar archivo
                </label>
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="text-center p-2 bg-gray-50 rounded">
            <FileText className="h-4 w-4 mx-auto mb-1" />
            <span>.txt .md</span>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <FileIcon className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <span>.pdf ✅</span>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <Upload className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <span>100MB máx</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 