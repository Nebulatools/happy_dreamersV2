// API endpoint para manejar solicitudes de recuperación de contraseña

import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Buscar el usuario por email
    const user = await User.findOne({ email: email.toLowerCase() })

    // Por seguridad, siempre retornamos éxito incluso si el email no existe
    // para no revelar qué emails están registrados
    if (!user) {
      return NextResponse.json({
        message: "Si el email existe en nuestro sistema, recibirás instrucciones para resetear tu contraseña."
      })
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hora

    // Guardar el token en el usuario
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")
    user.resetPasswordExpiry = resetTokenExpiry
    await user.save()

    // Construir URL de reset
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // TODO: Implementar función de envío de email
    // Por ahora, simularemos el envío
    if (process.env.NODE_ENV === "development") {
      console.log("Reset URL:", resetUrl)
    }

    // En producción, enviaríamos el email real
    // await sendPasswordResetEmail(user.email, resetUrl)

    return NextResponse.json({
      message: "Si el email existe en nuestro sistema, recibirás instrucciones para resetear tu contraseña."
    })

  } catch (error) {
    console.error("Error en forgot password:", error)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}