// Tab de documentos - Subir, listar y eliminar archivos adjuntos del nino
// Solo accesible por admin. Almacenamiento en Vercel Blob.

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { FileText, Image, Plus, Trash2, Eye, Upload, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { createLogger } from "@/lib/logger"

const logger = createLogger("DocumentosTab")

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png"

interface DocumentRecord {
  _id: string
  childId: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string
  uploadedAt: string
}

interface DocumentosTabProps {
  childId: string
}

// Formatear bytes a texto legible
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Formatear fecha
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default function DocumentosTab({ childId }: DocumentosTabProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fetchDocuments = useCallback(async () => {
    if (!childId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/children/${childId}/documents`)
      if (!res.ok) throw new Error("Error al obtener documentos")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (err) {
      logger.error("Error fetching documents:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [childId, toast])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleFileUpload = async (file: File) => {
    // Validar tipo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo no permitido",
        description: "Solo se aceptan archivos PDF, JPG y PNG.",
        variant: "destructive",
      })
      return
    }

    // Validar tamano
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Archivo muy grande",
        description: "El tamano maximo permitido es 10MB.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/children/${childId}/documents`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al subir archivo")
      }

      toast({
        title: "Documento subido",
        description: `${file.name} se subio correctamente.`,
      })

      setUploadDialogOpen(false)
      await fetchDocuments()
    } catch (err) {
      logger.error("Error uploading document:", err)
      toast({
        title: "Error al subir",
        description: err instanceof Error ? err.message : "No se pudo subir el archivo",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const res = await fetch(
        `/api/children/${childId}/documents?documentId=${deleteTarget._id}`,
        { method: "DELETE" }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al eliminar")
      }

      toast({
        title: "Documento eliminado",
        description: `${deleteTarget.fileName} se elimino correctamente.`,
      })

      setDeleteTarget(null)
      await fetchDocuments()
    } catch (err) {
      logger.error("Error deleting document:", err)
      toast({
        title: "Error al eliminar",
        description: err instanceof Error ? err.message : "No se pudo eliminar el documento",
        variant: "destructive",
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    // Resetear input para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const isImage = (fileType: string) =>
    fileType.startsWith("image/")

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Cargando documentos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Documentos</h3>
        <Button
          size="sm"
          onClick={() => setUploadDialogOpen(true)}
          className="hd-gradient-button text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Subir documento
        </Button>
      </div>

      {/* Lista de documentos */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No hay documentos. Usa el boton + para subir estudios medicos, recetas u otros documentos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {/* Icono de tipo */}
                  <div className="shrink-0">
                    {isImage(doc.fileType) ? (
                      <Image className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  {/* Info del archivo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.fileUrl, "_blank")}
                      title="Ver documento"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(doc)}
                      title="Eliminar documento"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de subida */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
          </DialogHeader>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Subiendo archivo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    Arrastra un archivo aqui o
                  </p>
                  <Button
                    variant="link"
                    className="text-blue-600 p-0 h-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    selecciona desde tu dispositivo
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  PDF, JPG o PNG. Maximo 10MB.
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileInputChange}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmacion de eliminacion */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara permanentemente &quot;{deleteTarget?.fileName}&quot;. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
