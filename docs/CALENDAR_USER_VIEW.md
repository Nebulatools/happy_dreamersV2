# Vista de Calendario para Familias

## Propósito
La vista de calendario disponible para padres o tutores resume los últimos siete días de actividad de sueño del niño seleccionado. Se privilegia una lectura rápida desde dispositivos móviles, por lo que los componentes se organizan en bloques compactos con navegación simplificada y métricas agregadas.

## Flujo general del usuario
- Selecciona un niño desde el encabezado global. Si no hay un niño activo, la página solicita la selección antes de cargar datos.
- El botón `Registrar evento` del encabezado abre el selector/flujo de registro manual (el mismo modal utilizado en la página “Registrar evento”).
- La gráfica principal muestra el periodo **Últimos 7 días**. En móviles aparecen flechas para retroceder o avanzar una semana; la navegación hacia el futuro se bloquea cuando aún no existen eventos.
- Al tocar una barra se despliega un tooltip con los totales del día (sueño nocturno, siestas y despertares). Los modales de detalle y edición se comparten con el resto del calendario y se activan cuando el usuario abre un evento desde cualquier listado interactivo.

## Elementos de la pantalla
- **Etiqueta mensual**: Encabezado compacto con el mes y año actuales en mayúsculas.
- **Gráfico apilado (UserWeeklySleepChart)**: coloca el sueño nocturno como base (barra azul) y las siestas encima (naranja); las líneas rojas señalan despertares nocturnos. El tooltip muestra totales, desglose por segmento y número de despertares. Los promedios superiores solo consideran los días con datos reales para evitar distorsiones cuando la semana tiene registros incompletos.
- **Controles de navegación móvil**: botones para avanzar/retroceder una semana; deshabilitados al intentar ir más allá del día actual.
- **Modales compartidos**: al seleccionar un evento desde otras secciones, se abre un detalle con hora, duración, estado emocional y acciones de edición/eliminación.

## Registro de eventos y horarios sugeridos
El flujo de registro manual hereda ahora horarios iniciales coherentes con cada tipo de evento. El usuario puede modificarlos, pero el formulario parte de valores cercanos al uso real:

| Tipo de evento            | Hora inicial sugerida |
|---------------------------|-----------------------|
| Dormir (`sleep`)          | 20:00 h               |
| Siesta (`nap`)            | 13:00 h               |
| Despertar nocturno        | 02:00 h               |
| Alimentación              | 12:00 h               |
| Tomas nocturnas           | 01:00 h               |
| Medicamentos              | 08:00 h               |
| Actividades extra         | 17:00 h               |
| Despertar matutino        | 07:00 h (para vistas compatibles) |

Además, los eventos que requieren hora de fin (como “Dormir”) la activan automáticamente, mientras que el resto la mantiene opcional.

## Consideraciones técnicas relevantes
- Se eliminó el logging ruidoso en componentes del calendario. Los mensajes informativos ahora pasan por el logger central o se suprimieron cuando no aportaban valor.
- El caché local de eventos sigue activo: la navegación semana a semana refresca los datos desde memoria y solo hace nuevas peticiones cuando cambia el niño seleccionado o se invalida la caché.

## Próximos pasos sugeridos
1. Reactivar el selector rápido de eventos (`QuickEventSelector`) para que el botón de encabezado abra el flujo sin salir del calendario.
2. Añadir accesos directos para abrir la tarjeta de detalle desde el gráfico (tap/click en las barras) y así cerrar el ciclo de revisión sin cambiar de vista.
