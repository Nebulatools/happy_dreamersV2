// Componente de formulario para la información de los padres
// Primera sección de la encuesta

"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const parentInfoSchema = z.object({
  mother_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  mother_age: z.string().optional(),
  mother_occupation: z.string().optional(),
  mother_same_address: z.string().optional(),
  mother_city: z.string().optional(),
  mother_phone: z.string().optional(),
  mother_email: z.string().email("Por favor ingresa un email válido").optional(),
  father_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  father_age: z.string().optional(),
  father_occupation: z.string().optional(),
  father_address: z.string().optional(),
  father_city: z.string().optional(),
  father_phone: z.string().optional(),
  father_email: z.string().email("Por favor ingresa un email válido").optional(),
  referral_source: z.string().optional(),
})

type ParentInfoFormValues = z.infer<typeof parentInfoSchema>

interface ParentInfoFormProps {
  onSubmit: (data: ParentInfoFormValues) => void;
  initialData?: Partial<ParentInfoFormValues>;
}

export function ParentInfoForm({ onSubmit, initialData = {} }: ParentInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ParentInfoFormValues>({
    resolver: zodResolver(parentInfoSchema),
    defaultValues: {
      mother_name: initialData.mother_name || "",
      mother_age: initialData.mother_age || "",
      mother_occupation: initialData.mother_occupation || "",
      mother_same_address: initialData.mother_same_address || "",
      mother_city: initialData.mother_city || "",
      mother_phone: initialData.mother_phone || "",
      mother_email: initialData.mother_email || "",
      father_name: initialData.father_name || "",
      father_age: initialData.father_age || "",
      father_occupation: initialData.father_occupation || "",
      father_address: initialData.father_address || "",
      father_city: initialData.father_city || "",
      father_phone: initialData.father_phone || "",
      father_email: initialData.father_email || "",
      referral_source: initialData.referral_source || "",
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

  const handleSubmit = (data: ParentInfoFormValues) => {
    setIsSubmitting(true)
    // Enviar los datos
    setTimeout(() => {
      onSubmit(data)
      setIsSubmitting(false)
    }, 500)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Información de la Madre</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="mother_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la madre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mother_age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Edad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mother_occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ocupación</FormLabel>
                  <FormControl>
                    <Input placeholder="Ocupación" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mother_same_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Misma dirección que el niño?</FormLabel>
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
              name="mother_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mother_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mother_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Información del Padre</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="father_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del padre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="father_age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Edad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="father_occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ocupación</FormLabel>
                  <FormControl>
                    <Input placeholder="Ocupación" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="father_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="father_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="father_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="father_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="referral_source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>¿Cómo se enteró de nosotros?</FormLabel>
              <FormControl>
                <Textarea placeholder="Indique cómo conoció Happy Dreamers" className="resize-none" {...field} />
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
