// API endpoint para manejar solicitudes de recuperación de contraseña
// VERSIÓN TEMPORAL: Con persistencia en archivo para desarrollo

import { NextResponse } from "next/server"
import crypto from "crypto"
import { tempStorage } from "@/lib/temp-storage"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      )
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hora

    // Guardar el token en archivo temporal
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")
    
    const emailLower = email.toLowerCase()
    tempStorage.setToken(hashedToken, emailLower, resetTokenExpiry)
    console.log("📝 Token guardado para email:", emailLower)

    // Construir URL de reset
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

    // En desarrollo, mostrar el link en consola
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🔑 LINK DE RESETEO DE CONTRASEÑA")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Email:", email)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Copia y pega este link en tu navegador:")
    console.log("\n" + resetUrl + "\n")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("⏱️  Este link es válido por 1 hora")
    console.log("📝 Token guardado en archivo temporal")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    return NextResponse.json({
      message: "Si el email existe en nuestro sistema, recibirás instrucciones para resetear tu contraseña.",
      // En desarrollo, incluir el link para facilitar las pruebas
      ...(process.env.NODE_ENV === "development" && { resetUrl })
    })

  } catch (error) {
    console.error("Error en forgot password:", error)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}