// Sistema de Invitaciones para Acceso Multi-Usuario
// Maneja invitaciones pendientes para usuarios que no tienen cuenta

import { ObjectId, Collection } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"
import { PendingInvitation, UserChildAccess, Child, User } from "@/types/models"
import { createLogger } from "@/lib/logger"
import crypto from "crypto"
import { ROLE_PERMISSIONS } from "./user-child-access"

const logger = createLogger("Invitations")

// Nombres de colecciones
const INVITATIONS_COLLECTION = "pendingInvitations"
const ACCESS_COLLECTION = "userChildAccess"
const CHILDREN_COLLECTION = "children"
const USERS_COLLECTION = "users"
const NOTIFICATIONS_COLLECTION = "notificationlogs"

// Configuración
const INVITATION_EXPIRY_DAYS = 7 // Las invitaciones expiran en 7 días
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Generar token único para invitación
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Obtener colección de invitaciones
async function getInvitationsCollection(): Promise<Collection<PendingInvitation>> {
  const { db } = await connectToDatabase()
  return db.collection<PendingInvitation>(INVITATIONS_COLLECTION)
}

// Crear índices necesarios
export async function createInvitationIndexes(): Promise<void> {
  try {
    const collection = await getInvitationsCollection()
    
    // Índice único para token
    await collection.createIndex({ invitationToken: 1 }, { unique: true })
    
    // Índice para buscar por email
    await collection.createIndex({ email: 1 })
    
    // Índice para buscar por niño
    await collection.createIndex({ childId: 1 })
    
    // Índice para expiración automática (TTL)
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 } // MongoDB eliminará documentos automáticamente
    )
    
    logger.info("Índices de invitaciones creados exitosamente")
  } catch (error) {
    logger.error("Error creando índices de invitaciones:", error)
    throw error
  }
}

