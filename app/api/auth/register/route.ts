// API para el registro de usuarios
// Crea un nuevo usuario en la base de datos

import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json()

    // Validar los datos
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Faltan datos requeridos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar si el usuario ya existe
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "El email ya está registrado" }, { status: 409 })
    }

    // Hashear la contraseña
    const hashedPassword = await hash(password, 12)

    // Crear el usuario
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: role || "parent", // Por defecto, los usuarios son padres
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
    console.error("Error al registrar usuario:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
