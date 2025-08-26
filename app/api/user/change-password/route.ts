import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createLogger } from "@/lib/logger"
import { connectToDatabase } from "@/lib/mongodb"
import { compare, hash } from "bcryptjs"

const logger = createLogger("ChangePasswordAPI")

export async function PUT(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      logger.warn("Unauthorized password change attempt")
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate input data
    if (!currentPassword || typeof currentPassword !== 'string') {
      logger.warn("Missing current password in change request")
      return NextResponse.json(
        { error: "La contraseña actual es requerida" },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== 'string') {
      logger.warn("Missing new password in change request")
      return NextResponse.json(
        { error: "La nueva contraseña es requerida" },
        { status: 400 }
      )
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      logger.warn("New password too weak", { email: session.user.email })
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Connect to database and get user
    const { db } = await connectToDatabase()
    
    const user = await db.collection("users").findOne({
      email: session.user.email
    })
    
    if (!user || !user.password) {
      logger.warn("User not found or has no password", { email: session.user.email })
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await compare(currentPassword, user.password)
    
    if (!isCurrentPasswordValid) {
      logger.warn("Invalid current password provided", { email: session.user.email })
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await hash(newPassword, 12)

    // Update password in database
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $set: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        } 
      }
    )
    
    if (result.matchedCount === 0) {
      logger.warn("User not found for password update", { email: session.user.email })
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    logger.info("Password changed successfully", { 
      userEmail: session.user.email
    })

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente"
    })

  } catch (error) {
    logger.error("Error changing user password", error)
    
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