// Crear invitación para usuario no registrado
export async function createInvitation(
  invitedBy: string,
  childId: string,
  email: string,
  role: "viewer" | "caregiver" | "editor" = "caregiver",
  relationshipType?: string,
  relationshipDescription?: string,
  temporaryAccessDays?: number
): Promise<{ success: boolean; invitation?: PendingInvitation; error?: string }> {
  try {
    const { db } = await connectToDatabase()
    
    // Verificar que el usuario que invita es el dueño del niño
    const childrenCollection = db.collection<Child>(CHILDREN_COLLECTION)
    
    // Si no se proporciona childId o es inválido, dar mensaje claro
    if (!childId || childId === "undefined" || childId === "null") {
      return {
        success: false,
        error: "Primero debes registrar un niño antes de invitar cuidadores",
      }
    }
    
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId),
      parentId: new ObjectId(invitedBy),
    })
    
    if (!child) {
      // Verificar si el niño existe pero no es del usuario
      const childExists = await childrenCollection.findOne({
        _id: new ObjectId(childId),
      })
      
      if (childExists) {
        return {
          success: false,
          error: "No tienes permisos para compartir este perfil",
        }
      } else {
        return {
          success: false,
          error: "El perfil del niño no existe. Por favor, registra un niño primero",
        }
      }
    }
    
    // Obtener información del usuario que invita
    const usersCollection = db.collection<User>(USERS_COLLECTION)
    const inviter = await usersCollection.findOne({ _id: new ObjectId(invitedBy) })
    
    if (!inviter) {
      return {
        success: false,
        error: "Usuario que invita no encontrado",
      }
    }
    
    // Verificar si ya existe una invitación pendiente
    const invitationsCollection = await getInvitationsCollection()
    const existingInvitation = await invitationsCollection.findOne({
      email: email.toLowerCase(),
      childId: new ObjectId(childId),
      status: "pending",
    })
    
    if (existingInvitation) {
      // Actualizar invitación existente
      const updatedInvitation = await invitationsCollection.findOneAndUpdate(
        { _id: existingInvitation._id },
        {
          $set: {
            role,
            permissions: ROLE_PERMISSIONS[role],
            relationshipType: relationshipType as any,
            relationshipDescription,
            expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      )
      
      return {
        success: true,
        invitation: (updatedInvitation.value || existingInvitation) as PendingInvitation,
      }
    }
    
    // Crear nueva invitación
    const invitationToken = generateInvitationToken()
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    
    const newInvitation: PendingInvitation = {
      _id: new ObjectId(),
      email: email.toLowerCase(),
      childId: new ObjectId(childId),
      invitedBy: new ObjectId(invitedBy),
      invitedByName: inviter.name,
      childName: `${child.firstName} ${child.lastName || ""}`.trim(),
      role,
      permissions: ROLE_PERMISSIONS[role],
      relationshipType: relationshipType as any,
      relationshipDescription,
      invitationToken,
      expiresAt,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await invitationsCollection.insertOne(newInvitation as any)
    
    logger.info(`Invitación creada para ${email} al niño ${childId}`)
    return {
      success: true,
      invitation: newInvitation,
    }
    
  } catch (error) {
    logger.error("Error creando invitación:", error)
    return {
      success: false,
      error: "Error interno al crear invitación",
    }
  }
}

// Aceptar invitación
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; childId?: string; error?: string }> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    // Buscar invitación por token
    const invitation = await invitationsCollection.findOne({
      invitationToken: token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
    
    if (!invitation) {
      return {
        success: false,
        error: "Invitación no válida o expirada",
      }
    }
    
    // Verificar que el email coincida si el usuario ya existe
    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>(USERS_COLLECTION)
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      return {
        success: false,
        error: "Usuario no encontrado",
      }
    }
    
    // Si el usuario existe y el email no coincide, rechazar
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        success: false,
        error: "Esta invitación es para otro email",
      }
    }
    
    // Crear acceso en UserChildAccess
    const accessCollection = db.collection<UserChildAccess>(ACCESS_COLLECTION)
    
    const newAccess: UserChildAccess = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      childId: invitation.childId,
      grantedBy: invitation.invitedBy,
      role: invitation.role,
      permissions: invitation.permissions,
      relationshipType: invitation.relationshipType,
      relationshipDescription: invitation.relationshipDescription,
      invitationToken: token,
      invitationStatus: "accepted",
      invitationSentAt: invitation.createdAt,
      acceptedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await accessCollection.insertOne(newAccess as any)
    
    // Actualizar estado de invitación
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: new ObjectId(userId),
          updatedAt: new Date(),
        },
      }
    )
    
    // Actualizar array sharedWith en el niño
    const childrenCollection = db.collection<Child>(CHILDREN_COLLECTION)
    await childrenCollection.updateOne(
      { _id: invitation.childId },
      { 
        $addToSet: { sharedWith: userId },
        $set: { updatedAt: new Date() },
      }
    )
    
    logger.info(`Invitación aceptada por usuario ${userId} para niño ${invitation.childId}`)
    
    // Crear una notificación para el padre/dueño avisando aceptación
    const notifications = db.collection(NOTIFICATIONS_COLLECTION)
    const displayName = user.name || user.email
    await notifications.insertOne({
      userId: invitation.invitedBy, // destinatario: padre que invitó
      childId: invitation.childId,
      type: "invitation_response",
      status: "delivered",
      title: "Invitación aceptada",
      message: `${displayName} aceptó la invitación para acceder a ${invitation.childName}`,
      scheduledFor: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Marcar como leída la notificación de invitación para el usuario que aceptó
    await notifications.updateMany(
      {
        userId: new ObjectId(userId),
        childId: invitation.childId,
        type: "invitation",
        status: { $in: ["sent", "delivered"] },
      },
      {
        $set: {
          status: "read",
          updatedAt: new Date(),
          readAt: new Date(),
        },
      }
    )
    
    return {
      success: true,
      childId: invitation.childId.toString(),
    }
    
  } catch (error) {
    logger.error("Error aceptando invitación:", error)
    return {
      success: false,
      error: "Error interno al aceptar invitación",
    }
  }
}

// Obtener invitación por token
export async function getInvitationByToken(
  token: string
): Promise<PendingInvitation | null> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    const invitation = await invitationsCollection.findOne({
      invitationToken: token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
    
    return invitation
    
  } catch (error) {
    logger.error("Error obteniendo invitación:", error)
    return null
  }
}

// Listar invitaciones pendientes por email
export async function getInvitationsForEmail(
  email: string
): Promise<PendingInvitation[]> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    const invitations = await invitationsCollection.find({
      email: email.toLowerCase(),
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).toArray()
    return invitations
  } catch (error) {
    logger.error("Error listando invitaciones por email:", error)
    return []
  }
}

