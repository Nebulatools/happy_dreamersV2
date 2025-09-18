#!/usr/bin/env node

/**
 * Script para crear un usuario de prueba directamente en MongoDB
 * Esto nos ayuda a verificar que la conexión funciona ANTES de probarlo en web
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
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🧪 ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.white}   ${msg}${colors.reset}`)
}

async function createTestUser() {
  log.header('SCRIPT DE PRUEBA - CREACIÓN DE USUARIO')
  console.log()

  // Datos del usuario de prueba
  const testUser = {
    name: 'Jaco Test',
    email: 'ventas@jacoagency.io',
    password: 'test123456',
    role: 'parent'
  }

  log.info('Configuración actual:')
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
    log.info('🔌 Conectando a MongoDB...')
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    log.success('Conexión establecida')

    const db = client.db(process.env.MONGODB_DB)
    const usersCollection = db.collection('users')

    // Limpiar usuario existente primero
    log.info('🧹 Limpiando usuario existente (si existe)...')
    const deleteResult = await usersCollection.deleteMany({ email: testUser.email })
    if (deleteResult.deletedCount > 0) {
      log.warning(`Eliminados ${deleteResult.deletedCount} usuarios con ese email`)
    } else {
      log.data('No había usuarios previos con ese email')
    }

    // Hashear la contraseña
    log.info('🔐 Hasheando contraseña...')
    const hashedPassword = await bcrypt.hash(testUser.password, 12)
    log.success('Contraseña hasheada')

    // Crear el usuario
    log.info('👤 Creando usuario en la base de datos...')
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
      log.success('¡Usuario creado exitosamente!')
      log.data(`ID: ${result.insertedId}`)
      console.log()

      // Verificar inmediatamente
      log.info('🔍 Verificando que el usuario se creó...')
      const verifyUser = await usersCollection.findOne({ _id: result.insertedId })

      if (verifyUser) {
        log.success('✅ VERIFICACIÓN EXITOSA')
        log.data(`✓ ID: ${verifyUser._id}`)
        log.data(`✓ Email: ${verifyUser.email}`)
        log.data(`✓ Nombre: ${verifyUser.name}`)
        log.data(`✓ Rol: ${verifyUser.role}`)
        log.data(`✓ Contraseña hasheada: ${verifyUser.password ? 'Sí' : 'No'}`)
        log.data(`✓ Fecha: ${verifyUser.createdAt}`)
        console.log()

        // Verificar login simulado
        log.info('🔑 Probando validación de contraseña...')
        const isPasswordValid = await bcrypt.compare(testUser.password, verifyUser.password)
        if (isPasswordValid) {
          log.success('✅ Contraseña válida - Login funcionaría')
        } else {
          log.error('❌ Error en validación de contraseña')
        }

        console.log()
        log.header('🎉 ÉXITO TOTAL - EL USUARIO SE CREÓ CORRECTAMENTE')
        log.info('Ahora puedes probar en la web con:')
        log.data(`Email: ${testUser.email}`)
        log.data(`Password: ${testUser.password}`)

      } else {
        log.error('❌ Error: No se pudo verificar el usuario')
      }

    } else {
      log.error('❌ Error: No se obtuvo ID de inserción')
    }

    // Mostrar estadísticas finales
    console.log()
    log.info('📊 Estadísticas de la base de datos:')
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
    log.error('💥 Error durante la operación:')
    log.error(error.message)
    console.log()
    log.warning('Posibles causas:')
    log.data('• Variables de entorno incorrectas')
    log.data('• Problemas de conectividad')
    log.data('• Permisos de base de datos')
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      log.info('🔌 Conexión cerrada')
    }
  }
}

// Ejecutar el script
createTestUser().catch(console.error)