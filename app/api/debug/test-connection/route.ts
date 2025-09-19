// Endpoint de debug para probar la conexión a MongoDB en Vercel
// Este endpoint nos ayudará a ver exactamente qué está pasando

import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongoose"

export async function GET() {
  try {
    console.log("🔍 DEBUG: Iniciando test de conexión...")

    // Verificar variables de entorno
    const envCheck = {
      MONGODB_URI: process.env.MONGODB_URI ? "✅ Definida" : "❌ NO definida",
      MONGODB_DB: process.env.MONGODB_DB ? "✅ Definida" : "❌ NO definida",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "✅ Definida" : "❌ NO definida",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ Definida" : "❌ NO definida",
      NODE_ENV: process.env.NODE_ENV || "undefined"
    }

    console.log("🔍 Variables de entorno:", envCheck)

    // Intentar conectar
    console.log("🔍 Intentando conectar a MongoDB...")
  const db = await getDb()

    // Hacer ping
    await db.admin().ping()
    console.log("✅ Ping exitoso")

    // Contar usuarios
    const usersCollection = db.collection('users')
    const userCount = await usersCollection.countDocuments()
    console.log(`📊 Usuarios encontrados: ${userCount}`)

    // Buscar usuario específico
    const testUser = await usersCollection.findOne({ email: "ventas@jacoagency.io" })
    console.log("👤 Usuario test encontrado:", testUser ? "SÍ" : "NO")

    // Listar primeros 3 usuarios
    const allUsers = await usersCollection.find({}).limit(3).toArray()
    const usersList = allUsers.map(u => ({ email: u.email, name: u.name, role: u.role }))

    return NextResponse.json({
      success: true,
      message: "Conexión exitosa",
      debug: {
        environment: envCheck,
        database: {
          connected: true,
          userCount,
          testUserExists: !!testUser,
          users: usersList
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("❌ Error en test de conexión:", error)

    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        environment: {
          MONGODB_URI: process.env.MONGODB_URI ? "Definida" : "NO definida",
          MONGODB_DB: process.env.MONGODB_DB ? "Definida" : "NO definida",
          NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "Definida" : "NO definida",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "Definida" : "NO definida",
          NODE_ENV: process.env.NODE_ENV || "undefined"
        },
        errorType: error.constructor.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
