# QA Feedback Notes

**Fecha:** 2026-02-05
**Sprint:** Ajustes de Diagnóstico + Cuestionario

## Ajustes hechos

- Después de los ajustes los grupos que muestran leyenda de +2 criterios ya expanden y colapsan correctamente.

- Ya se puede volver a navegar a la sección 'Dinámica Familiar' del cuestionario, ya no marca error.

- La sección diagnóstico ya muestra el indicador de ferritina y el de humedad.

- El asistente de IA al hacer clic en "Analizar" ya integró las notas de texto libre en el resumen.

## Nuevo bug

- Al navegar a la ruta /dashboard/diagnosticos en perfil Admin precarga el perfil del niño Elías Gael aún y cuando en el selector de arriba dice "Seleccionar Paciente", lo que quiere decir que aún no hay ningún niño seleccionado y la pantalla de diagnóstico tiene persistencia a mostrar al último niño que se consultó y eso no debe ser así.
