#!/usr/bin/env node

/**
 * Script para verificar tokens de reset de contraseña
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env' })

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
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🔑 ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function checkResetTokens() {
  log.header('VERIFICACIÓN DE TOKENS DE RESET')
  console.log()

  let client

  try {
    // Conectar a MongoDB
    log.info('🔌 Conectando a MongoDB...')
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    log.success('Conexión establecida')

    const dbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
    const db = client.db(dbName)
    const usersCollection = db.collection('users')

    // Buscar usuarios con tokens de reset
    log.info('🔍 Buscando usuarios con tokens de reset...')
    const usersWithTokens = await usersCollection.find({
      resetPasswordToken: { $exists: true, $ne: null }
    }).toArray()

    if (usersWithTokens.length === 0) {
      log.warning('No se encontraron usuarios con tokens de reset activos')
    } else {
      log.success(`${usersWithTokens.length} usuario(s) con tokens de reset`)

      usersWithTokens.forEach((user, index) => {
        console.log()
        log.data(`${index + 1}. Usuario: ${user.email}`)
        log.data(`   Token: ${user.resetPasswordToken}`)
        log.data(`   Expira: ${user.resetPasswordExpiry}`)
        log.data(`   Es válido: ${user.resetPasswordExpiry > new Date() ? 'Sí' : 'No (expirado)'}`)
      })
    }

    // Buscar específicamente jaco.12.94@gmail.com
    console.log()
    log.info('🔍 Verificando usuario jaco.12.94@gmail.com...')
    const jacoUser = await usersCollection.findOne({ email: 'jaco.12.94@gmail.com' })

    if (!jacoUser) {
      log.error('Usuario jaco.12.94@gmail.com no encontrado')
    } else {
      log.success('Usuario encontrado')
      log.data(`Email: ${jacoUser.email}`)
      log.data(`Nombre: ${jacoUser.name}`)

      if (jacoUser.resetPasswordToken) {
        log.data(`Token de reset: ${jacoUser.resetPasswordToken}`)
        log.data(`Fecha de expiración: ${jacoUser.resetPasswordExpiry}`)
        log.data(`Estado: ${jacoUser.resetPasswordExpiry > new Date() ? 'Válido' : 'Expirado'}`)

        // Crear URL de reset
        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${jacoUser.resetPasswordToken}`
        console.log()
        log.header('🔗 URL DE RESET GENERADA')
        log.data(resetUrl)
      } else {
        log.warning('Usuario no tiene token de reset activo')
      }
    }

  } catch (error) {
    log.error('💥 Error durante la verificación:', error)
  } finally {
    if (client) {
      await client.close()
      log.info('🔌 Conexión cerrada')
    }
  }
}

checkResetTokens().catch(console.error)