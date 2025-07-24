// Componente de formulario para las rutinas de sueño
// Cuarta sección de la encuesta

"use client"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

const sleepRoutineSchema = z.object({
  daily_routine: z.string().optional(),
  daycare: z.string().optional(),
  primary_caregiver: z.string(),
  night_caregiver: z.string(),
  night_sleep_location_when_out: z.string().optional(),
  room_darkness: z.array(z.string()).optional(),
  white_noise: z.string().optional(),
  room_temperature: z.string().optional(),
  pajama_type: z.string().optional(),
  sleep_sack: z.string().optional(),
  bedtime_routine: z.string(),
  bedtime: z.string(),
  self_soothing: z.string(),
  parent_present: z.string(),
  sleep_location: z.array(z.string()),
  room_sharing: z.string().optional(),
  crib_escape: z.string().optional(),
  night_moving: z.string().optional(),
  separation_anxiety: z.string().optional(),
  body_rocking: z.string().optional(),
  night_wakings: z.string(),
  dark_fear: z.string().optional(),
  parent_dark_fear: z.string().optional(),
  child_temperament: z.string().optional(),
  alone_reaction: z.string().optional(),
  self_soothing_method: z.string().optional(),
  naps: z.string(),
  siblings_sleep_issues: z.string().optional(),
  travel_sleep_location: z.string().optional(),
  travel_sleep_quality: z.string().optional(),
  parent_participation: z.string(),
  sleep_goals: z.string(),
  additional_info: z.string().optional(),
})

type SleepRoutineFormValues = z.infer<typeof sleepRoutineSchema>

interface SleepRoutineFormProps {
  onDataChange: (data: SleepRoutineFormValues) => void
  isSubmitting?: boolean
  initialData?: Partial<SleepRoutineFormValues>
}

