// API para procesar reset de contraseña
// Valida token y actualiza contraseña usando MongoDB

import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hash } from "bcryptjs"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:auth:reset-password")

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    // Validar datos
    if (!token || !password) {
      return NextResponse.json({
        message: "Token y contraseña son requeridos"
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({
        message: "La contraseña debe tener al menos 6 caracteres"
      }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    const usersCollection = db.collection("users")

    // Buscar usuario con token válido
    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() } // Token no expirado
    })

    if (!user) {
      return NextResponse.json({
        message: "Token inválido o expirado"
      }, { status: 400 })
    }

    // Hashear nueva contraseña
    const hashedPassword = await hash(password, 12)

    // Actualizar contraseña y limpiar token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpiry: ""
        }
      }
    )

    logger.info(`Contraseña actualizada para usuario ${user.email}`)

    // Log para desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("✅ CONTRASEÑA ACTUALIZADA")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("Email:", user.email)
      console.log("Contraseña actualizada en MongoDB")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    }

    return NextResponse.json({
      message: "Contraseña actualizada correctamente",
      success: true
    }, { status: 200 })

  } catch (error) {
    logger.error("Error en reset-password:", error)
    return NextResponse.json({
      message: "Error interno del servidor"
    }, { status: 500 })
  }
}

// Endpoint GET para validar token
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({
        valid: false,
        message: "Token requerido"
      }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    const usersCollection = db.collection("users")

    // Verificar si el token es válido
    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() }
    })

    if (!user) {
      return NextResponse.json({
        valid: false,
        message: "Token inválido o expirado"
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      message: "Token válido",
      email: user.email // Solo para mostrar en la UI
    }, { status: 200 })

  } catch (error) {
    logger.error("Error validando token:", error)
    return NextResponse.json({
      valid: false,
      message: "Error interno del servidor"
    }, { status: 500 })
  }
}