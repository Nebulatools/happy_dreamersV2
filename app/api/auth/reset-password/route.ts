// API endpoint para resetear la contraseña con token
// VERSIÓN TEMPORAL: Con persistencia en archivo para desarrollo

import { NextResponse } from "next/server"
import crypto from "crypto"
import { tempStorage } from "@/lib/temp-storage"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Validar longitud mínima de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      )
    }

    // Hash del token recibido
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    // Buscar token en archivo
    const tokenData = tempStorage.getToken(hashedToken)
    
    if (!tokenData) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 400 }
      )
    }

    // Guardar la nueva contraseña temporalmente
    const emailLower = tokenData.email.toLowerCase()
    tempStorage.setPassword(emailLower, password)
    
    // Eliminar el token usado
    tempStorage.deleteToken(hashedToken)

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("✅ CONTRASEÑA ACTUALIZADA")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Email:", emailLower)
    console.log("Contraseña (primeros 3 caracteres):", password.substring(0, 3) + "***")
    console.log("Nueva contraseña guardada en archivo temporal")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    
    // Verificar que se guardó
    const verificacion = tempStorage.getPassword(emailLower)
    console.log("🔍 Verificación - Contraseña guardada:", verificacion ? "✓" : "✗")

    return NextResponse.json({
      message: "Contraseña actualizada exitosamente"
    })

  } catch (error) {
    console.error("Error en reset password:", error)
    return NextResponse.json(
      { error: "Error al resetear la contraseña" },
      { status: 500 }
    )
  }
}

// GET para verificar si el token es válido
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token no proporcionado" },
        { status: 400 }
      )
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    const tokenData = tempStorage.getToken(hashedToken)
    
    if (!tokenData) {
      console.log("Token no encontrado:", hashedToken.substring(0, 10) + "...")
      return NextResponse.json(
        { valid: false, error: "Token inválido o no encontrado" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: tokenData.email // Para mostrar a qué cuenta se está reseteando
    })

  } catch (error) {
    console.error("Error verificando token:", error)
    return NextResponse.json(
      { valid: false, error: "Error al verificar token" },
      { status: 500 }
    )
  }
}