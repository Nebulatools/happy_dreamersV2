#!/usr/bin/env node

/**
 * Script de diagnÃ³stico para verificar la conexiÃ³n a MongoDB
 * y buscar usuarios especÃ­ficos en la base de datos
 */

const { connect, getDb, disconnect } = require('./mongoose-util')
require('dotenv').config({ path: '.env' })

// ConfiguraciÃ³n de colores para la consola
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
  success: (msg) => console.log(`${colors.green}âœ… ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}âŒ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}âš ï¸  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}â„¹ï¸  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}ðŸ” ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function testMongoConnection() {
  log.header('DIAGNÃ“STICO DE CONEXIÃ“N MONGODB - Happy Dreamers')
  console.log()

  // Verificar variables de entorno
  log.info('Verificando variables de entorno...')

  if (!process.env.MONGODB_URI) {
    log.error('MONGODB_URI no estÃ¡ definida en .env')
    process.exit(1)
  }

  const dbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
  if (!dbName) {
    log.error('Ninguna variable de base de datos estÃ¡ definida (MONGODB_DB_FINAL, MONGODB_DATABASE, MONGODB_DB)')
    process.exit(1)
  }

  log.data(`URI: ${process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`)
  log.data(`DB: ${dbName}`)
  console.log()

  let client

  try {
    log.info('Conectando a MongoDB...')

    // Crear cliente con opciones optimizadas
    client = /* mongoose connection handled in connect() */

    // Conectar
    await connect()
    log.success('ConexiÃ³n establecida correctamente')

    // Verificar ping
    log.info('Verificando ping al servidor...')
    const pingResult = await await getDb().admin().ping()
    log.success('Ping exitoso')
    log.data(`Resultado: ${JSON.stringify(pingResult)}`)
    console.log()

    // Obtener informaciÃ³n del servidor (opcional)
    log.info('Intentando obtener informaciÃ³n del servidor...')
    try {
      const serverStatus = await await getDb().admin().serverStatus()
      log.success('InformaciÃ³n del servidor obtenida')
      log.data(`Host: ${serverStatus.host}`)
      log.data(`VersiÃ³n MongoDB: ${serverStatus.version}`)
      log.data(`Uptime: ${Math.floor(serverStatus.uptime / 60)} minutos`)
      log.data(`Conexiones activas: ${serverStatus.connections.current}`)
    } catch (serverError) {
      log.warning('No se pudo obtener informaciÃ³n del servidor (permisos limitados)')
      log.data('Esto es normal en conexiones con permisos limitados')
    }
    console.log()

    // Verificar base de datos especÃ­fica
    const dbName = process.env.MONGODB_DB
    const db = await getDb()

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
    log.info('Verificando colecciÃ³n de usuarios...')
    const usersCollection = db.collection('users')
    const userCount = await usersCollection.countDocuments()
    log.success(`ColecciÃ³n 'users' encontrada con ${userCount} documentos`)
    console.log()

    // Buscar usuario especÃ­fico
    const targetEmail = 'test@test.com'
    log.info(`Buscando usuario: ${targetEmail}`)

    const user = await usersCollection.findOne({ email: targetEmail })

    if (user) {
      log.success('Â¡Usuario encontrado!')
      log.data(`ID: ${user._id}`)
      log.data(`Nombre: ${user.name}`)
      log.data(`Email: ${user.email}`)
      log.data(`Rol: ${user.role}`)
      log.data(`Fecha creaciÃ³n: ${user.createdAt}`)
      log.data(`Tiene contraseÃ±a: ${user.password ? 'SÃ­' : 'No'}`)
      log.data(`NÃºmero de hijos: ${user.children ? user.children.length : 0}`)
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

    log.success('DiagnÃ³stico completado exitosamente')

  } catch (error) {
    log.error('Error durante el diagnÃ³stico:')
    log.error(error.message)

    if (error.name === 'MongoServerSelectionError') {
      log.warning('Problemas de conectividad - verificar:')
      log.data('â€¢ URL de conexiÃ³n correcta')
      log.data('â€¢ Credenciales vÃ¡lidas')
      log.data('â€¢ Whitelist de IP configurado')
      log.data('â€¢ Firewall/proxy no bloqueando')
    }

    process.exit(1)
  } finally {
    if (client) {
      await disconnect()
      log.info('ConexiÃ³n cerrada')
    }
  }
}

// Ejecutar el script
testMongoConnection().catch(console.error)