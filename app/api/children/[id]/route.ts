// API para gestionar un niño específico por ID
// Permite obtener, actualizar y eliminar un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET /api/children/[id] - obtener un niño específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    console.log(`Buscando niño con ID: ${id} para el usuario ${session.user.id}`);
    
    const client = await clientPromise
    const db = client.db()

    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: session.user.id,
    })

    if (!child) {
      console.error(`Niño con ID ${id} no encontrado o no pertenece al usuario ${session.user.id}`);
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para verlo" }, { status: 404 })
    }

    console.log(`Niño encontrado: ${child.firstName} ${child.lastName}`);
    return NextResponse.json(child)
  } catch (error) {
    console.error("Error al obtener niño:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT /api/children/[id] - actualizar un niño existente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("PUT /api/children/[id] - Iniciando solicitud de actualización");
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      console.error("Error: No hay sesión o usuario autorizado");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    console.log(`Actualizando niño con ID: ${id}`);

    const data = await request.json()
    console.log("Datos recibidos para actualización:", {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      hasSurveyData: !!data.surveyData
    });

    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: session.user.id,
    })

    if (!child) {
      console.error(`Niño con ID ${id} no encontrado o no pertenece al usuario ${session.user.id}`);
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para editarlo" }, { status: 404 })
    }

    // Extraer solo los campos que queremos actualizar
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate || "",
      updatedAt: new Date(),
    }

    // Si hay datos de encuesta, incluirlos
    if (data.surveyData) {
      updateData.surveyData = data.surveyData
    }

    console.log("Datos a actualizar:", updateData);
    
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    console.log("Resultado de la actualización:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No se encontró el niño para actualizar" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Información del niño actualizada correctamente",
      updated: result.modifiedCount > 0
    })
  } catch (error) {
    console.error("Error al actualizar niño:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/children/[id] - eliminar un niño
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    
    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: session.user.id,
    })

    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para eliminarlo" }, { status: 404 })
    }

    // Eliminar el niño
    const result = await db.collection("children").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "No se pudo eliminar el niño" }, { status: 500 })
    }

    return NextResponse.json({ message: "Niño eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar niño:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
} 