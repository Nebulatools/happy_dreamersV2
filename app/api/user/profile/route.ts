import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createLogger } from "@/lib/logger"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const logger = createLogger("UserProfileAPI")

const ALLOWED_ACCOUNT_TYPES = ["father", "mother", "caregiver", ""]

export async function PUT(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      logger.warn("Unauthorized profile update attempt")
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, phone, accountType, timezone } = body

    // Validate input data
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      logger.warn("Invalid name provided in profile update", { name })
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      )
    }

    // Validate phone format if provided
    if (phone && typeof phone === 'string' && phone.trim().length > 0) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        logger.warn("Invalid phone format provided", { phone })
        return NextResponse.json(
          { error: "Formato de teléfono inválido" },
          { status: 400 }
        )
      }
    }

    if (accountType !== undefined && !ALLOWED_ACCOUNT_TYPES.includes(accountType)) {
      logger.warn("Invalid accountType provided in profile update", { accountType })
      return NextResponse.json(
        { error: "Tipo de cuenta inválido" },
        { status: 400 }
      )
    }

    // Validate timezone (simple whitelist for ahora)
    const ALLOWED_TIMEZONES = [
      "America/Monterrey",
      "America/Mexico_City",
      "America/Chicago",
      "America/New_York",
      "UTC",
      "Asia/Tokyo",
    ]

    if (timezone && !ALLOWED_TIMEZONES.includes(timezone)) {
      logger.warn("Invalid timezone provided", { timezone })
      return NextResponse.json(
        { error: "Zona horaria inválida" },
        { status: 400 }
      )
    }

    // Update user in database
    const { db } = await connectToDatabase()

    const updateData: any = {
      name: name.trim(),
      updatedAt: new Date()
    }

    // Always update phone field - either set to value or empty string
    updateData.phone = phone && phone.trim().length > 0 ? phone.trim() : ""

    if (accountType !== undefined) {
      updateData.accountType = accountType
    }
    if (timezone) {
      updateData.timezone = timezone
    }
    
    logger.info("Updating user profile with data:", { 
      email: session.user.email, 
      updateData: { ...updateData, email: session.user.email } 
    })
    
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      logger.warn("User not found for profile update", { email: session.user.email })
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }
    
    // Fetch the updated user data to return current state
    const updatedUser = await db.collection("users").findOne(
      { email: session.user.email },
      { projection: { password: 0 } }
    )
    
    const responseData = {
      name: updatedUser?.name || "",
      phone: updatedUser?.phone || "",
      email: session.user.email,
      role: updatedUser?.role || "user",
      accountType: updatedUser?.accountType || "",
      timezone: updatedUser?.timezone || "America/Monterrey"
    }

    logger.info("Profile updated successfully", { 
      userEmail: session.user.email,
      responseData
    })

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente",
      data: responseData
    })

  } catch (error) {
    logger.error("Error updating user profile", error)
    
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      logger.warn("Unauthorized profile access attempt")
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Fetch user data from database
    const { db } = await connectToDatabase()
    
    const user = await db.collection("users").findOne(
      { email: session.user.email },
      { projection: { password: 0 } } // Exclude password from result
    )
    
    if (!user) {
      logger.warn("User not found for profile retrieval", { email: session.user.email })
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }
    
    const userData = {
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role || "user",
      accountType: user.accountType || "",
      timezone: user.timezone || "America/Monterrey"
    }

    logger.info("Profile data retrieved", { 
      userEmail: session.user.email, 
      userData 
    })

    return NextResponse.json({
      success: true,
      data: userData
    })

  } catch (error) {
    logger.error("Error fetching user profile", error)
    
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
