// API para gestionar niños
// Permite crear, leer, actualizar y eliminar niños

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET /api/children - obtener todos los niños del usuario autenticado
// GET /api/children?id=123 - obtener un niño específico
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      console.error("Error: No hay sesión o usuario autorizado");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    const client = await clientPromise
    const db = client.db()

    // Si se proporciona un ID, obtener solo ese niño
    if (id) {
      console.log(`Buscando niño con ID: ${id} para el usuario ${session.user.id}`);
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
    }

    // Obtener todos los niños del usuario actual
    console.log(`Obteniendo todos los niños del usuario ${session.user.id}`);
    const children = await db.collection("children")
      .find({ parentId: session.user.id })
      .toArray()

    console.log(`Se encontraron ${children.length} niños para el usuario ${session.user.id}`);
    return NextResponse.json(children)
  } catch (error) {
    console.error("Error al obtener niños:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/children - crear un nuevo niño con datos básicos y encuesta completa
export async function POST(request: NextRequest) {
  console.log("POST /api/children - Iniciando solicitud");
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      console.error("Error: No hay sesión o usuario autorizado");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await request.json()
    console.log("Datos básicos recibidos:", {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      parentId: session.user.id,
      hasSurveyData: !!data.surveyData
    });
    
    // Validar datos básicos de forma individual (solo nombre y apellido obligatorios para pruebas)
    const missingFields = [];
    if (!data.firstName) missingFields.push('firstName');
    if (!data.lastName) missingFields.push('lastName');
    
    if (missingFields.length > 0) {
      console.error(`Error: Faltan campos requeridos: ${missingFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Faltan datos básicos requeridos",
        missingFields: missingFields
      }, { status: 400 });
    }

    console.log("Conectando a MongoDB...");
    const client = await clientPromise
    const db = client.db()
    console.log("Conexión a MongoDB establecida");

    // Crear documento completo con datos básicos y encuesta
    const newChild = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate || "",
      parentId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Incluir los datos de la encuesta si están presentes
      ...(data.surveyData && { surveyData: data.surveyData }),
    }

    console.log("Insertando nuevo documento en la colección 'children'");
    const result = await db.collection("children").insertOne(newChild)
    console.log("Documento insertado con éxito, ID:", result.insertedId);

    // Ahora actualizamos el usuario (padre) con el ID del niño
    console.log("Actualizando usuario con el ID del niño...");
    const userId = session.user.id;
    
    // Actualizamos el usuario usando $addToSet para evitar duplicados
    // Usamos casting a any para evitar errores de TypeScript con los operadores de MongoDB
    const updateUserResult = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { updatedAt: new Date() },
        $addToSet: { children: result.insertedId } as any
      }
    );
    
    console.log("Usuario actualizado:", updateUserResult.modifiedCount > 0);

    return NextResponse.json({
      message: "Niño registrado correctamente y vinculado al usuario",
      id: result.insertedId,
      userUpdated: updateUserResult.modifiedCount > 0
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error al registrar niño:", error);
    console.error("Detalles del error:", error.message);
    console.error("Stack trace:", error.stack);
    return NextResponse.json({ 
      error: "Error interno del servidor",
      message: error.message 
    }, { status: 500 })
  }
}

// PUT /api/children/:id - actualizar un niño existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await request.json()
    if (!data.id) {
      return NextResponse.json({ error: "Se requiere el ID del niño" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(data.id),
      parentId: session.user.id,
    })

    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para editarlo" }, { status: 404 })
    }

    // Actualizar el niño (datos básicos, encuesta o ambos)
    const { id, ...updateData } = data

    // Añadir fecha de actualización
    updateData.updatedAt = new Date()
    
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

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

// DELETE /api/children/:id - eliminar un niño
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Se requiere el ID del niño" }, { status: 400 })
    }

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