// Denegar invitación
export async function declineInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    const { db } = await connectToDatabase()
    
    // Buscar invitación válida
    const invitation = await invitationsCollection.findOne({
      invitationToken: token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
    
    if (!invitation) {
      return { success: false, error: "Invitación no válida o expirada" }
    }
    
    // Validar que el usuario coincide por email
    const usersCollection = db.collection<User>(USERS_COLLECTION)
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return { success: false, error: "Usuario no encontrado" }
    }
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { success: false, error: "Esta invitación es para otro email" }
    }
    
    // Marcar como denegada
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      { $set: { status: "declined", declinedAt: new Date(), acceptedBy: new ObjectId(userId), updatedAt: new Date() } }
    )
    
    // Registrar notificación para el padre/dueño
    const notifications = db.collection(NOTIFICATIONS_COLLECTION)
    const displayName = user.name || user.email
    await notifications.insertOne({
      userId: invitation.invitedBy,
      childId: invitation.childId,
      type: "invitation_response",
      status: "delivered",
      title: "Invitación denegada",
      message: `${displayName} denegó la invitación para acceder a ${invitation.childName}`,
      scheduledFor: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    await notifications.updateMany(
      {
        userId: new ObjectId(userId),
        childId: invitation.childId,
        type: "invitation",
        status: { $in: ["sent", "delivered"] },
      },
      {
        $set: {
          status: "read",
          updatedAt: new Date(),
          readAt: new Date(),
        },
      }
    )
    
    return { success: true }
  } catch (error) {
    logger.error("Error denegando invitación:", error)
    return { success: false, error: "Error interno al denegar invitación" }
  }
}

// Cancelar invitación
export async function cancelInvitation(
  invitationId: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    // Verificar que quien cancela es quien invitó
    const invitation = await invitationsCollection.findOne({
      _id: new ObjectId(invitationId),
      invitedBy: new ObjectId(cancelledBy),
      status: "pending",
    })
    
    if (!invitation) {
      return {
        success: false,
        error: "Invitación no encontrada o no tienes permisos",
      }
    }
    
    // Actualizar estado a cancelado
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    )
    
    logger.info(`Invitación ${invitationId} cancelada por ${cancelledBy}`)
    
    return { success: true }
    
  } catch (error) {
    logger.error("Error cancelando invitación:", error)
    return {
      success: false,
      error: "Error interno al cancelar invitación",
    }
  }
}

// Obtener invitaciones pendientes para un niño
export async function getPendingInvitations(
  childId: string,
  requestedBy: string
): Promise<{ success: boolean; invitations?: PendingInvitation[]; error?: string }> {
  try {
    // Verificar que quien solicita es el dueño o tiene acceso
    const { db } = await connectToDatabase()
    const childrenCollection = db.collection<Child>(CHILDREN_COLLECTION)
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId),
    })
    
    if (!child) {
      return {
        success: false,
        error: "Niño no encontrado",
      }
    }
    
    // Verificar si es el dueño
    const isOwner = child.parentId.toString() === requestedBy
    
    // Si no es el dueño, verificar si tiene acceso compartido
    if (!isOwner) {
      const accessCollection = db.collection<UserChildAccess>(ACCESS_COLLECTION)
      const access = await accessCollection.findOne({
        userId: new ObjectId(requestedBy),
        childId: new ObjectId(childId),
        status: "active",
      })
      
      if (!access) {
        return {
          success: false,
          error: "No tienes permisos para ver estas invitaciones",
        }
      }
    }
    
    const invitationsCollection = await getInvitationsCollection()
    const invitations = await invitationsCollection.find({
      childId: new ObjectId(childId),
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).toArray()
    
    return {
      success: true,
      invitations,
    }
    
  } catch (error) {
    logger.error("Error obteniendo invitaciones:", error)
    return {
      success: false,
      error: "Error interno al obtener invitaciones",
    }
  }
}

// Limpiar invitaciones expiradas (job periódico)
export async function cleanupExpiredInvitations(): Promise<number> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    const result = await invitationsCollection.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: "expired",
          updatedAt: new Date(),
        },
      }
    )
    
    logger.info(`${result.modifiedCount} invitaciones marcadas como expiradas`)
    return result.modifiedCount
    
  } catch (error) {
    logger.error("Error limpiando invitaciones expiradas:", error)
    return 0
  }
}
