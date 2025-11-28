// Sistema de Acceso Multi-Usuario para Niños
// Maneja permisos compartidos y control de acceso para cuidadores

import { ObjectId, Db, Collection } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"
import { UserChildAccess, Child } from "@/types/models"
import { createLogger } from "@/lib/logger"
import crypto from "crypto"
import { createInvitation } from "./invitations"
import { sendInvitationEmail } from "@/lib/email/invitation-email"

const logger = createLogger("UserChildAccess")

// Nombre de la colección en MongoDB
const COLLECTION_NAME = "userChildAccess"
const CHILDREN_COLLECTION = "children"

// Roles predefinidos con permisos
export const ROLE_PERMISSIONS = {
  viewer: {
    canViewEvents: true,
    canCreateEvents: false,
    canEditEvents: false,
    canViewReports: true,
    canEditProfile: false,
    canViewPlan: true,
  },
  caregiver: {
    canViewEvents: true,
    canCreateEvents: true,
    canEditEvents: true,
    canViewReports: true,
    canEditProfile: false,
    canViewPlan: true,
  },
  editor: {
    canViewEvents: true,
    canCreateEvents: true,
    canEditEvents: true,
    canViewReports: true,
    canEditProfile: true,
    canViewPlan: true,
  },
}

// Función para generar token de invitación único
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Obtener la colección de accesos
async function getAccessCollection(): Promise<Collection<UserChildAccess>> {
  const { db } = await connectToDatabase()
  return db.collection<UserChildAccess>(COLLECTION_NAME)
}

// Obtener la colección de niños
async function getChildrenCollection(): Promise<Collection<Child>> {
  const { db } = await connectToDatabase()
  return db.collection<Child>(CHILDREN_COLLECTION)
}

// Crear índices necesarios para optimizar consultas
export async function createIndexes(): Promise<void> {
  try {
    const collection = await getAccessCollection()
    
    // Índice compuesto para búsquedas eficientes
    await collection.createIndex({ userId: 1, childId: 1 }, { unique: true })
    
    // Índice para buscar por token de invitación
    await collection.createIndex({ invitationToken: 1 }, { sparse: true })
    
    // Índice para buscar accesos por niño
    await collection.createIndex({ childId: 1 })
    
    // Índice para buscar accesos por usuario
    await collection.createIndex({ userId: 1 })
    
    logger.info("Índices creados exitosamente para UserChildAccess")
  } catch (error) {
    logger.error("Error creando índices:", error)
    throw error
  }
}

// Verificar si un usuario tiene acceso a un niño
export async function checkUserAccess(
  userId: string,
  childId: string
): Promise<{
  hasAccess: boolean
  access?: UserChildAccess
  isOwner?: boolean
  child?: Child | null
}> {
  try {
    logger.info(`Checking access for user ${userId} to child ${childId}`)
    
    // Primero verificar si es el dueño principal
    const childrenCollection = await getChildrenCollection()
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId),
    })
    
    if (!child) {
      logger.warn(`Child ${childId} not found in database`)
      return { hasAccess: false, child: null }
    }
    
    // Si es el padre/dueño principal, tiene acceso completo
    // Comparar de forma segura, considerando que parentId puede ser string o ObjectId
    const parentIdStr = typeof child.parentId === "string" 
      ? child.parentId 
      : child.parentId.toString()
    
    logger.info(`Comparing parentId ${parentIdStr} with userId ${userId}`)
    
    if (parentIdStr === userId || parentIdStr === userId.toString()) {
      logger.info(`User ${userId} is owner of child ${childId}`)
      return { hasAccess: true, isOwner: true, child }
    }
    
    // Verificar si tiene acceso compartido
    const accessCollection = await getAccessCollection()
    const access = await accessCollection.findOne({
      userId: new ObjectId(userId),
      childId: new ObjectId(childId),
      invitationStatus: "accepted",
    })
    
    if (access && (!access.expiresAt || access.expiresAt > new Date())) {
      return { hasAccess: true, access, isOwner: false, child }
    }

    return { hasAccess: false, child }
  } catch (error) {
    logger.error("Error verificando acceso del usuario:", error)
    throw error
  }
}

