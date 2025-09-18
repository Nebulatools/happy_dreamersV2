#!/usr/bin/env node

/**
 * Script para resetear contraseñas de usuarios en MongoDB
 * Permite cambiar la contraseña de cualquier usuario por email
 */

const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
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
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🔑 ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function resetPassword() {
  log.header('SCRIPT DE RESET DE CONTRASEÑA')
  console.log()

  // Configuración del reset
  const resetConfig = {
    email: 'jaco.12.94@gmail.com',  // Email del usuario
    newPassword: 'nuevaPassword123', // Nueva contraseña
  }

  log.info('Configuración actual del script:')
  log.data(`Email objetivo: ${resetConfig.email}`)
  log.data(`Nueva contraseña: ${resetConfig.newPassword}`)
  log.data(`Base de datos: ${process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB}`)
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

    // Buscar usuario
    log.info('👤 Buscando usuario...')
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

    // Hashear nueva contraseña
    log.info('🔐 Generando hash de nueva contraseña...')
    const newPasswordHash = await bcrypt.hash(resetConfig.newPassword, 12)
    log.success('Hash generado correctamente')

    // Actualizar contraseña
    log.info('💾 Actualizando contraseña en la base de datos...')
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
      log.success('¡Contraseña actualizada exitosamente!')
      console.log()

      // Verificar el cambio
      log.info('🔍 Verificando el cambio...')
      const updatedUser = await usersCollection.findOne({ _id: user._id })

      if (updatedUser && updatedUser.password !== user.password) {
        log.success('✅ VERIFICACIÓN EXITOSA')
        log.data(`✓ Contraseña cambiada`)
        log.data(`✓ Fecha actualizada: ${updatedUser.updatedAt}`)
        console.log()

        // Probar login simulado
        log.info('🔑 Probando nueva contraseña...')
        const isValid = await bcrypt.compare(resetConfig.newPassword, updatedUser.password)

        if (isValid) {
          log.success('✅ Nueva contraseña válida - Login funcionaría')
          console.log()

          log.header('🎉 RESET COMPLETADO EXITOSAMENTE')
          log.info('Credenciales actualizadas:')
          log.data(`Email: ${resetConfig.email}`)
          log.data(`Password: ${resetConfig.newPassword}`)
          console.log()
          log.warning('🔐 IMPORTANTE: Cambia esta contraseña temporal desde la aplicación')

        } else {
          log.error('❌ Error en la validación de la nueva contraseña')
        }
      } else {
        log.error('❌ Error: No se pudo verificar el cambio')
      }

    } else {
      log.error('❌ Error: No se pudo actualizar la contraseña')
    }

    // Estadísticas finales
    console.log()
    log.info('📊 Estadísticas de la base de datos:')
    const totalUsers = await usersCollection.countDocuments()
    log.data(`Total usuarios: ${totalUsers}`)

  } catch (error) {
    log.error('💥 Error durante el reset de contraseña:')
    log.error(error.message)
    console.log()
    log.warning('Posibles causas:')
    log.data('• Problemas de conectividad con MongoDB')
    log.data('• Usuario no existe en la base de datos')
    log.data('• Permisos insuficientes')
    log.data('• Error en el hash de la contraseña')
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      log.info('🔌 Conexión cerrada')
    }
  }
}

// Mostrar ayuda si se ejecuta sin argumentos
if (process.argv.length > 2) {
  console.log(`
🔑 SCRIPT DE RESET DE CONTRASEÑA

Uso:
  node reset-password.js                    # Reset con configuración predeterminada

Configuración actual:
  Email: jaco.12.94@gmail.com
  Nueva contraseña: nuevaPassword123

Para cambiar email o contraseña, edita las variables en el archivo.
`)
} else {
  // Ejecutar el script
  resetPassword().catch(console.error)
}