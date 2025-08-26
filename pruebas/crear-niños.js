// Script principal para crear SOLO Bernardo y Esteban con cuestionarios completos
// Basado en los casos reales de bernardo.md y raquel.md
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function crearBernardoYEsteban() {
  try {
    console.log('👶 CREAR BERNARDO Y ESTEBAN - CASOS REALES')
    console.log('==========================================')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // PASO 1: LIMPIAR DATOS EXISTENTES DEL USUARIO TEST
    console.log('\n🧹 LIMPIANDO DATOS EXISTENTES...')
    
    // Eliminar niños existentes
    const deletedChildren = await db.collection('children').deleteMany({
      $or: [
        { parentId: USER_ID },
        { parentId: new ObjectId(USER_ID) }
      ]
    })
    console.log(`   🗑️  ${deletedChildren.deletedCount} niños eliminados`)
    
    // Eliminar eventos existentes
    const deletedEvents = await db.collection('events').deleteMany({
      parentId: new ObjectId(USER_ID)
    })
    console.log(`   🗑️  ${deletedEvents.deletedCount} eventos eliminados`)
    
    // Eliminar planes existentes (usar child_plans, la colección correcta)
    const deletedPlans = await db.collection('child_plans').deleteMany({
      userId: new ObjectId(USER_ID)
    })
    console.log(`   🗑️  ${deletedPlans.deletedCount} planes eliminados`)
    
    // Limpiar array children del usuario
    await db.collection('users').updateOne(
      { _id: new ObjectId(USER_ID) },
      { 
        $set: { 
          children: [],
          updatedAt: new Date()
        }
      }
    )
    console.log(`   ✅ Array children limpiado`)
    
    // PASO 2: CREAR BERNARDO GARCÍA RIVAS
    console.log('\n🍼 CREANDO BERNARDO GARCÍA RIVAS...')
    
    const bernardoData = {
      firstName: "Bernardo",
      lastName: "García Rivas", 
      birthDate: "2022-01-12",
      parentId: USER_ID, // STRING para compatibilidad con frontend
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // CUESTIONARIO COMPLETO BASADO EN CASO REAL
      surveyData: {
        completedAt: new Date(),
        
        informacionFamiliar: {
          papa: {
            nombre: "Bernardo Garcia",
            edad: 34,
            ocupacion: "Empresario",
            direccion: "Olimpo 15, Las Ceibas",
            ciudad: "Nuevo Vallarta", 
            telefono: "8661156816",
            email: "bernardo.garcia@ejemplo.com",
            trabajaFueraCasa: true,
            tieneAlergias: false,
            alergias: ""
          },
          mama: {
            nombre: "Itzel Rivas",
            edad: 26,
            ocupacion: "Maestra", 
            direccion: "Olimpo 15, Las Ceibas",
            ciudad: "Nuevo Vallarta",
            telefono: "8661156816", 
            email: "itzel.rivas@ejemplo.com",
            trabajaFueraCasa: true,
            puedeDormirConHijo: true,
            apetito: "normal",
            pensamientosNegativos: false,
            tieneAlergias: false,
            alergias: ""
          }
        },
        
        dinamicaFamiliar: {
          cantidadHijos: 1,
          hijosInfo: [{
            nombre: "Bernardo",
            fechaNacimiento: "2022-01-12",
            edad: 8,
            esElQueNecesitaAyuda: true
          }],
          otrosEnCasa: "Nanny/persona de limpieza y cuidado del bebé",
          telefonoSeguimiento: "8661156816",
          emailObservaciones: "itzel.rivas@ejemplo.com",
          quienSeLevaantaNoche: "Ambos padres se turnan"
        },
        
        rutinaHabitos: {
          diaTypico: "Despierta 8:00 AM, nanny cuida hasta 4:00 PM. Desayuno sólidos 9:45 AM, siesta 10:30 AM con biberón. Siesta tarde 4:30 PM con mamá y pecho. Papá llega 6:00 PM, cenan 7:15 PM. Rutina nocturna 7:45 PM: baño, vitaminas, dientes, pecho, papá lo arrulla para cuna.",
          horaDormir: "20:00",
          dondeDuermeNoche: "Primero en su cuna/corral y luego a cama de papás",
          lloraAlDejarSolo: true,
          despiertaEnNoche: true,
          metodosRelajarse: "Pecho y arrullo",
          objetivosPadres: "Que duerma de corrido en su cuna por sí solo, siestas largas en cuna, preferiblemente destetar noche (una toma aceptable). No les molesta arrullar al inicio pero quieren solucionar despertares.",
          informacionAdicional: "Despertares cada 30 min después 8 PM, padres se turnan. 10 PM mamá se acuesta con él, amamanta cada despertar. 2 AM toma nutritiva, demás solo arrullo. 6 AM mamá trabaja, papá arrulla hasta 8-9 AM."
        }
      }
    }
    
    const bernardoResult = await db.collection('children').insertOne(bernardoData)
    const bernardoId = bernardoResult.insertedId
    console.log(`   ✅ Bernardo creado - ID: ${bernardoId}`)
    
    // PASO 3: CREAR ESTEBAN BENAVIDES GARCÍA
    console.log('\n🧸 CREANDO ESTEBAN BENAVIDES GARCÍA...')
    
    const estebanData = {
      firstName: "Esteban",
      lastName: "Benavides García",
      birthDate: "2021-02-12",
      parentId: USER_ID, // STRING para compatibilidad con frontend
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // CUESTIONARIO COMPLETO BASADO EN CASO REAL
      surveyData: {
        completedAt: new Date(),
        
        informacionFamiliar: {
          papa: {
            nombre: "Esteban Benavides",
            edad: 35,
            ocupacion: "Ingeniero",
            direccion: "Pontevedra 205 Colonia Las Sendas de Galicia",
            ciudad: "Monterrey",
            telefono: "8183626323", 
            email: "benavides.esteban@gmail.com",
            trabajaFueraCasa: true,
            tieneAlergias: true,
            alergias: "Alergias varias"
          },
          mama: {
            nombre: "Raquel García",
            edad: 32,
            ocupacion: "Mamá de tiempo completo",
            direccion: "Pontevedra 205 Colonia Las Sendas de Galicia",
            ciudad: "Monterrey",
            telefono: "8182537057",
            email: "mgd.raquel@gmail.com",
            trabajaFueraCasa: false,
            puedeDormirConHijo: true,
            apetito: "Variable, cuando estoy estresada puedo comer más",
            pensamientosNegativos: true,
            tieneAlergias: true,
            alergias: "Ácaro, en tratamiento igual que Esteban"
          }
        },
        
        dinamicaFamiliar: {
          cantidadHijos: 2,
          hijosInfo: [
            {
              nombre: "Esteban", 
              fechaNacimiento: "2021-02-12",
              edad: 24,
              esElQueNecesitaAyuda: true
            },
            {
              nombre: "Raquel",
              fechaNacimiento: "2022-10-26", 
              edad: 3,
              esElQueNecesitaAyuda: false
            }
          ],
          otrosEnCasa: "Ely (trabaja en casa desde que Esteban era bebé), enfermeras cuidando a Raquel",
          telefonoSeguimiento: "8182537057",
          emailObservaciones: "mgd.raquel@gmail.com",
          quienSeLevaantaNoche: "Ely o la enfermera (Celia). Si se despierta, entran, cambian pañal, le dicen que vuelva a dormir"
        },
        
        rutinaHabitos: {
          diaTypico: "7:00 AM despierta (si antes se queda ahí). Ely lo saca. Polyvacc, desayuna tardado, uniforme, papá colegio 8:30 AM. Recoge 1:10 PM cansado pero activo, come algo, cuna 1:30-1:45 PM. Despierta 3:30-3:45 PM. 4:00 PM come, parque. 6:45 PM cenar/medicinas. 7:30 PM rutina baño, cuento, rezar, ruido blanco, cuna.",
          horaDormir: "20:00",
          dondeDuermeNoche: "Cuna/corral en su cuarto",
          seQuedaDormirSolo: true,
          metodosRelajarse: "Pedía biberón y chupón (PROBLEMA PRINCIPAL - dentista recomendó quitar chupón)",
          objetivosPadres: "Aprenda a dormirse en cuna sin chupón. Acostarlo 8:00 PM sin batallar tanto (parte de etapa toddler)",
          informacionAdicional: "Su hermana recién nació, la ama pero le ha afectado. Ha mejorado colegio, menos exhausto. A veces golpea suavemente a quien pasa, no le gusta compartir juguetes pero ya comparte más. Con padres más rabietas y pide más biberón."
        }
      }
    }
    
    const estebanResult = await db.collection('children').insertOne(estebanData)
    const estebanId = estebanResult.insertedId
    console.log(`   ✅ Esteban creado - ID: ${estebanId}`)
    
    // PASO 4: ACTUALIZAR USUARIO CON LOS IDs
    await db.collection('users').updateOne(
      { _id: new ObjectId(USER_ID) },
      { 
        $set: { 
          children: [bernardoId, estebanId],
          updatedAt: new Date()
        }
      }
    )
    console.log(`   ✅ Usuario actualizado con children array`)
    
    // RESUMEN FINAL
    console.log('\n' + '='.repeat(50))
    console.log('🎉 NIÑOS CREADOS EXITOSAMENTE')
    console.log('='.repeat(50))
    console.log(`🍼 Bernardo García Rivas`)
    console.log(`   ID: ${bernardoId}`)
    console.log(`   Edad: ${calculateAgeInMonths("2022-01-12")} meses`)
    console.log(`   Problema: Despertares cada 30 min`)
    console.log(`   Cuestionario: ✅ Completo`)
    
    console.log(`\n🧸 Esteban Benavides García`)
    console.log(`   ID: ${estebanId}`)
    console.log(`   Edad: ${calculateAgeInMonths("2021-02-12")} meses`) 
    console.log(`   Problema: Dependencia chupón`)
    console.log(`   Cuestionario: ✅ Completo`)
    
    console.log(`\n✅ SIGUIENTE PASO:`)
    console.log(`   - Refresca tu dashboard para ver los niños`)
    console.log(`   - Usa poblar-semanal.js para generar eventos`)
    console.log(`   - Los cuestionarios están completos y listos`)
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

function calculateAgeInMonths(birthDateString) {
  const birthDate = new Date(birthDateString)
  const now = new Date()
  
  const years = now.getFullYear() - birthDate.getFullYear()
  const months = now.getMonth() - birthDate.getMonth()
  
  return years * 12 + months
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  crearBernardoYEsteban()
}

module.exports = { crearBernardoYEsteban }