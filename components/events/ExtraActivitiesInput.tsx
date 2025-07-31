// Componente para entrada de descripción de actividades extra con opción de audio
// Adaptado de TranscriptInput para uso en EventRegistrationModal

"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Play, 
  Pause,
  Trash2,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { createLogger } from "@/lib/logger"

const logger = createLogger("ExtraActivitiesInput")

interface ExtraActivitiesInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ExtraActivitiesInput({ value, onChange, disabled = false }: ExtraActivitiesInputProps) {
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
      
      // Reemplazar el contenido con la transcripción
      onChange(result.transcript)
      
      toast({
        title: "Transcripción completada",
        description: "Puedes editar el texto si es necesario.",
      })

      // Limpiar el audio después de transcribir
      clearRecording()

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
    <div className="space-y-3">
      {/* Textarea para descripción */}
      <div className="space-y-2">
        <Textarea
          placeholder="Describe las actividades del día que pueden haber afectado el sueño del niño. Por ejemplo: 'Fuimos al parque por 2 horas', 'Visitó a los abuelos', 'Tuvo mucha actividad física', 'Comió dulces en una fiesta'..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isRecording}
          className="min-h-[120px] resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {value.length} caracteres
        </p>
      </div>

      {/* Controles de audio */}
      <div className="space-y-3 bg-gray-50 rounded-lg p-3">
        {/* Botón de grabación cuando no hay audio */}
        {!isRecording && !audioBlob && (
          <Button 
            type="button"
            onClick={startRecording} 
            disabled={disabled}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Mic className="h-4 w-4 mr-2" />
            Grabar con Audio
          </Button>
        )}

        {/* Controles durante la grabación */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Grabando: {formatTime(recordingTime)}</span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button"
                onClick={togglePauseRecording} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              
              <Button 
                type="button"
                onClick={stopRecording} 
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                <MicOff className="h-4 w-4 mr-1" />
                Detener
              </Button>
            </div>
          </div>
        )}

        {/* Controles con audio grabado */}
        {audioBlob && !isRecording && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span>Audio grabado ({formatTime(recordingTime)})</span>
            </div>

            <div className="flex gap-2">
              <Button 
                type="button"
                onClick={togglePlayback} 
                variant="outline" 
                size="sm"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button 
                type="button"
                onClick={clearRecording} 
                variant="outline" 
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button 
                type="button"
                onClick={transcribeAudio} 
                disabled={isTranscribing || disabled}
                size="sm"
                className="flex-1"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transcribiendo...
                  </>
                ) : (
                  "Transcribir"
                )}
              </Button>
            </div>

            {/* Progreso de transcripción */}
            {isTranscribing && (
              <div className="space-y-1">
                <Progress value={transcriptionProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Procesando audio...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}