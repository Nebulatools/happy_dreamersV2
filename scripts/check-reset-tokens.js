﻿#!/usr/bin/env node

/**
 * Script para verificar tokens de reset de contraseÃ±a
 */

const { connect, getDb, disconnect } = require('./mongoose-util')
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
  success: (msg) => console.log(`${colors.green}âœ… ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}âŒ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}âš ï¸  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}â„¹ï¸  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}ðŸ”‘ ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function checkResetTokens() {
  log.header('VERIFICACIÃ“N DE TOKENS DE RESET')
  console.log()

  let client

  try {
    // Conectar a MongoDB
    log.info('ðŸ”Œ Conectando a MongoDB...')
    client = /* mongoose connection handled in connect() */

    await connect()
    log.success('ConexiÃ³n establecida')

    const dbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
    const db = await getDb()
    const usersCollection = db.collection('users')

    // Buscar usuarios con tokens de reset
    log.info('ðŸ” Buscando usuarios con tokens de reset...')
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
        log.data(`   Es vÃ¡lido: ${user.resetPasswordExpiry > new Date() ? 'SÃ­' : 'No (expirado)'}`)
      })
    }

    // Buscar especÃ­ficamente jaco.12.94@gmail.com
    console.log()
    log.info('ðŸ” Verificando usuario jaco.12.94@gmail.com...')
    const jacoUser = await usersCollection.findOne({ email: 'jaco.12.94@gmail.com' })

    if (!jacoUser) {
      log.error('Usuario jaco.12.94@gmail.com no encontrado')
    } else {
      log.success('Usuario encontrado')
      log.data(`Email: ${jacoUser.email}`)
      log.data(`Nombre: ${jacoUser.name}`)

      if (jacoUser.resetPasswordToken) {
        log.data(`Token de reset: ${jacoUser.resetPasswordToken}`)
        log.data(`Fecha de expiraciÃ³n: ${jacoUser.resetPasswordExpiry}`)
        log.data(`Estado: ${jacoUser.resetPasswordExpiry > new Date() ? 'VÃ¡lido' : 'Expirado'}`)

        // Crear URL de reset
        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${jacoUser.resetPasswordToken}`
        console.log()
        log.header('ðŸ”— URL DE RESET GENERADA')
        log.data(resetUrl)
      } else {
        log.warning('Usuario no tiene token de reset activo')
      }
    }

  } catch (error) {
    log.error('ðŸ’¥ Error durante la verificaciÃ³n:', error)
  } finally {
    if (client) {
      await disconnect()
      log.info('ðŸ”Œ ConexiÃ³n cerrada')
    }
  }
}

checkResetTokens().catch(console.error)