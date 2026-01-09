# Solutions Repository - Knowledge Compounding

Este directorio acumula conocimiento a lo largo del desarrollo de Happy Dreamers.

## Proposito

Cuando se descubre un bug, patron, o solucion importante:
1. **Documentar inmediatamente** mientras el contexto esta fresco
2. **Categorizar** en el directorio apropiado
3. **Usar YAML frontmatter** para busqueda rapida
4. **Actualizar rules** si es critico

## Estructura

```
solutions/
├── datetime-bugs/     # Bugs de timezone, parsing de fechas
├── event-bugs/        # Bugs del sistema de eventos
├── ui-bugs/           # Bugs de CSS, componentes
└── patterns/          # Patrones reutilizables
```

## Cuando Agregar

Documentar cuando:

- [ ] Se arregla un bug no obvio que podria repetirse
- [ ] Se descubre un patron reutilizable
- [ ] Se encuentra un "gotcha" que hizo perder tiempo
- [ ] Se aprende como dos sistemas interactuan

## Template

```markdown
---
title: [Titulo descriptivo]
category: [datetime-bugs|event-bugs|ui-bugs|patterns]
date: [YYYY-MM-DD]
severity: [critical|high|medium|low]
tags: [comma, separated, tags]
---

# [Titulo]

## Problem
[Que salio mal o que se descubrio]

## Cause
[Analisis de causa raiz]

## Solution
[Como arreglarlo o implementarlo correctamente]

## Code Example
\`\`\`typescript
// Implementacion correcta
\`\`\`

## Prevention
[Como evitar esto en el futuro]
```

## Documentos Existentes

### datetime-bugs/
- `utc-midnight-interpretation.md` - Bug critico de interpretacion UTC

### event-bugs/
- `duplicate-event-types.md` - Anti-patron de tipos duplicados

## Busqueda

Para encontrar soluciones relevantes:

```bash
# Por categoria
ls .claude/docs/solutions/datetime-bugs/

# Por tag en frontmatter
grep -r "tags:.*timezone" .claude/docs/solutions/

# Por severidad
grep -r "severity: critical" .claude/docs/solutions/
```

## Flujo de Compound

```
Descubrir problema → Resolver → Documentar aqui → Si es critico, agregar a rules/
```
