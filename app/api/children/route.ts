// API para gestionar niños
// Permite crear, leer, actualizar y eliminar niños

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

// GET: Obtener niños
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Construir la consulta
    const query: any = {}

    // Si es un usuario con rol "parent", solo puede ver sus propios hijos
    if (session.user.role === "parent") {
      query.parentId = session.user.id
    }

    // Obtener los niños
    const children = await db.collection("children").find(query).toArray()

    return NextResponse.json(children)
  } catch (error) {
    console.error("Error al obtener niños:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// POST: Crear un nuevo niño
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()

    // Validar los datos
    if (!data.firstName || !data.lastName || !data.birthDate) {
      return NextResponse.json({ message: "Faltan datos requeridos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Crear el niño
    const result = await db.collection("children").insertOne({
      ...data,
      parentId: session.user.id,
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        message: "Niño creado correctamente",
        childId: result.insertedId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al crear niño:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT: Actualizar un niño existente
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()

    // Validar los datos
    if (!data.id) {
      return NextResponse.json({ message: "Falta el ID del niño" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar que el niño pertenece al usuario o es admin
    const child = await db.collection("children").findOne({ _id: data.id })

    if (!child) {
      return NextResponse.json({ message: "Niño no encontrado" }, { status: 404 })
    }

    if (child.parentId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 })
    }

    // Actualizar el niño
    const { id, ...updateData } = data
    await db.collection("children").updateOne(
      { _id: id },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({ message: "Niño actualizado correctamente" })
  } catch (error) {
    console.error("Error al actualizar niño:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE: Eliminar un niño
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ message: "Falta el ID del niño" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar que el niño pertenece al usuario o es admin
    const child = await db.collection("children").findOne({ _id: id })

    if (!child) {
      return NextResponse.json({ message: "Niño no encontrado" }, { status: 404 })
    }

    if (child.parentId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 })
    }

    // Eliminar el niño
    await db.collection("children").deleteOne({ _id: id })

    // También eliminar todos los eventos asociados
    await db.collection("events").deleteMany({ childId: id })

    return NextResponse.json({ message: "Niño eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar niño:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