// Otorgar acceso a un cuidador
export async function grantAccess(
  grantedBy: string, // ID del padre/dueño
  childId: string,
  caregiverEmail: string,
  role: "viewer" | "caregiver" | "editor" = "caregiver",
  relationshipType?: string,
  relationshipDescription?: string,
  expiresAt?: Date,
  isAdminOverride: boolean = false
): Promise<{ success: boolean; invitationToken?: string; error?: string }> {
  try {
    const childrenCollection = await getChildrenCollection()
    // Si no se proporciona childId o es inválido, dar mensaje claro
    if (!childId || childId === "undefined" || childId === "null") {
      return {
        success: false,
        error: "Primero debes registrar un niño antes de compartir acceso",
      }
    }
    // Obtener el niño
    const child = await childrenCollection.findOne({ _id: new ObjectId(childId) })
    if (!child) {
      return { success: false, error: "El perfil del niño no existe. Por favor, registra un niño primero" }
    }

    // Validar permisos: dueño o admin override
    const isOwner = child.parentId && child.parentId.toString() === grantedBy.toString()
    if (!isOwner && !isAdminOverride) {
      return { success: false, error: "No tienes permisos para compartir este perfil" }
    }
    
    // Buscar el usuario por email
    const { db } = await connectToDatabase()
    const usersCollection = db.collection("users")
    const caregiverUser = await usersCollection.findOne({ email: caregiverEmail.toLowerCase() })
    
    if (!caregiverUser) {
      // Si el usuario no existe, crear invitación pendiente
      logger.info(`Usuario ${caregiverEmail} no existe, creando invitación`)
      
      const invitationResult = await createInvitation(
        grantedBy,
        childId,
        caregiverEmail,
        role,
        relationshipType,
        relationshipDescription
      )
      
      if (!invitationResult.success) {
        return {
          success: false,
          error: invitationResult.error || "Error al crear invitación",
        }
      }
      
      // Enviar email de invitación
      if (invitationResult.invitation) {
        await sendInvitationEmail(invitationResult.invitation)
      }
      
      return {
        success: true,
        invitationToken: invitationResult.invitation?.invitationToken,
        error: `Invitación enviada a ${caregiverEmail}. El usuario debe crear una cuenta para aceptarla.`,
      }
    }
    
    const accessCollection = await getAccessCollection()
    
    // Verificar si ya existe acceso
    const existingAccess = await accessCollection.findOne({
      userId: caregiverUser._id,
      childId: new ObjectId(childId),
    })
    
    if (existingAccess) {
      // Actualizar acceso existente
      await accessCollection.updateOne(
        { _id: existingAccess._id },
        {
          $set: {
            role,
            permissions: ROLE_PERMISSIONS[role],
            relationshipType,
            relationshipDescription,
            expiresAt: expiresAt ?? null,
            invitationStatus: "accepted",
            updatedAt: new Date(),
          },
        }
      )
      
      // Actualizar array sharedWith en el niño
      await childrenCollection.updateOne(
        { _id: new ObjectId(childId) },
        { 
          $addToSet: { sharedWith: caregiverUser._id.toString() },
          $set: { updatedAt: new Date() },
        }
      )
      
      return { success: true }
    }
    
    // Crear nuevo acceso
    const invitationToken = generateInvitationToken()
    const newAccess: UserChildAccess = {
      _id: new ObjectId(),
      userId: caregiverUser._id,
      childId: new ObjectId(childId),
      grantedBy: new ObjectId(grantedBy),
      role,
      permissions: ROLE_PERMISSIONS[role],
      relationshipType: relationshipType as any,
      relationshipDescription,
      invitationToken,
      invitationStatus: "accepted", // Auto-aceptado si el usuario ya existe
      invitationSentAt: new Date(),
      acceptedAt: new Date(),
      expiresAt: expiresAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await accessCollection.insertOne(newAccess as any)
    
    // Actualizar array sharedWith en el niño
    await childrenCollection.updateOne(
      { _id: new ObjectId(childId) },
      { 
        $addToSet: { sharedWith: caregiverUser._id.toString() },
        $set: { updatedAt: new Date() },
      }
    )
    
    logger.info(`Acceso otorgado exitosamente para ${caregiverEmail} al niño ${childId}`)
    return { success: true, invitationToken }
    
  } catch (error) {
    logger.error("Error otorgando acceso:", error)
    return { 
      success: false, 
      error: "Error interno al otorgar acceso", 
    }
  }
}

// Revocar acceso a un cuidador
export async function revokeAccess(
  requestedBy: string, // ID del padre/dueño
  childId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que quien solicita es el dueño
    const childrenCollection = await getChildrenCollection()
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId),
      parentId: new ObjectId(requestedBy),
    })
    
    if (!child) {
      return { 
        success: false, 
        error: "No tienes permisos para revocar acceso a este perfil", 
      }
    }
    
    // Eliminar el acceso
    const accessCollection = await getAccessCollection()
    const result = await accessCollection.deleteOne({
      userId: new ObjectId(userId),
      childId: new ObjectId(childId),
    })
    
    if (result.deletedCount === 0) {
      return { 
        success: false, 
        error: "Acceso no encontrado", 
      }
    }
    
    // Actualizar array sharedWith en el niño
    await childrenCollection.updateOne(
      { _id: new ObjectId(childId) },
      { 
        $pull: { sharedWith: userId },
        $set: { updatedAt: new Date() },
      }
    )
    
    logger.info(`Acceso revocado para usuario ${userId} al niño ${childId}`)
    return { success: true }
    
  } catch (error) {
    logger.error("Error revocando acceso:", error)
    return { 
      success: false, 
      error: "Error interno al revocar acceso", 
    }
  }
}

