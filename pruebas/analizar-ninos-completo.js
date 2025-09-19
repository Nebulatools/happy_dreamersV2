// ðŸŒŸ SCRIPT DE ANÃLISIS COMPLETO DE NIÃ‘OS - HAPPY DREAMERS
// =========================================================
// Analiza todos los niÃ±os registrados y su informaciÃ³n completa
// Genera reporte detallado en consola y archivo markdown

require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('../scripts/mongoose-util')
const fs = require('fs').promises

// ConfiguraciÃ³n de la conexiÃ³n
const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = process.env.MONGODB_DB || 'happy-dreamers'

// FunciÃ³n principal de anÃ¡lisis
async function analizarNinosCompleto() {
  try {
    console.log('ðŸŒŸ ANÃLISIS COMPLETO DE NIÃ‘OS - HAPPY DREAMERS')
    console.log('===============================================')
    
    // Conectar a MongoDB
    const client = /* mongoose connection handled in connect() */
    await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    
    // Obtener estadÃ­sticas generales
    const estadisticasGenerales = await obtenerEstadisticasGenerales(db)
    mostrarEstadisticasGenerales(estadisticasGenerales)
    
    // Analizar cada niÃ±o individualmente
    const children = await db.collection('children').find({}).toArray()
    
    if (children.length === 0) {
      console.log('\nâŒ No se encontraron niÃ±os registrados')
      await disconnect()
      return
    }
    
    console.log(`\nðŸ‘¶ ANÃLISIS INDIVIDUAL DE ${children.length} NIÃ‘OS`)
    console.log('='.repeat(50))
    
    const reporteNinos = []
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      console.log(`\nðŸ“Š ANALIZANDO NIÃ‘O ${i + 1}/${children.length}`)
      
      const analisisNino = await analizarNinoIndividual(db, child)
      reporteNinos.push(analisisNino)
      
      mostrarResumenNino(analisisNino)
    }
    
    // Generar reporte markdown
    console.log('\nðŸ“„ GENERANDO REPORTE MARKDOWN...')
    await generarReporteMarkdown(estadisticasGenerales, reporteNinos)
    
    await disconnect()
    console.log('\nðŸŽ‰ ANÃLISIS COMPLETADO EXITOSAMENTE')
    
  } catch (error) {
    console.error('âŒ Error en el anÃ¡lisis:', error)
    process.exit(1)
  }
}

// Obtener estadÃ­sticas generales de la base de datos
async function obtenerEstadisticasGenerales(db) {
  console.log('\nðŸ“Š Obteniendo estadÃ­sticas generales...')
  
  const [
    totalUsers,
    totalChildren,
    totalEvents,
    totalPlans,
    totalConsultations,
    surveysCompletos
  ] = await Promise.all([
    db.collection('users').countDocuments(),
    db.collection('children').countDocuments(),
    db.collection('events').countDocuments(),
    db.collection('child_plans').countDocuments(),
    db.collection('consultation_reports').countDocuments(),
    db.collection('children').countDocuments({ 'surveyData.completedAt': { $exists: true } })
  ])
  
  return {
    totalUsers,
    totalChildren,
    totalEvents,
    totalPlans,
    totalConsultations,
    surveysCompletos,
    porcentajeSurveys: totalChildren > 0 ? ((surveysCompletos / totalChildren) * 100).toFixed(1) : 0
  }
}

// Mostrar estadÃ­sticas generales
function mostrarEstadisticasGenerales(stats) {
  console.log('\nðŸ”¢ ESTADÃSTICAS GENERALES')
  console.log('========================')
  console.log(`ðŸ‘¥ Total Usuarios: ${stats.totalUsers}`)
  console.log(`ðŸ‘¶ Total NiÃ±os: ${stats.totalChildren}`)
  console.log(`ðŸ“ Total Eventos: ${stats.totalEvents}`)
  console.log(`ðŸ“‹ Total Planes: ${stats.totalPlans}`)
  console.log(`ðŸ’¬ Total Consultas: ${stats.totalConsultations}`)
  console.log(`âœ… Surveys Completados: ${stats.surveysCompletos}/${stats.totalChildren} (${stats.porcentajeSurveys}%)`)
}

