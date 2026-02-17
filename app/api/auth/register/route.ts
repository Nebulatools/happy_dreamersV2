// API para el registro de usuarios
// Crea un nuevo usuario en la base de datos

import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { hash } from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:auth:register:route")


export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json()

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    // Validar los datos
    if (!name || !normalizedEmail || !password) {
      return NextResponse.json({ message: "Faltan datos requeridos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar si el usuario ya existe
    const existingUser = await db.collection("users").findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ message: "El email ya está registrado" }, { status: 409 })
    }

    // Hashear la contraseña
    const hashedPassword = await hash(password, 12)

    // Crear el usuario
    const result = await db.collection("users").insertOne({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "parent", // Por defecto, los usuarios son padres
      phone: "",
      accountType: "",
      children: [], // Inicializar el array de hijos vacío
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        message: "Usuario registrado correctamente",
        userId: result.insertedId,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error al registrar usuario:", error)
    Sentry.captureException(error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
