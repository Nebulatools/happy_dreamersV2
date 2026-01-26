# Notas de testing en QA - Happy Dreamers

**Fecha:** 2026-01-26

## TEST 1: Vista Narrativa en Home (Padres)

- En dashboard reemplazar los gráficos igual que en bitácora

- Cambiar el orden de cards, primero mostrar 'diario' en texto y luego el calendario con los eventos de hoy

- No se visualiza la opción/botón de Expandir/Colapsar

## TEST 2: Taxonomia Visual - Colores por Tipo de Alimentación

- La nueva iconifización sólo está en las vistas de Dashboard/Bitácora/Calendario pero
en la **Ruta:** `/dashboard/patient/child/[id] ` en el tab Eventos todas las alimentaciones
siguen usando un mismo ícono (confirmar primero si así lo pidió Mariana o hay que ajustarlo también)

## TEST 3: Taxonomia Visual - Siestas en Lavanda

## TEST 4: Split Screen para Admin (Vista Diaria)

- Vista 50/50 está bien, sólo también hacer calendario completo hacia abajo hasta donde ya no tenga scroll

## TEST 5: Narrativa Vertical para Padres (Vista Diaria)

- Se requiere quitar el tab 'gráfico' de sueño y despertares nocturnos en barras
y el tab 'calendario' será lo único de vista en esa URL

- También quitar el tab 'mensual' al menos de la vista de padres

- Que al gráfico del tab 'semanal' se ajuste la UI y no tenga scroll dentro del gráfico
(que sólo exista el scroll del navegador en desktop, y en mobile el card más alto para que quepa al 100)

- En el tab 'diario' que se agregue como primer evento del día el despertar

## TEST 6: Eventos Dentro de Bloques de Sueno en Columnas

- La edición de los horarios de eventos sólo dejan editar hora inicio no hora fin (para admin y users)

## TEST 7: Estilos Nocturnos en Bloques de Sueno
