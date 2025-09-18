#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar la conexión a MongoDB
 * y buscar usuarios específicos en la base de datos
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env' })

// Configuración de colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🔍 ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function testMongoConnection() {
  log.header('DIAGNÓSTICO DE CONEXIÓN MONGODB - Happy Dreamers')
  console.log()

  // Verificar variables de entorno
  log.info('Verificando variables de entorno...')

  if (!process.env.MONGODB_URI) {
    log.error('MONGODB_URI no está definida en .env')
    process.exit(1)
  }

  if (!process.env.MONGODB_DB) {
    log.error('MONGODB_DB no está definida en .env')
    process.exit(1)
  }

  log.data(`URI: ${process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`)
  log.data(`DB: ${process.env.MONGODB_DB}`)
  console.log()

  let client

  try {
    log.info('Conectando a MongoDB...')

    // Crear cliente con opciones optimizadas
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    })

    // Conectar
    await client.connect()
    log.success('Conexión establecida correctamente')

    // Verificar ping
    log.info('Verificando ping al servidor...')
    const pingResult = await client.db().admin().ping()
    log.success('Ping exitoso')
    log.data(`Resultado: ${JSON.stringify(pingResult)}`)
    console.log()

    // Obtener información del servidor (opcional)
    log.info('Intentando obtener información del servidor...')
    try {
      const serverStatus = await client.db().admin().serverStatus()
      log.success('Información del servidor obtenida')
      log.data(`Host: ${serverStatus.host}`)
      log.data(`Versión MongoDB: ${serverStatus.version}`)
      log.data(`Uptime: ${Math.floor(serverStatus.uptime / 60)} minutos`)
      log.data(`Conexiones activas: ${serverStatus.connections.current}`)
    } catch (serverError) {
      log.warning('No se pudo obtener información del servidor (permisos limitados)')
      log.data('Esto es normal en conexiones con permisos limitados')
    }
    console.log()

    // Verificar base de datos específica
    const dbName = process.env.MONGODB_DB
    const db = client.db(dbName)

    log.info(`Verificando base de datos '${dbName}'...`)
    const collections = await db.listCollections().toArray()
    log.success(`Base de datos encontrada con ${collections.length} colecciones`)

    if (collections.length > 0) {
      log.data('Colecciones encontradas:')
      collections.forEach(col => {
        log.data(`  - ${col.name}`)
      })
    }
    console.log()

    // Buscar usuarios
    log.info('Verificando colección de usuarios...')
    const usersCollection = db.collection('users')
    const userCount = await usersCollection.countDocuments()
    log.success(`Colección 'users' encontrada con ${userCount} documentos`)
    console.log()

    // Buscar usuario específico
    const targetEmail = 'ventas@jacoagency.io'
    log.info(`Buscando usuario: ${targetEmail}`)

    const user = await usersCollection.findOne({ email: targetEmail })

    if (user) {
      log.success('¡Usuario encontrado!')
      log.data(`ID: ${user._id}`)
      log.data(`Nombre: ${user.name}`)
      log.data(`Email: ${user.email}`)
      log.data(`Rol: ${user.role}`)
      log.data(`Fecha creación: ${user.createdAt}`)
      log.data(`Tiene contraseña: ${user.password ? 'Sí' : 'No'}`)
      log.data(`Número de hijos: ${user.children ? user.children.length : 0}`)
    } else {
      log.warning('Usuario NO encontrado en la base de datos')

      // Buscar todos los usuarios para debug
      log.info('Listando todos los usuarios existentes...')
      const allUsers = await usersCollection.find({}).limit(10).toArray()

      if (allUsers.length > 0) {
        log.data('Usuarios encontrados:')
        allUsers.forEach((u, index) => {
          log.data(`  ${index + 1}. ${u.email} - ${u.name} (${u.role})`)
        })
      } else {
        log.warning('No hay usuarios en la base de datos')
      }
    }
    console.log()

    // Verificar otras colecciones relevantes
    const collectionsToCheck = ['accounts', 'sessions', 'users', 'verification_tokens']

    for (const collectionName of collectionsToCheck) {
      if (collections.some(c => c.name === collectionName)) {
        const count = await db.collection(collectionName).countDocuments()
        log.data(`${collectionName}: ${count} documentos`)
      }
    }

    log.success('Diagnóstico completado exitosamente')

  } catch (error) {
    log.error('Error durante el diagnóstico:')
    log.error(error.message)

    if (error.name === 'MongoServerSelectionError') {
      log.warning('Problemas de conectividad - verificar:')
      log.data('• URL de conexión correcta')
      log.data('• Credenciales válidas')
      log.data('• Whitelist de IP configurado')
      log.data('• Firewall/proxy no bloqueando')
    }

    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      log.info('Conexión cerrada')
    }
  }
}

// Ejecutar el script
testMongoConnection().catch(console.error)