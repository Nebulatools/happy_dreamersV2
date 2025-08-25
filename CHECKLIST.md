cat > CHECKLIST.md <<'EOF'
# Pilot Checklist — Happy Dreamers

Este checklist cruza lo definido en el pizarrón con lo que ya existe en el repo `happy_dreamers_v0`.

## Usuarios
- ✅ Crear / validar / contraseña (auth mínima con email/pass o anónimo)
- ✅ Log in (recordar y cerrar sesión)

## Sesiones
- 🟡 Sesiones (niños por perfil y “familias”) — existe `SleepSession` pero sin multi-familia
- 🟡 Sesiones Admin (filtro/niños/familias) — existen scripts de inspección, falta UI admin

## Perfil
- ❌ Preguntas / secciones / obligatorias — no hay esquema de perfil visible

## Seguridad y Privacidad
- ❌ Encriptado de datos — no se observa en el repo, gap crítico

## Interfaz
- 🟡 Interfaz móvil (web app) — base en Next.js, falta diseño responsive mobile

## Repositorio metodológico
- 🟡 Integrar metodología Gentle Sleep  
  → existen análisis (`ANALISIS-PROMEDIO-SUENO.md`, `DEV-TIME-SYSTEM.md`), falta implementación en app

## Eventos
- ✅ Registro, almacenamiento y lectura de eventos  
  → core del repo, múltiples scripts de debug/fixes
- 🟡 Visualizaciones y fórmulas (líneas base x plan)  
  → lógica está en MDs y scripts, falta interfaz gráfica

## Plan / Rutina
- 🟡 Plan / rutina (basado en fórmulas)  
  → `plan.md` y `PLAN-RESET-EVENTOS.md` definen lógica, falta UI para usuario

## Reportes
- 🟡 Resumen, objetivos, rutina, recomendaciones  
  → hay reportes QA, falta vista para papás
- ❌ Ver y descargar (CSV, PDF) — no existe módulo de exportación

## Admin
- 🟡 Admin powers para modificar plan de forma manual (tableta de captura)  
  → existen scripts (`migrate-plans-to-child-plans.js`), falta interfaz amigable

## Otros
- ❌ Reportes y Budget? — no aparece en el repo
EOF
