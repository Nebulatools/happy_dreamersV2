// API para solicitar reset de contraseña
// Envía email con link de reset usando MongoDB

import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { connectToDatabase } from "@/lib/mongodb"
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email"
import crypto from "crypto"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:auth:forgot-password")

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    // Validar email
    if (!email) {
      return NextResponse.json({
        message: "El email es requerido",
      }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    const usersCollection = db.collection("users")

    // Verificar si el usuario existe
    const user = await usersCollection.findOne({ email: email.toLowerCase() })

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json({
        message: "Si el email existe, recibirás un enlace de recuperación",
      }, { status: 200 })
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // 1 hora de expiración

    // Guardar token en la base de datos
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpiry: resetTokenExpiry,
          updatedAt: new Date(),
        },
      }
    )

    // Crear URL de reset
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // Enviar email
    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      resetUrl,
      expiresInMinutes: 60,
    })

    if (!emailResult.success) {
      logger.error("Error enviando email de reset:", emailResult.error)
      return NextResponse.json({
        message: "Error enviando el email de recuperación",
      }, { status: 500 })
    }

    logger.info(`Email de reset enviado a ${email}`)

    // En desarrollo, mostrar el link
    if (process.env.NODE_ENV === "development") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("🔑 LINK DE RESETEO DE CONTRASEÑA")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("Email:", email)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("Copia y pega este link en tu navegador:")
      console.log("\n" + resetUrl + "\n")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("⏱️  Este link es válido por 1 hora")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    }

    return NextResponse.json({
      message: "Si el email existe, recibirás un enlace de recuperación",
      success: true,
      // En desarrollo, incluir el link para facilitar las pruebas
      ...(process.env.NODE_ENV === "development" && { resetUrl }),
    }, { status: 200 })

  } catch (error) {
    logger.error("Error en forgot-password:", error)
    Sentry.captureException(error)
    return NextResponse.json({
      message: "Error interno del servidor",
    }, { status: 500 })
  }
}
