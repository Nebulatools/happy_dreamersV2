# Corpus de Metodología de Mariana (M15 — Plan Maestro)

> **Estado: PENDIENTE DE CONTENIDO.** Esta carpeta es el scaffold del RAG propio de
> Happy Dreamers. El código de carga/inyección NO está activo todavía porque inyectar
> texto placeholder en planes reales sería peligroso. Se activa cuando Mariana autore
> el contenido (ver "Cómo se activa" abajo).

## Por qué existe

El RAG actual usa conocimiento médico **general** sobre sueño infantil. Mariana tiene una
metodología propia (**Gentle Sleep**, pro-apego, pro-lactancia) que en algunos puntos
difiere o complementa el consenso médico. Sin este corpus, la IA puede sugerir algo
técnicamente correcto pero contrario al criterio de Mariana.

Este corpus debe tener **prioridad sobre el RAG médico general** en los prompts de planes
y de chat.

## Estructura propuesta (autorar como archivos .md en esta carpeta)

```
01-filosofia-gentle-sleep.md      # Principios: pro-apego, pro-lactancia, qué nunca hacer
02-progresion-por-edad/
   0-3-meses.md
   4-6-meses.md
   7-12-meses.md
   12-24-meses.md
03-transicion-siestas.md          # Criterios de fase de siesta (alimenta M14)
04-alimentacion-nocturna.md
05-casos-especiales.md
06-que-nunca-recomendar.md        # Lista explícita de antipatrones
```

Cada archivo: texto claro, en español, con criterios accionables (no prosa larga).

## Cómo se activa (cuando exista contenido)

1. Crear un loader `loadMarianaMethodology()` que lea los .md no vacíos de esta carpeta.
2. En `app/api/consultas/plans/route.ts`, antes de construir el prompt, inyectar el
   contenido como **PRIORIDAD MÁXIMA**, por encima de `ragContext`:

   ```
   🎯 METODOLOGÍA HAPPY DREAMERS (PRIORIDAD MÁXIMA):
   ${marianaMethodologyContext}

   📚 REFERENCIA MÉDICA GENERAL (usar solo si la metodología HD no cubre el caso):
   ${ragContext}
   ```
3. Validación: Mariana revisa 10 planes generados con el nuevo corpus vs los actuales.

## Proceso de iteración

Cada vez que Mariana corrija un plan (ver M16, `marianaDelta`), evaluar si la corrección
debe convertirse en una regla nueva de este corpus. Así el corpus crece con su criterio real.