// Obtener lista de cuidadores con acceso a un niño
export async function getCaregivers(
  requestedBy: string,
  childId: string
): Promise<{ success: boolean; caregivers?: any[]; error?: string }> {
  try {
    // Verificar que quien solicita tiene acceso
    const accessCheck = await checkUserAccess(requestedBy, childId)
    if (!accessCheck.hasAccess) {
      return { 
        success: false, 
        error: "No tienes acceso a este perfil", 
      }
    }
    
    const accessCollection = await getAccessCollection()
    const accesses = await accessCollection.find({
      childId: new ObjectId(childId),
      invitationStatus: "accepted",
    }).toArray()
    
    // Obtener información de usuarios
    const { db } = await connectToDatabase()
    const usersCollection = db.collection("users")
    
    const caregivers = await Promise.all(
      accesses.map(async (access) => {
        const user = await usersCollection.findOne(
          { _id: access.userId },
          { projection: { password: 0 } } // Excluir contraseña
        )
        
        return {
          ...access,
          user: user ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
          } : null,
        }
      })
    )
    
    return { success: true, caregivers }
    
  } catch (error) {
    logger.error("Error obteniendo cuidadores:", error)
    return { 
      success: false, 
      error: "Error interno al obtener cuidadores", 
    }
  }
}

// Obtener todos los niños a los que un usuario tiene acceso
export async function getAccessibleChildren(
  userId: string
): Promise<Child[]> {
  try {
    const childrenCollection = await getChildrenCollection()
    
    // Buscar niños donde el usuario es dueño
    const ownedChildren = await childrenCollection.find({
      parentId: new ObjectId(userId),
    }).toArray()
    
    // Buscar niños donde el usuario tiene acceso compartido
    const accessCollection = await getAccessCollection()
    const sharedAccesses = await accessCollection.find({
      userId: new ObjectId(userId),
      $or: [
        { invitationStatus: "accepted" },
        { invitationStatus: { $exists: false } },
      ],
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }).toArray()
    
    const sharedChildIds = sharedAccesses.map(a => a.childId)
    const sharedChildren = sharedChildIds.length > 0 
      ? await childrenCollection.find({
        _id: { $in: sharedChildIds },
      }).toArray()
      : []
    
    // Combinar y eliminar duplicados
    const allChildren = [...ownedChildren, ...sharedChildren]
    const uniqueChildren = allChildren.filter((child, index, self) =>
      index === self.findIndex((c) => c._id.toString() === child._id.toString())
    )
    
    return uniqueChildren
    
  } catch (error) {
    logger.error("Error obteniendo niños accesibles:", error)
    throw error
  }
}

// Actualizar permisos de un cuidador
export async function updateCaregiverPermissions(
  requestedBy: string,
  childId: string,
  userId: string,
  updates: {
    role?: "viewer" | "caregiver" | "editor"
    expiresAt?: Date | null
    relationshipDescription?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que quien solicita es el dueño
    const childrenCollection = await getChildrenCollection()
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId),
      parentId: new ObjectId(requestedBy),
    })
    
    if (!child) {
      return { 
        success: false, 
        error: "No tienes permisos para actualizar accesos", 
      }
    }
    
    const accessCollection = await getAccessCollection()
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    if (updates.role) {
      updateData.role = updates.role
      updateData.permissions = ROLE_PERMISSIONS[updates.role]
    }
    
    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt
    }
    
    if (updates.relationshipDescription) {
      updateData.relationshipDescription = updates.relationshipDescription
    }
    
    const result = await accessCollection.updateOne(
      {
        userId: new ObjectId(userId),
        childId: new ObjectId(childId),
      },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return { 
        success: false, 
        error: "Acceso no encontrado", 
      }
    }
    
    logger.info(`Permisos actualizados para usuario ${userId} al niño ${childId}`)
    return { success: true }
    
  } catch (error) {
    logger.error("Error actualizando permisos:", error)
    return { 
      success: false, 
      error: "Error interno al actualizar permisos", 
    }
  }
}
