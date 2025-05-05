// Componente de formulario para la dinámica familiar
// Tercera sección de la encuesta

"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { PlusCircle, X } from "lucide-react"

const familyDynamicsSchema = z.object({
  siblings: z
    .array(
      z.object({
        id: z.string(),
        first_name: z.string().min(1, "El nombre es requerido"),
        last_name: z.string().min(1, "El apellido es requerido"),
        date_of_birth: z.string(),
      }),
    )
    .optional(),
  primary_caregiver: z.string(),
  night_caregiver: z.string(),
  night_wakings_caregiver: z.string(),
  other_household_members: z.string().optional(),
  parent_participation: z.string(),
  separation_anxiety: z.string(),
  alone_reaction: z.string(),
  parent_dark_fear: z.string(),
})

type FamilyDynamicsFormValues = z.infer<typeof familyDynamicsSchema>

interface FamilyDynamicsFormProps {
  onSubmit: (data: FamilyDynamicsFormValues) => void
}

export function FamilyDynamicsForm({ onSubmit }: FamilyDynamicsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FamilyDynamicsFormValues>({
    resolver: zodResolver(familyDynamicsSchema),
    defaultValues: {
      siblings: [],
      primary_caregiver: "",
      night_caregiver: "",
      night_wakings_caregiver: "",
      other_household_members: "",
      parent_participation: "",
      separation_anxiety: "",
      alone_reaction: "",
      parent_dark_fear: "",
    },
  })

  const caregiverOptions = [
    { id: "mother", label: "Madre" },
    { id: "father", label: "Padre" },
    { id: "both", label: "Ambos padres" },
    { id: "grandparent", label: "Abuelo(a)" },
    { id: "other_relative", label: "Otro familiar" },
    { id: "nanny", label: "Niñera" },
    { id: "other", label: "Otro" },
  ]

  const handleSubmit = (data: FamilyDynamicsFormValues) => {
    setIsSubmitting(true)
    // Simulamos un pequeño retraso para mostrar el estado de carga
    setTimeout(() => {
      onSubmit(data)
      setIsSubmitting(false)
    }, 500)
  }

  const addSibling = () => {
    const currentSiblings = form.getValues("siblings") || []
    form.setValue("siblings", [
      ...currentSiblings,
      {
        id: Date.now().toString(),
        first_name: "",
        last_name: "",
        date_of_birth: "",
      },
    ])
  }

  const removeSibling = (id: string) => {
    const currentSiblings = form.getValues("siblings") || []
    form.setValue(
      "siblings",
      currentSiblings.filter((sibling) => sibling.id !== id),
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Hermanos</h3>
            <Button type="button" variant="outline" size="sm" onClick={addSibling} className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Agregar hermano
            </Button>
          </div>

          {form.watch("siblings")?.map((sibling, index) => (
            <div key={sibling.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name={`siblings.${index}.first_name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`siblings.${index}.last_name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Apellido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`siblings.${index}.date_of_birth`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Fecha de nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSibling(sibling.id)}
                  className="mb-2"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Eliminar hermano</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="primary_caregiver"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuidador principal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {caregiverOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="night_caregiver"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuidador durante la noche</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {caregiverOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="night_wakings_caregiver"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuidador para despertares nocturnos</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {caregiverOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
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
                <FormLabel>Participación de ambos padres</FormLabel>
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
            name="separation_anxiety"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ansiedad por separación</FormLabel>
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
            name="alone_reaction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reacción al estar solo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="yes">Reacciona negativamente</SelectItem>
                    <SelectItem value="no">No tiene problemas</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="parent_dark_fear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Miedo a la oscuridad de los padres</FormLabel>
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
          name="other_household_members"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Otros miembros del hogar</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe otros miembros que viven en el hogar"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Continuar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