// Analizar un niÃ±o individual
async function analizarNinoIndividual(db, child) {
  const childId = child._id
  
  // Calcular edad en meses
  const edadMeses = calcularEdadMeses(child.birthDate)
  
  // Obtener informaciÃ³n del padre/usuario
  let parentInfo = null
  if (child.parentId) {
    parentInfo = await db.collection('users').findOne({ _id: new ObjectId(child.parentId) })
  }
  
  // Analizar datos del survey
  const surveyAnalysis = analizarSurveyData(child.surveyData)
  
  // Obtener eventos de sueÃ±o
  const eventos = await db.collection('events').find({ childId: childId }).sort({ createdAt: -1 }).toArray()
  const eventAnalysis = analizarEventos(eventos)
  
  // Obtener planes
  const planes = await db.collection('child_plans').find({ childId: childId }).sort({ createdAt: -1 }).toArray()
  const planAnalysis = analizarPlanes(planes)
  
  // Obtener consultas
  const consultas = await db.collection('consultation_reports').find({ childId: childId }).sort({ createdAt: -1 }).toArray()
  
  return {
    // InformaciÃ³n bÃ¡sica
    id: childId.toString(),
    nombre: `${child.firstName} ${child.lastName}`,
    fechaNacimiento: child.birthDate,
    edadMeses: edadMeses,
    edadTexto: formatearEdad(edadMeses),
    
    // InformaciÃ³n del padre
    padre: parentInfo ? {
      nombre: parentInfo.name,
      email: parentInfo.email,
      rol: parentInfo.role
    } : null,
    
    // AnÃ¡lisis de datos
    survey: surveyAnalysis,
    eventos: eventAnalysis,
    planes: planAnalysis,
    consultas: {
      total: consultas.length,
      ultima: consultas.length > 0 ? consultas[0].createdAt : null,
      reportes: consultas.map(c => ({
        id: c._id.toString(),
        fecha: c.createdAt,
        transcriptLength: c.transcript ? c.transcript.length : 0,
        recommendations: c.recommendations ? c.recommendations.length : 0
      }))
    },
    
    // Fechas importantes
    fechaCreacion: child.createdAt,
    ultimaActualizacion: child.updatedAt
  }
}

// Calcular edad en meses
function calcularEdadMeses(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento)
  const ahora = new Date()
  
  let meses = (ahora.getFullYear() - nacimiento.getFullYear()) * 12
  meses += ahora.getMonth() - nacimiento.getMonth()
  
  if (ahora.getDate() < nacimiento.getDate()) {
    meses--
  }
  
  return meses
}

// Formatear edad en texto legible
function formatearEdad(meses) {
  const anos = Math.floor(meses / 12)
  const mesesRestantes = meses % 12
  
  if (anos === 0) {
    return `${meses} meses`
  } else if (mesesRestantes === 0) {
    return `${anos} ${anos === 1 ? 'aÃ±o' : 'aÃ±os'}`
  } else {
    return `${anos} ${anos === 1 ? 'aÃ±o' : 'aÃ±os'} y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`
  }
}

// Analizar datos del survey
function analizarSurveyData(surveyData) {
  if (!surveyData) {
    return {
      completado: false,
      porcentajeCompleto: 0,
      seccionesCompletas: [],
      seccionesFaltantes: ['informacionFamiliar', 'dinamicaFamiliar', 'historial', 'desarrolloSalud', 'actividadFisica', 'rutinaHabitos'],
      fechaCompletado: null
    }
  }
  
  const secciones = ['informacionFamiliar', 'dinamicaFamiliar', 'historial', 'desarrolloSalud', 'actividadFisica', 'rutinaHabitos']
  const seccionesCompletas = []
  const seccionesFaltantes = []
  
  secciones.forEach(seccion => {
    if (surveyData[seccion] && Object.keys(surveyData[seccion]).length > 0) {
      seccionesCompletas.push(seccion)
    } else {
      seccionesFaltantes.push(seccion)
    }
  })
  
  const porcentajeCompleto = (seccionesCompletas.length / secciones.length * 100).toFixed(1)
  
  return {
    completado: surveyData.completedAt ? true : false,
    porcentajeCompleto: parseFloat(porcentajeCompleto),
    seccionesCompletas,
    seccionesFaltantes,
    fechaCompletado: surveyData.completedAt
  }
}

