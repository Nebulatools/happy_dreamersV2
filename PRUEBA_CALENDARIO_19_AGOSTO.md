# 🧪 PRUEBA COMPLETA DEL CALENDARIO - 19 DE AGOSTO

## 📋 Lista de Eventos para Probar

**Fecha**: 19 de agosto de 2025
**Objetivo**: Probar el calendario nuevo con vista limpia + validación de traslape

### ✅ Eventos a Registrar (en este orden):

1. **07:00** - Despertar
   - Tipo: Despertar
   - Estado emocional: Feliz
   - Notas: "Despertó de buen humor"

2. **07:30** - Alimentación (15 min)
   - Tipo: Alimentación
   - Hora inicio: 07:30
   - Hora fin: 07:45
   - Tipo alimentación: Biberón
   - Cantidad: 150ml
   - Duración: 15 min
   - Estado bebé: Despierto
   - Notas: "Tomó todo el biberón"

3. **08:00** - Actividad Extra (30 min)
   - Tipo: Actividad Extra
   - Hora inicio: 08:00
   - Hora fin: 08:30
   - Descripción: "Juego con bloques de colores"
   - Duración: 30 min
   - Impacto: Positivo
   - Notas: "Muy interesado en apilar bloques"

4. **10:00** - Siesta (1.5h)
   - Tipo: Siesta
   - Hora inicio: 10:00
   - Hora fin: 11:30
   - Tiempo para dormirse: 10 min
   - Estado emocional: Cansado
   - Notas: "Siesta matutina, durmió bien"

5. **12:00** - Almuerzo (20 min)
   - Tipo: Alimentación
   - Hora inicio: 12:00
   - Hora fin: 12:20
   - Tipo: Sólidos
   - Cantidad: 80gr
   - Duración: 20 min
   - Notas: "Almuerzo - puré de verduras"

6. **13:00** - Medicamento
   - Tipo: Medicamento
   - Hora: 13:00
   - Medicamento: Paracetamol
   - Dosis: 5ml
   - Notas: "Para fiebre leve"

7. **14:30** - Siesta Tarde (1.5h)
   - Tipo: Siesta
   - Hora inicio: 14:30
   - Hora fin: 16:00
   - Tiempo para dormirse: 15 min
   - Notas: "Siesta de la tarde"

8. **16:30** - Merienda (15 min)
   - Tipo: Alimentación
   - Hora inicio: 16:30
   - Hora fin: 16:45
   - Tipo: Biberón
   - Cantidad: 120ml
   - Duración: 15 min
   - Notas: "Merienda"

9. **17:00** - Tiempo de Lectura (30 min)
   - Tipo: Actividad Extra
   - Hora inicio: 17:00
   - Hora fin: 17:30
   - Descripción: "Tiempo de lectura con libros ilustrados"
   - Duración: 30 min
   - Impacto: Positivo
   - Notas: "Le gustan mucho los dibujos"

10. **18:30** - Cena (30 min)
    - Tipo: Alimentación
    - Hora inicio: 18:30
    - Hora fin: 19:00
    - Tipo: Sólidos
    - Cantidad: 100gr
    - Duración: 30 min
    - Notas: "Cena - puré de frutas"

11. **20:00** - Dormir Nocturno
    - Tipo: Dormir
    - Hora inicio: 20:00
    - Tiempo para dormirse: 5 min
    - Estado emocional: Cansado
    - Notas: "Hora de dormir nocturno"

12. **23:30** - Despertar Nocturno (15 min)
    - Tipo: Despertar nocturno
    - Hora inicio: 23:30
    - Hora fin: 23:45
    - Tiempo despierto: 15 min
    - Estado emocional: Irritable
    - Notas: "Despertar nocturno breve"

---

## 🚫 PRUEBA DE TRASLAPE

**Después de registrar todos los eventos anteriores**, intenta registrar este evento que debería FALLAR:

- **Tipo**: Alimentación
- **Hora inicio**: 10:30 (durante la siesta de 10:00-11:30)
- **Hora fin**: 10:45
- **Resultado esperado**: ❌ Error de traslape con mensaje claro

---

## 🎯 QUÉ PROBAR

### 1. Vista Mensual
- [ ] Cambiar a vista "Mensual" 
- [ ] Navegar a agosto 2025
- [ ] Ver que el día 19 muestra múltiples eventos
- [ ] Click en eventos individuales para ver detalles

### 2. Vista Semanal  
- [ ] Cambiar a vista "Semanal"
- [ ] Navegar a la semana del 19 de agosto
- [ ] Ver timeline limpio con fondo día/noche
- [ ] Ver eventos posicionados correctamente por hora
- [ ] Scroll vertical para ver todo el día (24h)

### 3. Vista Diaria
- [ ] Cambiar a vista "Diario" 
- [ ] Navegar al 19 de agosto
- [ ] Ver timeline detallado de 24 horas
- [ ] Ver todos los 12 eventos posicionados exactamente
- [ ] Ver colores diferentes por tipo de evento

### 4. Funcionalidad
- [ ] Click en cualquier evento → Modal de detalles
- [ ] Click en "Editar" → Modal de edición
- [ ] Click en "Eliminar" → Confirmación
- [ ] Click en espacio vacío → Crear nuevo evento (futuro)

### 5. Validación de Traslape
- [ ] Intentar crear evento que se traslape
- [ ] Ver mensaje de error claro
- [ ] Ver detalles del evento existente
- [ ] Confirmar que NO se crea el evento

---

## ✅ RESULTADO ESPERADO

Al final deberías tener:
- **12 eventos** registrados exitosamente para el 19 de agosto
- **1 evento** rechazado por traslape  
- **Vista limpia** del calendario funcionando en las 3 vistas
- **Navegación fluida** entre fechas y vistas
- **Colores apropiados** para cada tipo de evento
- **Posicionamiento exacto** por hora en timeline

---

## 🚀 CÓMO EMPEZAR

1. Ve a: http://localhost:3004
2. Inicia sesión
3. Ve a Calendario: http://localhost:3004/dashboard/calendar  
4. Selecciona un niño en el selector superior
5. Empieza a registrar eventos usando el botón "Registrar evento"
6. ¡Prueba las 3 vistas del calendario!

---

**🎉 ¡Happy Testing!**