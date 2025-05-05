// Componente de formulario para la historia del niño
// Segunda sección de la encuesta

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

const childHistorySchema = z.object({
  child_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  child_last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  birth_date: z.string(),
  weight: z.string().optional(),
  weight_percentile: z.string().optional(),
  full_term: z.string().optional(),
  birth_problems: z.string().optional(),
  child_temperament: z.string().optional(),
  daycare: z.string().optional(),
  feeding_type: z.string().optional(),
  eats_solids: z.string().optional(),
  uses_cup: z.array(z.string()).optional(),
  additional_info: z.string().optional(),
})

type ChildHistoryFormValues = z.infer<typeof childHistorySchema>

interface ChildHistoryFormProps {
  onSubmit: (data: ChildHistoryFormValues) => void;
  initialData?: Partial<ChildHistoryFormValues>;
}

export function ChildHistoryForm({ onSubmit, initialData = {} }: ChildHistoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ChildHistoryFormValues>({
    resolver: zodResolver(childHistorySchema),
    defaultValues: {
      child_name: initialData.child_name || "",
      child_last_name: initialData.child_last_name || "",
      birth_date: initialData.birth_date || "",
      weight: initialData.weight || "",
      weight_percentile: initialData.weight_percentile || "",
      full_term: initialData.full_term || "",
      birth_problems: initialData.birth_problems || "",
      child_temperament: initialData.child_temperament || "",
      daycare: initialData.daycare || "",
      feeding_type: initialData.feeding_type || "",
      eats_solids: initialData.eats_solids || "",
      uses_cup: initialData.uses_cup || [],
      additional_info: initialData.additional_info || "",
    },
  })
  
  // Actualizar el formulario si cambian los initialData
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          form.setValue(key as any, value as any);
        }
      });
    }
  }, [initialData, form]);

  const handleSubmit = (data: ChildHistoryFormValues) => {
    setIsSubmitting(true)
    // Enviar los datos
    setTimeout(() => {
      onSubmit(data)
      setIsSubmitting(false)
    }, 500)
  }

  const cupOptions = [
    { id: "cup", label: "Vaso" },
    { id: "biberon", label: "Biberón" },
    { id: "ninguno", label: "Nada" },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="child_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del niño</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="child_last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido del niño</FormLabel>
                <FormControl>
                  <Input placeholder="Apellido" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birth_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de nacimiento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Peso en kg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight_percentile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Percentil de peso</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Percentil" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="full_term"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Nacimiento a término?</FormLabel>
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
            name="birth_problems"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Problemas al nacer?</FormLabel>
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
            name="child_temperament"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperamento del niño</FormLabel>
                <FormControl>
                  <Input placeholder="Temperamento" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="daycare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Asiste a guardería?</FormLabel>
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
            name="feeding_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de alimentación</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="formula">Fórmula</SelectItem>
                    <SelectItem value="leche_materna">Leche Materna Exclusiva</SelectItem>
                    <SelectItem value="leche_formula">Leche y Fórmula</SelectItem>
                    <SelectItem value="ninguna">Ninguna</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="eats_solids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Come sólidos?</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="uses_cup"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Uso de vaso/biberón</FormLabel>
                <FormDescription>Selecciona todas las opciones que apliquen</FormDescription>
              </div>
              <div className="space-y-2">
                {cupOptions.map((option) => (
                  <FormField
                    key={option.id}
                    control={form.control}
                    name="uses_cup"
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

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
