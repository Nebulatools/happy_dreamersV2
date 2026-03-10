# QA Feedback Notes

**Fecha:** 2026-03-10
**Sprint:** Sprint 6 - Admin UX Hub + Diagnostic Pipeline + Patient Status
**Tester:** Julio
**Branch:** QA
**Total de Checkpoints:** 26

---

## Instrucciones para el Tester

Usa los tests de `QA_RELEASE_NOTES.md` como guia. Sigue las PARTEs 0-16 en orden.
Hay 26 checkpoints humanos en total. Para cada bug encontrado, documenta aqui:

### Template por Bug

```
## Bug #X - [Titulo corto]

**Checkpoint:** #__
**Ruta:** /dashboard/...
**Severidad:** Critica / Alta / Media / Baja

### Pasos para reproducir
1. ...
2. ...
3. ...

### Resultado esperado
...

### Resultado actual
...

### Screenshot
(adjuntar si es visual)

### Consola (F12)
(copiar errores si los hay)
```

---

## Areas Nuevas a Prestar Atencion

Las PARTEs 12-16 son **NUEVAS** y prueban el sistema de status de pacientes:
- **PARTE 12**: Tabs de filtrado (Activos/Inactivos/Archivados/Todos)
- **PARTE 13**: Archivar y restaurar ninos
- **PARTE 14**: Auto-reactivacion al crear eventos
- **PARTE 15**: Dashboard con metricas de status y alertas clinicas
- **PARTE 16**: Ordenamiento alfabetico A→Z

---

## Bugs Encontrados

(Julio: escribe aqui debajo)

- Ajustar colores de texto (blanco) a los eventos de "Hoy" en la vista diaria de Calendario en Bitacora.