// Analizar eventos
function analizarEventos(eventos) {
  if (!eventos || eventos.length === 0) {
    return {
      total: 0,
      primerEvento: null,
      ultimoEvento: null,
      tiposEventos: {},
      eventosPorDia: 0
    }
  }
  
  // Contar tipos de eventos
  const tiposEventos = {}
  eventos.forEach(evento => {
    const tipo = evento.type || 'unknown'
    tiposEventos[tipo] = (tiposEventos[tipo] || 0) + 1
  })
  
  // Calcular eventos por dÃ­a
  const primerEvento = new Date(eventos[eventos.length - 1].createdAt)
  const ultimoEvento = new Date(eventos[0].createdAt)
  const diasTranscurridos = Math.max(1, Math.ceil((ultimoEvento - primerEvento) / (1000 * 60 * 60 * 24)))
  const eventosPorDia = (eventos.length / diasTranscurridos).toFixed(1)
  
  return {
    total: eventos.length,
    primerEvento: primerEvento,
    ultimoEvento: ultimoEvento,
    tiposEventos,
    eventosPorDia: parseFloat(eventosPorDia),
    diasRegistrando: diasTranscurridos
  }
}

// Analizar planes
function analizarPlanes(planes) {
  if (!planes || planes.length === 0) {
    return {
      total: 0,
      planActivo: null,
      versiones: [],
      progresion: 'Sin planes'
    }
  }
  
  // Encontrar plan activo
  const planActivo = planes.find(p => p.status === 'active')
  
  // Obtener versiones de planes
  const versiones = planes.map(p => ({
    version: p.planVersion,
    tipo: p.planType,
    estado: p.status,
    fecha: p.createdAt
  })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  
  // Determinar progresiÃ³n
  let progresion = 'Sin progresiÃ³n'
  if (versiones.length === 1) {
    progresion = `Solo ${versiones[0].version}`
  } else if (versiones.length > 1) {
    const ultimaVersion = versiones[0].version
    progresion = `EvolucionÃ³ hasta Plan ${ultimaVersion}`
  }
  
  return {
    total: planes.length,
    planActivo: planActivo ? {
      version: planActivo.planVersion,
      tipo: planActivo.planType,
      fecha: planActivo.createdAt
    } : null,
    versiones,
    progresion
  }
}

// Mostrar resumen de un niÃ±o
function mostrarResumenNino(analisis) {
  console.log(`\nðŸ‘¶ ${analisis.nombre}`)
  console.log('-'.repeat(40))
  console.log(`ðŸ“… Edad: ${analisis.edadTexto} (${analisis.edadMeses} meses)`)
  console.log(`ðŸ‘¤ Padre: ${analisis.padre ? `${analisis.padre.nombre} (${analisis.padre.email})` : 'No encontrado'}`)
  
  // Survey
  console.log(`ðŸ“‹ Survey: ${analisis.survey.completado ? 'âœ… Completado' : 'âŒ Incompleto'} (${analisis.survey.porcentajeCompleto}%)`)
  
  // Eventos
  if (analisis.eventos.total > 0) {
    console.log(`ðŸ“Š Eventos: ${analisis.eventos.total} total (${analisis.eventos.eventosPorDia}/dÃ­a, ${analisis.eventos.diasRegistrando} dÃ­as)`)
    const tiposEvento = Object.keys(analisis.eventos.tiposEventos)
    if (tiposEvento.length > 0) {
      const tiposPrincipales = tiposEvento.slice(0, 3).map(tipo => 
        `${tipo}(${analisis.eventos.tiposEventos[tipo]})`
      ).join(', ')
      console.log(`   Tipos: ${tiposPrincipales}`)
    }
  } else {
    console.log('ðŸ“Š Eventos: âŒ Sin registros')
  }
  
  // Planes
  console.log(`ðŸ“‹ Planes: ${analisis.planes.progresion}`)
  if (analisis.planes.planActivo) {
    console.log(`   Activo: Plan ${analisis.planes.planActivo.version} (${analisis.planes.planActivo.tipo})`)
  }
  
  // Consultas
  if (analisis.consultas.total > 0) {
    console.log(`ðŸ’¬ Consultas: ${analisis.consultas.total} realizadas`)
  } else {
    console.log('ðŸ’¬ Consultas: âŒ Sin consultas')
  }
}

// Generar reporte markdown
async function generarReporteMarkdown(estadisticas, reporteNinos) {
  const fecha = new Date().toISOString().split('T')[0]
  const nombreArchivo = `reporte-ninos-${fecha}.md`
  const rutaArchivo = `/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/${nombreArchivo}`
  
  let contenido = `# ðŸ“Š Reporte de AnÃ¡lisis de NiÃ±os - Happy Dreamers
**Fecha de generaciÃ³n:** ${new Date().toLocaleDateString('es-ES')}  
**Total niÃ±os analizados:** ${reporteNinos.length}

## ðŸ”¢ EstadÃ­sticas Generales

| MÃ©trica | Valor |
|---------|--------|
| ðŸ‘¥ Total Usuarios | ${estadisticas.totalUsers} |
| ðŸ‘¶ Total NiÃ±os | ${estadisticas.totalChildren} |
| ðŸ“ Total Eventos | ${estadisticas.totalEvents} |
| ðŸ“‹ Total Planes | ${estadisticas.totalPlans} |
| ðŸ’¬ Total Consultas | ${estadisticas.totalConsultations} |
| âœ… Surveys Completados | ${estadisticas.surveysCompletos}/${estadisticas.totalChildren} (${estadisticas.porcentajeSurveys}%) |

## ðŸ‘¶ AnÃ¡lisis Individual de NiÃ±os

`

  reporteNinos.forEach((nino, index) => {
    contenido += `### ${index + 1}. ${nino.nombre}

**ðŸ“Š InformaciÃ³n General:**
- **ID:** ${nino.id}
- **Edad:** ${nino.edadTexto} (${nino.edadMeses} meses)
- **Fecha nacimiento:** ${new Date(nino.fechaNacimiento).toLocaleDateString('es-ES')}
- **Padre:** ${nino.padre ? `${nino.padre.nombre} (${nino.padre.email})` : 'âŒ No encontrado'}
- **Registrado:** ${new Date(nino.fechaCreacion).toLocaleDateString('es-ES')}

**ðŸ“‹ Survey:**
- **Estado:** ${nino.survey.completado ? 'âœ… Completado' : 'âŒ Incompleto'} (${nino.survey.porcentajeCompleto}%)
- **Secciones completas:** ${nino.survey.seccionesCompletas.length}/6
- **Fecha completado:** ${nino.survey.fechaCompletado ? new Date(nino.survey.fechaCompletado).toLocaleDateString('es-ES') : 'N/A'}

**ðŸ“Š Eventos de SueÃ±o:**
- **Total eventos:** ${nino.eventos.total}
- **Eventos por dÃ­a:** ${nino.eventos.eventosPorDia}
- **DÃ­as registrando:** ${nino.eventos.diasRegistrando}
- **Primer evento:** ${nino.eventos.primerEvento ? new Date(nino.eventos.primerEvento).toLocaleDateString('es-ES') : 'N/A'}
- **Ãšltimo evento:** ${nino.eventos.ultimoEvento ? new Date(nino.eventos.ultimoEvento).toLocaleDateString('es-ES') : 'N/A'}

`

    // Tipos de eventos
    if (Object.keys(nino.eventos.tiposEventos).length > 0) {
      contenido += '**Tipos de eventos:**\n'
      Object.entries(nino.eventos.tiposEventos).forEach(([tipo, cantidad]) => {
        contenido += `- ${tipo}: ${cantidad}\n`
      })
      contenido += '\n'
    }

    contenido += `**ðŸ“‹ Planes:**
- **Total planes:** ${nino.planes.total}
- **ProgresiÃ³n:** ${nino.planes.progresion}
- **Plan activo:** ${nino.planes.planActivo ? `Plan ${nino.planes.planActivo.version} (${nino.planes.planActivo.tipo})` : 'Ninguno'}

`

    // Versiones de planes
    if (nino.planes.versiones.length > 0) {
      contenido += '**Historial de planes:**\n'
      nino.planes.versiones.forEach(version => {
        contenido += `- Plan ${version.version} (${version.tipo}) - ${version.estado} - ${new Date(version.fecha).toLocaleDateString('es-ES')}\n`
      })
      contenido += '\n'
    }

    contenido += `**ðŸ’¬ Consultas:**
- **Total consultas:** ${nino.consultas.total}
- **Ãšltima consulta:** ${nino.consultas.ultima ? new Date(nino.consultas.ultima).toLocaleDateString('es-ES') : 'N/A'}

`

    // Detalles de consultas
    if (nino.consultas.reportes.length > 0) {
      contenido += '**Historial de consultas:**\n'
      nino.consultas.reportes.forEach(reporte => {
        contenido += `- ${new Date(reporte.fecha).toLocaleDateString('es-ES')} - Transcript: ${reporte.transcriptLength} chars, Recomendaciones: ${reporte.recommendations}\n`
      })
    }

    contenido += '\n---\n\n'
  })

  contenido += `## ðŸ“ˆ Resumen de Insights

### ðŸŽ¯ NiÃ±os MÃ¡s Activos (por eventos)
${reporteNinos
  .sort((a, b) => b.eventos.total - a.eventos.total)
  .slice(0, 3)
  .map((nino, i) => `${i + 1}. **${nino.nombre}** - ${nino.eventos.total} eventos`)
  .join('\n')}

### ðŸ“‹ Surveys Completados
- **Completados:** ${reporteNinos.filter(n => n.survey.completado).length}/${reporteNinos.length} niÃ±os
- **Promedio completitud:** ${(reporteNinos.reduce((acc, nino) => acc + nino.survey.porcentajeCompleto, 0) / reporteNinos.length).toFixed(1)}%

### ðŸ“Š EvoluciÃ³n de Planes
- **NiÃ±os con planes:** ${reporteNinos.filter(n => n.planes.total > 0).length}/${reporteNinos.length}
- **NiÃ±os con plan activo:** ${reporteNinos.filter(n => n.planes.planActivo).length}/${reporteNinos.length}
- **Promedio planes por niÃ±o:** ${(reporteNinos.reduce((acc, nino) => acc + nino.planes.total, 0) / reporteNinos.length).toFixed(1)}

### ðŸ’¬ Actividad de Consultas
- **NiÃ±os con consultas:** ${reporteNinos.filter(n => n.consultas.total > 0).length}/${reporteNinos.length}
- **Total consultas:** ${reporteNinos.reduce((acc, nino) => acc + nino.consultas.total, 0)}

---
*Reporte generado automÃ¡ticamente el ${new Date().toLocaleString('es-ES')}*
`

  await fs.writeFile(rutaArchivo, contenido, 'utf8')
  console.log(`ðŸ“„ Reporte guardado en: ${nombreArchivo}`)
  
  return rutaArchivo
}

// Ejecutar anÃ¡lisis
console.log('ðŸš€ Iniciando anÃ¡lisis completo de niÃ±os...')
analizarNinosCompleto()