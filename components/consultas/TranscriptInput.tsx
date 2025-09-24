// Componente para input de transcript con opción de grabación
// Permite texto manual o grabación de audio con transcripción automática

"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { 
  Mic, 
  MicOff, 
  Upload, 
  FileAudio, 
  Loader2, 
  Play, 
  Pause,
  Trash2,
  Download,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { createLogger } from "@/lib/logger"
import { ZoomTranscriptsList } from "@/components/consultas/ZoomTranscriptsList"

const logger = createLogger("TranscriptInput")


interface TranscriptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function TranscriptInput({ value, onChange, disabled = false }: TranscriptInputProps) {
  const { toast } = useToast()
  
  // Estados para grabación
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  // Estados para transcripción
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)
  
  // Estados para reproducción
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Referencias
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Iniciar grabación
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
        // Detener el stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      toast({
        title: "Grabación iniciada",
        description: "Habla claramente hacia el micrófono.",
      })
      
    } catch (error) {
      logger.error("Error al iniciar grabación:", error)
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono. Verifica los permisos.",
        variant: "destructive",
      })
    }
  }

  // Pausar/Reanudar grabación
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return
    
    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Detener grabación
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      toast({
        title: "Grabación finalizada",
        description: "Ahora puedes transcribir el audio o grabarlo nuevamente.",
      })
    }
  }

  // Reproducir/Pausar audio
  const togglePlayback = () => {
    if (!audioUrl) return
    
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Transcribir audio
  const transcribeAudio = async () => {
    if (!audioBlob) {
      toast({
        title: "Error",
        description: "No hay audio para transcribir.",
        variant: "destructive",
      })
      return
    }

    setIsTranscribing(true)
    setTranscriptionProgress(0)

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      // Simular progreso
      const progressInterval = setInterval(() => {
        setTranscriptionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch("/api/transcript", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setTranscriptionProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error en la transcripción")
      }

      const result = await response.json()
      
      // Agregar el transcript al valor existente
      const newValue = value ? `${value}\n\n--- TRANSCRIPT DE AUDIO ---\n${result.transcript}` : result.transcript
      onChange(newValue)
      
      toast({
        title: "Transcripción completada",
        description: `Se transcribieron ${result.metadata?.duration || "varios"} segundos de audio.`,
      })

    } catch (error) {
      logger.error("Error en transcripción:", error)
      toast({
        title: "Error en transcripción",
        description: error instanceof Error ? error.message : "No se pudo transcribir el audio.",
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
      setTranscriptionProgress(0)
    }
  }

  // Descargar audio
  const downloadAudio = () => {
    if (!audioUrl) return
    
    const a = document.createElement("a")
    a.href = audioUrl
    a.download = `grabacion-${new Date().toISOString().slice(0, 19)}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Limpiar grabación
  const clearRecording = () => {
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  // Formatear tiempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      {/* Input de texto */}
      <div className="space-y-2">
        <Label htmlFor="transcript">Transcript de la Consulta</Label>
        <Textarea
          id="transcript"
          placeholder="Pega aquí el transcript de la consulta o úsalo en combinación con la grabación de audio..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-[200px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {value.length} caracteres
        </p>
      </div>

      {/* Panel de grabación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Grabación de Audio
          </CardTitle>
          <CardDescription>
            Graba directamente la consulta y transcríbela automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles de grabación */}
          {!isRecording && !audioBlob && (
            <Button 
              onClick={startRecording} 
              disabled={disabled}
              className="w-full"
            >
              <Mic className="h-4 w-4 mr-2" />
              Iniciar Grabación
            </Button>
          )}

          {isRecording && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Grabando: {formatTime(recordingTime)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={togglePauseRecording} 
                  variant="outline" 
                  className="flex-1"
                >
                  {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {isPaused ? "Reanudar" : "Pausar"}
                </Button>
                
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                  className="flex-1"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              </div>
            </div>
          )}

          {/* Controles de audio grabado */}
          {audioBlob && !isRecording && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileAudio className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Grabación disponible</p>
                  <p className="text-xs text-muted-foreground">
                    Duración: {formatTime(recordingTime)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={togglePlayback} 
                  variant="outline" 
                  size="sm"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button 
                  onClick={downloadAudio} 
                  variant="outline" 
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={clearRecording} 
                  variant="outline" 
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <Button 
                  onClick={transcribeAudio} 
                  disabled={isTranscribing || disabled}
                  className="flex-1"
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileAudio className="h-4 w-4 mr-2" />
                  )}
                  {isTranscribing ? "Transcribiendo..." : "Transcribir Audio"}
                </Button>
              </div>

              {/* Progreso de transcripción */}
              {isTranscribing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Procesando con Gemini AI...</span>
                    <span>{transcriptionProgress}%</span>
                  </div>
                  <Progress value={transcriptionProgress} className="w-full" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcripts recientes de Zoom (solo lectura, con insertar/copiar) */}
      <ZoomTranscriptsList
        onInsert={(text) => {
          const header = "--- TRANSCRIPT DE ZOOM ---\n"
          const newValue = value ? `${value}\n\n${header}${text}` : `${header}${text}`
          onChange(newValue)
        }}
      />
    </div>
  )
}