export function SleepRoutineForm({ onDataChange, isSubmitting = false, initialData = {} }: SleepRoutineFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  
  const form = useForm<SleepRoutineFormValues>({
    resolver: zodResolver(sleepRoutineSchema),
    defaultValues: {
      daily_routine: initialData.daily_routine || "",
      daycare: initialData.daycare || "",
      primary_caregiver: initialData.primary_caregiver || "",
      night_caregiver: initialData.night_caregiver || "",
      night_sleep_location_when_out: initialData.night_sleep_location_when_out || "",
      room_darkness: initialData.room_darkness || [],
      white_noise: initialData.white_noise || "",
      room_temperature: initialData.room_temperature || "",
      pajama_type: initialData.pajama_type || "",
      sleep_sack: initialData.sleep_sack || "",
      bedtime_routine: initialData.bedtime_routine || "",
      bedtime: initialData.bedtime || "",
      self_soothing: initialData.self_soothing || "",
      parent_present: initialData.parent_present || "",
      sleep_location: initialData.sleep_location || [],
      room_sharing: initialData.room_sharing || "",
      crib_escape: initialData.crib_escape || "",
      night_moving: initialData.night_moving || "",
      separation_anxiety: initialData.separation_anxiety || "",
      body_rocking: initialData.body_rocking || "",
      night_wakings: initialData.night_wakings || "",
      dark_fear: initialData.dark_fear || "",
      parent_dark_fear: initialData.parent_dark_fear || "",
      child_temperament: initialData.child_temperament || "",
      alone_reaction: initialData.alone_reaction || "",
      self_soothing_method: initialData.self_soothing_method || "",
      naps: initialData.naps || "",
      siblings_sleep_issues: initialData.siblings_sleep_issues || "",
      travel_sleep_location: initialData.travel_sleep_location || "",
      travel_sleep_quality: initialData.travel_sleep_quality || "",
      parent_participation: initialData.parent_participation || "",
      sleep_goals: initialData.sleep_goals || "",
      additional_info: initialData.additional_info || "",
    },
  })

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          form.setValue(key as keyof SleepRoutineFormValues, value as any)
        }
      })
    }
  }, [initialData, form])

  // Nuevo manejador de envío con feedback visual
  const onSubmit = (data: SleepRoutineFormValues) => {
    // No iniciar guardado si isSubmitting es true (se está enviando toda la encuesta)
    if (isSubmitting) return
    
    setIsSaving(true)
    
    // Simulamos un pequeño delay para mostrar el estado "guardando"
    setTimeout(() => {
      onDataChange(data)
      setIsSaving(false)
      
      // Mostrar mensaje de guardado durante 2 segundos
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    }, 500)
  }

  const caregiverOptions = [
    { id: "mother", label: "Madre" },
    { id: "father", label: "Padre" },
    { id: "both", label: "Ambos padres" },
    { id: "grandparent", label: "Abuelo(a)" },
    { id: "other_relative", label: "Otro familiar" },
    { id: "nanny", label: "Niñera" },
    { id: "other", label: "Otro" },
  ]

  const sleepLocationOptions = [
    { id: "cama_cuarto", label: "Cama en su cuarto" },
    { id: "cama_cuartoPadres", label: "Cama en su cuarto con alguno de los padres" },
    { id: "cuna_cuarto", label: "Cuna/corral en su cuarto" },
    { id: "cuna_papas", label: "Cuna/corral en cuarto de papás" },
    { id: "cama_papas", label: "Cama de papás" },
    { id: "cuna_camaPadres", label: "Primero en su cuna/corral y luego a cama de papás" },
    { id: "cama_camaPadres", label: "Primero en su cama y luego a cama de papás" },
  ]

  const roomDarknessOptions = [
    { id: "completamente_oscuro", label: "Completamente oscuro" },
    { id: "algo_oscuro", label: "Algo oscuro" },
    { id: "luz_tenue", label: "Luz tenue" },
    { id: "luz_noche", label: "Luz de noche" },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rutina diaria y ambiente de sueño</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="daily_routine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rutina diaria</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe la rutina diaria del niño" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedtime_routine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rutina antes de dormir</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe la rutina antes de dormir" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedtime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de acostarse</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="room_temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura de la habitación (°C)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Temperatura" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="white_noise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Usa ruido blanco?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pajama_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de pijama</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe el tipo de pijama" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="room_darkness"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>Oscuridad de la habitación</FormLabel>
                  <FormDescription>Selecciona todas las opciones que apliquen</FormDescription>
                </div>
                <div className="space-y-2">
                  {roomDarknessOptions.map((option) => (
                    <FormField
                      key={option.id}
                      control={form.control}
                      name="room_darkness"
                      render={({ field }) => {
                        return (
                          <FormItem key={option.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), option.id])
                                    : field.onChange(field.value?.filter((value) => value !== option.id))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{option.label}</FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Hábitos de sueño</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="self_soothing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Se calma solo?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_present"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Padre presente hasta que se duerme?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="night_wakings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Despertares nocturnos?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="naps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Toma siestas?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_participation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Participación de ambos padres?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="self_soothing_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método para calmarse solo</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe el método" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="sleep_location"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>Ubicación para dormir</FormLabel>
                  <FormDescription>Selecciona todas las opciones que apliquen</FormDescription>
                </div>
                <div className="space-y-2">
                  {sleepLocationOptions.map((option) => (
                    <FormField
                      key={option.id}
                      control={form.control}
                      name="sleep_location"
                      render={({ field }) => {
                        return (
                          <FormItem key={option.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), option.id])
                                    : field.onChange(field.value?.filter((value) => value !== option.id))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{option.label}</FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sleep_goals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metas de sueño</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="¿Qué metas tienes para mejorar el sueño de tu hijo?"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="additional_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Información adicional</FormLabel>
                <FormControl>
                  <Textarea placeholder="Cualquier información adicional relevante" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end relative">
            <Button 
              type="submit" 
              disabled={isSaving || isSubmitting}
              className="bg-green-600 hover:bg-green-700 transition-all relative"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Enviando encuesta...</span>
              ) : isSaving ? (
                <>
                  <span className="animate-pulse">Guardando...</span>
                  <span className="absolute inset-0 bg-green-500/20 rounded animate-pulse"></span>
                </>
              ) : showSaved ? (
                <>
                  ✓ Guardado
                </>
              ) : (
                "Guardar rutina de sueño"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
