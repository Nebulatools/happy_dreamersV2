﻿#!/usr/bin/env node

/**
 * Script para crear un usuario de prueba directamente en MongoDB
 * Esto nos ayuda a verificar que la conexiÃ³n funciona ANTES de probarlo en web
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
  header: (msg) => console.log(`${colors.bold}${colors.cyan}ðŸ§ª ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function createTestUser() {
  log.header('SCRIPT DE PRUEBA - CREACIÃ“N DE USUARIO')
  console.log()

  // Datos del usuario de prueba
  const testUser = {
    name: 'Jaco',
    email: 'jaco.12.94@gmail.com',
    password: 'jaco123456',
    role: 'parent'
  }

  log.info('ConfiguraciÃ³n actual:')
  log.data(`URI: ${process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`)
  log.data(`DB: ${process.env.MONGODB_DB}`)
  log.data(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`)
  log.data(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET?.slice(0, 10)}...`)
  console.log()

  log.info('Usuario a crear:')
  log.data(`Nombre: ${testUser.name}`)
  log.data(`Email: ${testUser.email}`)
  log.data(`Password: ${testUser.password}`)
  log.data(`Rol: ${testUser.role}`)
  console.log()

  let client

  try {
    // Conectar a MongoDB
    log.info('ðŸ”Œ Conectando a MongoDB...')
    client = /* mongoose connection handled in connect() */

    await connect()
    log.success('ConexiÃ³n establecida')

    const db = await getDb()
    const usersCollection = db.collection('users')

    // Limpiar usuario existente primero
    log.info('ðŸ§¹ Limpiando usuario existente (si existe)...')
    const deleteResult = await usersCollection.deleteMany({ email: testUser.email })
    if (deleteResult.deletedCount > 0) {
      log.warning(`Eliminados ${deleteResult.deletedCount} usuarios con ese email`)
    } else {
      log.data('No habÃ­a usuarios previos con ese email')
    }

    // Hashear la contraseÃ±a
    log.info('ðŸ” Hasheando contraseÃ±a...')
    const hashedPassword = await bcrypt.hash(testUser.password, 12)
    log.success('ContraseÃ±a hasheada')

    // Crear el usuario
    log.info('ðŸ‘¤ Creando usuario en la base de datos...')
    const result = await usersCollection.insertOne({
      name: testUser.name,
      email: testUser.email,
      password: hashedPassword,
      role: testUser.role,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    if (result.insertedId) {
      log.success('Â¡Usuario creado exitosamente!')
      log.data(`ID: ${result.insertedId}`)
      console.log()

      // Verificar inmediatamente
      log.info('ðŸ” Verificando que el usuario se creÃ³...')
      const verifyUser = await usersCollection.findOne({ _id: result.insertedId })

      if (verifyUser) {
        log.success('âœ… VERIFICACIÃ“N EXITOSA')
        log.data(`âœ“ ID: ${verifyUser._id}`)
        log.data(`âœ“ Email: ${verifyUser.email}`)
        log.data(`âœ“ Nombre: ${verifyUser.name}`)
        log.data(`âœ“ Rol: ${verifyUser.role}`)
        log.data(`âœ“ ContraseÃ±a hasheada: ${verifyUser.password ? 'SÃ­' : 'No'}`)
        log.data(`âœ“ Fecha: ${verifyUser.createdAt}`)
        console.log()

        // Verificar login simulado
        log.info('ðŸ”‘ Probando validaciÃ³n de contraseÃ±a...')
        const isPasswordValid = await bcrypt.compare(testUser.password, verifyUser.password)
        if (isPasswordValid) {
          log.success('âœ… ContraseÃ±a vÃ¡lida - Login funcionarÃ­a')
        } else {
          log.error('âŒ Error en validaciÃ³n de contraseÃ±a')
        }

        console.log()
        log.header('ðŸŽ‰ Ã‰XITO TOTAL - EL USUARIO SE CREÃ“ CORRECTAMENTE')
        log.info('Ahora puedes probar en la web con:')
        log.data(`Email: ${testUser.email}`)
        log.data(`Password: ${testUser.password}`)

      } else {
        log.error('âŒ Error: No se pudo verificar el usuario')
      }

    } else {
      log.error('âŒ Error: No se obtuvo ID de inserciÃ³n')
    }

    // Mostrar estadÃ­sticas finales
    console.log()
    log.info('ðŸ“Š EstadÃ­sticas de la base de datos:')
    const totalUsers = await usersCollection.countDocuments()
    log.data(`Total usuarios: ${totalUsers}`)

    if (totalUsers > 0) {
      const allUsers = await usersCollection.find({}).toArray()
      log.data('Usuarios en BD:')
      allUsers.forEach((user, index) => {
        log.data(`  ${index + 1}. ${user.email} - ${user.name} (${user.role})`)
      })
    }

  } catch (error) {
    log.error('ðŸ’¥ Error durante la operaciÃ³n:')
    log.error(error.message)
    console.log()
    log.warning('Posibles causas:')
    log.data('â€¢ Variables de entorno incorrectas')
    log.data('â€¢ Problemas de conectividad')
    log.data('â€¢ Permisos de base de datos')
    process.exit(1)
  } finally {
    if (client) {
      await disconnect()
      log.info('ðŸ”Œ ConexiÃ³n cerrada')
    }
  }
}

// Ejecutar el script
createTestUser().catch(console.error)