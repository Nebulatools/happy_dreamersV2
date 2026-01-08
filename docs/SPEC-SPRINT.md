# 🛠 Especificación Técnica de Implementación: Refactorización UX, Plan de Sueño y Calidad de Datos

## 1. Resumen Ejecutivo
Este sprint se enfoca en resolver inconsistencias de UX y calidad de datos críticas para la operación.
1. **Plan de Sueño:** Mejorar la lógica visual de "madrugada" y consolidar "Ir a acostarse" vs "Dormir" sin perder datos históricos.
2. **UX Preventivo:** Ayudas visuales para cerrar eventos pendientes.
3. **Integridad de Medicamentos:** Hacer obligatorios los campos de medicamento y asegurar su visualización en el rol Admin.

## 2. Impacto en el Repositorio

### A. Archivos a Modificar
* **Validación y Esquemas (Backend/Frontend Shared):**
    * `lib/validations/event.ts`: **CRÍTICO.** Modificar esquema Zod para `medication`.
* **Frontend (Componentes de Calendario/Plan):**
    * `components/calendar/CalendarDayView.tsx`: Implementar "Día Lógico" (Madrugada).
    * `components/calendar/EventBlock.tsx`: Ajustar renderizado de íconos.
* **Frontend (Registro y UX):**
    * `components/events/forms/MedicationForm.tsx` (o el case dentro de `EventRegistration`): Reflejar validación obligatoria en UI.
    * `components/ui/GlobalActivityMonitor.tsx` (Nuevo): Overlay de eventos pendientes.
* **Frontend (Admin/Bitácora):**
    * `components/history/PatientHistory.tsx` o `components/admin/PatientLog.tsx`: Exponer campos de detalles de medicamento.

### B. Archivos a Crear
* `scripts/migrate-bedtime-latency.ts`: Script de migración de datos (One-off).

---

## 3. Lógica Técnica Detallada

### Tarea 1: Integridad de Datos - Medicamentos (Input & Output)
* **Objetivo:** Asegurar que no existan eventos de medicamento "vacíos" y que Mariana pueda leerlos.
* **Paso 1: Validación Estricta (Schema)**
    * En `lib/validations/event.ts`, localizar el esquema de validación de eventos.
    * Para el tipo `medication`, cambiar campos de opcionales a requeridos:
      ```typescript
      // Antes (Posible estado actual)
      // details: z.object({ medication: z.string().optional(), dose: z.string().optional() }).optional()
      
      // AHORA (Requerido)
      details: z.object({
        medication: z.string().min(1, "El nombre del medicamento es obligatorio"),
        dose: z.string().min(1, "La dosis es obligatoria")
      })
      ```
* **Paso 2: Visualización Admin**
    * En el componente de bitácora de Mariana (`PatientHistory.tsx`), dentro del mapeo de eventos:
    * Agregar lógica específica:
      ```tsx
      {event.eventType === 'medication' && (
        <div className="text-sm font-medium text-blue-600">
           💊 {event.details?.medication} - {event.details?.dose}
        </div>
      )}
      ```

### Tarea 2: Migración "Ir a acostarse" -> "Latencia"
* **Objetivo:** Eliminar redundancia visual sin perder historia.
* **Script (`scripts/migrate-bedtime-latency.ts`):**
    * Buscar pares consecutivos: Evento A (`bedtime`) seguido de Evento B (`sleep`).
    * Calcular `diff = B.startTime - A.startTime` (minutos).
    * Actualizar B: `B.sleepDelay = diff`.
    * Actualizar A: `A.isHidden = true` (No borrar, solo ocultar del frontend).

### Tarea 3: Visualización "Día Lógico" (Madrugada)
* **Objetivo:** Que los despertares de las 03:00 AM cuenten visualmente como "anoche".
* **Lógica en `CalendarDayView.tsx`:**
    * Crear utilitario `getVisualDate(date)`:
      ```typescript
      const getVisualDate = (d: Date) => {
         const hours = d.getHours();
         // Si es antes de las 05:00 AM, restar un día al objeto fecha visual
         if (hours < 5) return subDays(d, 1);
         return d;
      }
      ```
    * Usar esta fecha *transformada* solamente para agrupar las columnas del calendario. (No cambiar la fecha real del evento).

### Tarea 4: Monitor de Eventos Pendientes (UX)
* **Objetivo:** Evitar bloqueos "silenciosos" donde el usuario no sabe qué hacer.
* **Implementación:**
    * Crear componente `GlobalActivityMonitor` que consuma el contexto de eventos.
    * Si `activeEvent` existe (ej. un timer corriendo) Y han pasado > 20 mins:
    * Mostrar **Toast/Alert Warning**: *"Tienes un evento de [Tipo] abierto. ¿Finalizar ahora?"*.

---

## 4. Cambios en Base de Datos / Esquema
* **Colección `Events` (dentro de Child):**
    * `sleepDelay` (Number): Nuevo campo para guardar la latencia calculada.
    * `isHidden` (Boolean): Flag para ocultar eventos redundantes (`bedtime`) sin borrarlos físicamente.
    * **Validación:** Se enforcea a nivel de API que `medication` tenga payload completo.

## 5. Casos de Prueba y Criterios de Aceptación
1.  **Medicamentos (Happy Path):** Al crear un evento, si pongo nombre y dosis, se guarda y Mariana lo ve en su lista con el ícono correcto.
2.  **Medicamentos (Unhappy Path):** Si intento guardar un medicamento sin nombre, la UI me muestra error rojo y **NO** permite guardar.
3.  **Plan de Sueño:** Un evento a las 02:00 AM del Sábado debe aparecer visualmente en la columna del Viernes (al final).
4.  **Migración:** Los eventos viejos de "Ir a acostarse" desaparecen de la vista, pero el evento "Dormir" siguiente muestra: "Tiempo para dormir: X min".