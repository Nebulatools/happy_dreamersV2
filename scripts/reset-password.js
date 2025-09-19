﻿#!/usr/bin/env node

/**
 * Script para resetear contraseÃ±as de usuarios en MongoDB
 * Permite cambiar la contraseÃ±a de cualquier usuario por email
 */

const { connect, getDb, disconnect } = require('./mongoose-util')
const bcrypt = require('bcryptjs')
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
  header: (msg) => console.log(`${colors.bold}${colors.cyan}ðŸ”‘ ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function resetPassword() {
  log.header('SCRIPT DE RESET DE CONTRASEÃ‘A')
  console.log()

  // ConfiguraciÃ³n del reset
  const resetConfig = {
    email: 'jaco.12.94@gmail.com',  // Email del usuario
    newPassword: 'nuevaPassword123', // Nueva contraseÃ±a
  }

  log.info('ConfiguraciÃ³n actual del script:')
  log.data(`Email objetivo: ${resetConfig.email}`)
  log.data(`Nueva contraseÃ±a: ${resetConfig.newPassword}`)
  log.data(`Base de datos: ${process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB}`)
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

    // Buscar usuario
    log.info('ðŸ‘¤ Buscando usuario...')
    const user = await usersCollection.findOne({ email: resetConfig.email })

    if (!user) {
      log.error(`Usuario con email ${resetConfig.email} no encontrado`)

      // Mostrar usuarios disponibles
      log.info('Usuarios disponibles:')
      const allUsers = await usersCollection.find({}).toArray()
      if (allUsers.length > 0) {
        allUsers.forEach((u, index) => {
          log.data(`  ${index + 1}. ${u.email} - ${u.name} (${u.role})`)
        })
      } else {
        log.warning('No hay usuarios en la base de datos')
      }
      return
    }

    log.success('Usuario encontrado')
    log.data(`ID: ${user._id}`)
    log.data(`Nombre: ${user.name}`)
    log.data(`Email: ${user.email}`)
    log.data(`Rol: ${user.role}`)
    console.log()

    // Hashear nueva contraseÃ±a
    log.info('ðŸ” Generando hash de nueva contraseÃ±a...')
    const newPasswordHash = await bcrypt.hash(resetConfig.newPassword, 12)
    log.success('Hash generado correctamente')

    // Actualizar contraseÃ±a
    log.info('ðŸ’¾ Actualizando contraseÃ±a en la base de datos...')
    const updateResult = await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: newPasswordHash,
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.modifiedCount === 1) {
      log.success('Â¡ContraseÃ±a actualizada exitosamente!')
      console.log()

      // Verificar el cambio
      log.info('ðŸ” Verificando el cambio...')
      const updatedUser = await usersCollection.findOne({ _id: user._id })

      if (updatedUser && updatedUser.password !== user.password) {
        log.success('âœ… VERIFICACIÃ“N EXITOSA')
        log.data(`âœ“ ContraseÃ±a cambiada`)
        log.data(`âœ“ Fecha actualizada: ${updatedUser.updatedAt}`)
        console.log()

        // Probar login simulado
        log.info('ðŸ”‘ Probando nueva contraseÃ±a...')
        const isValid = await bcrypt.compare(resetConfig.newPassword, updatedUser.password)

        if (isValid) {
          log.success('âœ… Nueva contraseÃ±a vÃ¡lida - Login funcionarÃ­a')
          console.log()

          log.header('ðŸŽ‰ RESET COMPLETADO EXITOSAMENTE')
          log.info('Credenciales actualizadas:')
          log.data(`Email: ${resetConfig.email}`)
          log.data(`Password: ${resetConfig.newPassword}`)
          console.log()
          log.warning('ðŸ” IMPORTANTE: Cambia esta contraseÃ±a temporal desde la aplicaciÃ³n')

        } else {
          log.error('âŒ Error en la validaciÃ³n de la nueva contraseÃ±a')
        }
      } else {
        log.error('âŒ Error: No se pudo verificar el cambio')
      }

    } else {
      log.error('âŒ Error: No se pudo actualizar la contraseÃ±a')
    }

    // EstadÃ­sticas finales
    console.log()
    log.info('ðŸ“Š EstadÃ­sticas de la base de datos:')
    const totalUsers = await usersCollection.countDocuments()
    log.data(`Total usuarios: ${totalUsers}`)

  } catch (error) {
    log.error('ðŸ’¥ Error durante el reset de contraseÃ±a:')
    log.error(error.message)
    console.log()
    log.warning('Posibles causas:')
    log.data('â€¢ Problemas de conectividad con MongoDB')
    log.data('â€¢ Usuario no existe en la base de datos')
    log.data('â€¢ Permisos insuficientes')
    log.data('â€¢ Error en el hash de la contraseÃ±a')
    process.exit(1)
  } finally {
    if (client) {
      await disconnect()
      log.info('ðŸ”Œ ConexiÃ³n cerrada')
    }
  }
}

// Mostrar ayuda si se ejecuta sin argumentos
if (process.argv.length > 2) {
  console.log(`
ðŸ”‘ SCRIPT DE RESET DE CONTRASEÃ‘A

Uso:
  node reset-password.js                    # Reset con configuraciÃ³n predeterminada

ConfiguraciÃ³n actual:
  Email: jaco.12.94@gmail.com
  Nueva contraseÃ±a: nuevaPassword123

Para cambiar email o contraseÃ±a, edita las variables en el archivo.
`)
} else {
  // Ejecutar el script
  resetPassword().catch(console.error)
}