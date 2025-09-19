// Sistema de Invitaciones para Acceso Multi-Usuario
// Maneja invitaciones pendientes para usuarios que no tienen cuenta

import { ObjectId, Collection } from "mongodb"
import { getDb } from "@/lib/mongoose"
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

// ConfiguraciÃ³n
const INVITATION_EXPIRY_DAYS = 7 // Las invitaciones expiran en 7 dÃ­as
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Generar token Ãºnico para invitaciÃ³n
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Obtener colecciÃ³n de invitaciones
async function getInvitationsCollection(): Promise<Collection<PendingInvitation>> {
  const db = await getDb()
  return db.collection<PendingInvitation>(INVITATIONS_COLLECTION)
}

// Crear Ã­ndices necesarios
export async function createInvitationIndexes(): Promise<void> {
  try {
    const collection = await getInvitationsCollection()
    
    // Ãndice Ãºnico para token
    await collection.createIndex({ invitationToken: 1 }, { unique: true })
    
    // Ãndice para buscar por email
    await collection.createIndex({ email: 1 })
    
    // Ãndice para buscar por niÃ±o
    await collection.createIndex({ childId: 1 })
    
    // Ãndice para expiraciÃ³n automÃ¡tica (TTL)
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 } // MongoDB eliminarÃ¡ documentos automÃ¡ticamente
    )
    
    logger.info("Ãndices de invitaciones creados exitosamente")
  } catch (error) {
    logger.error("Error creando Ã­ndices de invitaciones:", error)
    throw error
  }
}

// Crear invitaciÃ³n para usuario no registrado
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
    const db = await getDb()
    
    // Verificar que el usuario que invita es el dueÃ±o del niÃ±o
    const childrenCollection = db.collection<Child>(CHILDREN_COLLECTION)
    
    // Si no se proporciona childId o es invÃ¡lido, dar mensaje claro
    if (!childId || childId === "undefined" || childId === "null") {
      return {
        success: false,
        error: "Primero debes registrar un niÃ±o antes de invitar cuidadores"
      }
    }
    
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId),
      parentId: new ObjectId(invitedBy)
    })
    
    if (!child) {
      // Verificar si el niÃ±o existe pero no es del usuario
      const childExists = await childrenCollection.findOne({
        _id: new ObjectId(childId)
      })
      
      if (childExists) {
        return {
          success: false,
          error: "No tienes permisos para compartir este perfil"
        }
      } else {
        return {
          success: false,
          error: "El perfil del niÃ±o no existe. Por favor, registra un niÃ±o primero"
        }
      }
    }
    
    // Obtener informaciÃ³n del usuario que invita
    const usersCollection = db.collection<User>(USERS_COLLECTION)
    const inviter = await usersCollection.findOne({ _id: new ObjectId(invitedBy) })
    
    if (!inviter) {
      return {
        success: false,
        error: "Usuario que invita no encontrado"
      }
    }
    
    // Verificar si ya existe una invitaciÃ³n pendiente
    const invitationsCollection = await getInvitationsCollection()
    const existingInvitation = await invitationsCollection.findOne({
      email: email.toLowerCase(),
      childId: new ObjectId(childId),
      status: "pending"
    })
    
    if (existingInvitation) {
      // Actualizar invitaciÃ³n existente
      const updatedInvitation = await invitationsCollection.findOneAndUpdate(
        { _id: existingInvitation._id },
        {
          $set: {
            role,
            permissions: ROLE_PERMISSIONS[role],
            relationshipType: relationshipType as any,
            relationshipDescription,
            expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          }
        },
        { returnDocument: "after" }
      )
      
      return {
        success: true,
        invitation: (updatedInvitation.value || existingInvitation) as PendingInvitation
      }
    }
    
    // Crear nueva invitaciÃ³n
    const invitationToken = generateInvitationToken()
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    
    const newInvitation: PendingInvitation = {
      _id: new ObjectId(),
      email: email.toLowerCase(),
      childId: new ObjectId(childId),
      invitedBy: new ObjectId(invitedBy),
      invitedByName: inviter.name,
      childName: `${child.firstName} ${child.lastName || ''}`.trim(),
      role,
      permissions: ROLE_PERMISSIONS[role],
      relationshipType: relationshipType as any,
      relationshipDescription,
      invitationToken,
      expiresAt,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await invitationsCollection.insertOne(newInvitation as any)
    
    logger.info(`InvitaciÃ³n creada para ${email} al niÃ±o ${childId}`)
    return {
      success: true,
      invitation: newInvitation
    }
    
  } catch (error) {
    logger.error("Error creando invitaciÃ³n:", error)
    return {
      success: false,
      error: "Error interno al crear invitaciÃ³n"
    }
  }
}

// Aceptar invitaciÃ³n
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; childId?: string; error?: string }> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    // Buscar invitaciÃ³n por token
    const invitation = await invitationsCollection.findOne({
      invitationToken: token,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
    
    if (!invitation) {
      return {
        success: false,
        error: "InvitaciÃ³n no vÃ¡lida o expirada"
      }
    }
    
    // Verificar que el email coincida si el usuario ya existe
    const db = await getDb()
    const usersCollection = db.collection<User>(USERS_COLLECTION)
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      return {
        success: false,
        error: "Usuario no encontrado"
      }
    }
    
    // Si el usuario existe y el email no coincide, rechazar
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        success: false,
        error: "Esta invitaciÃ³n es para otro email"
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
      updatedAt: new Date()
    }
    
    await accessCollection.insertOne(newAccess as any)
    
    // Actualizar estado de invitaciÃ³n
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: new ObjectId(userId),
          updatedAt: new Date()
        }
      }
    )
    
    // Actualizar array sharedWith en el niÃ±o
    const childrenCollection = db.collection<Child>(CHILDREN_COLLECTION)
    await childrenCollection.updateOne(
      { _id: invitation.childId },
      { 
        $addToSet: { sharedWith: userId },
        $set: { updatedAt: new Date() }
      }
    )
    
    logger.info(`InvitaciÃ³n aceptada por usuario ${userId} para niÃ±o ${invitation.childId}`)
    
    // Crear una notificaciÃ³n para el padre/dueÃ±o avisando aceptaciÃ³n
    const notifications = db.collection(NOTIFICATIONS_COLLECTION)
    const displayName = user.name || user.email
    await notifications.insertOne({
      userId: invitation.invitedBy, // destinatario: padre que invitÃ³
      childId: invitation.childId,
      type: "invitation_response",
      status: "delivered",
      title: "InvitaciÃ³n aceptada",
      message: `${displayName} aceptÃ³ la invitaciÃ³n para acceder a ${invitation.childName}`,
      scheduledFor: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as any)

    // Marcar como leÃ­da la notificaciÃ³n de invitaciÃ³n para el usuario que aceptÃ³
    await notifications.updateMany(
      {
        userId: new ObjectId(userId),
        childId: invitation.childId,
        type: "invitation",
        status: { $in: ["sent", "delivered"] }
      },
      {
        $set: {
          status: "read",
          updatedAt: new Date(),
          readAt: new Date()
        }
      }
    )
    
    return {
      success: true,
      childId: invitation.childId.toString()
    }
    
  } catch (error) {
    logger.error("Error aceptando invitaciÃ³n:", error)
    return {
      success: false,
      error: "Error interno al aceptar invitaciÃ³n"
    }
  }
}

// Obtener invitaciÃ³n por token
export async function getInvitationByToken(
  token: string
): Promise<PendingInvitation | null> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    const invitation = await invitationsCollection.findOne({
      invitationToken: token,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
    
    return invitation
    
  } catch (error) {
    logger.error("Error obteniendo invitaciÃ³n:", error)
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
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).toArray()
    return invitations
  } catch (error) {
    logger.error("Error listando invitaciones por email:", error)
    return []
  }
}

// Denegar invitaciÃ³n
export async function declineInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    const db = await getDb()
    
    // Buscar invitaciÃ³n vÃ¡lida
    const invitation = await invitationsCollection.findOne({
      invitationToken: token,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
    
    if (!invitation) {
      return { success: false, error: "InvitaciÃ³n no vÃ¡lida o expirada" }
    }
    
    // Validar que el usuario coincide por email
    const usersCollection = db.collection<User>(USERS_COLLECTION)
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return { success: false, error: "Usuario no encontrado" }
    }
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { success: false, error: "Esta invitaciÃ³n es para otro email" }
    }
    
    // Marcar como denegada
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      { $set: { status: "declined", declinedAt: new Date(), acceptedBy: new ObjectId(userId), updatedAt: new Date() } }
    )
    
    // Registrar notificaciÃ³n para el padre/dueÃ±o
    const notifications = db.collection(NOTIFICATIONS_COLLECTION)
    const displayName = user.name || user.email
    await notifications.insertOne({
      userId: invitation.invitedBy,
      childId: invitation.childId,
      type: "invitation_response",
      status: "delivered",
      title: "InvitaciÃ³n denegada",
      message: `${displayName} denegÃ³ la invitaciÃ³n para acceder a ${invitation.childName}`,
      scheduledFor: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as any)

    await notifications.updateMany(
      {
        userId: new ObjectId(userId),
        childId: invitation.childId,
        type: "invitation",
        status: { $in: ["sent", "delivered"] }
      },
      {
        $set: {
          status: "read",
          updatedAt: new Date(),
          readAt: new Date()
        }
      }
    )
    
    return { success: true }
  } catch (error) {
    logger.error("Error denegando invitaciÃ³n:", error)
    return { success: false, error: "Error interno al denegar invitaciÃ³n" }
  }
}

// Cancelar invitaciÃ³n
export async function cancelInvitation(
  invitationId: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    // Verificar que quien cancela es quien invitÃ³
    const invitation = await invitationsCollection.findOne({
      _id: new ObjectId(invitationId),
      invitedBy: new ObjectId(cancelledBy),
      status: "pending"
    })
    
    if (!invitation) {
      return {
        success: false,
        error: "InvitaciÃ³n no encontrada o no tienes permisos"
      }
    }
    
    // Actualizar estado a cancelado
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date()
        }
      }
    )
    
    logger.info(`InvitaciÃ³n ${invitationId} cancelada por ${cancelledBy}`)
    
    return { success: true }
    
  } catch (error) {
    logger.error("Error cancelando invitaciÃ³n:", error)
    return {
      success: false,
      error: "Error interno al cancelar invitaciÃ³n"
    }
  }
}

// Obtener invitaciones pendientes para un niÃ±o
export async function getPendingInvitations(
  childId: string,
  requestedBy: string
): Promise<{ success: boolean; invitations?: PendingInvitation[]; error?: string }> {
  try {
    // Verificar que quien solicita es el dueÃ±o o tiene acceso
    const db = await getDb()
    const childrenCollection = db.collection<Child>(CHILDREN_COLLECTION)
    const child = await childrenCollection.findOne({
      _id: new ObjectId(childId)
    })
    
    if (!child) {
      return {
        success: false,
        error: "NiÃ±o no encontrado"
      }
    }
    
    // Verificar si es el dueÃ±o
    const isOwner = child.parentId.toString() === requestedBy
    
    // Si no es el dueÃ±o, verificar si tiene acceso compartido
    if (!isOwner) {
      const accessCollection = db.collection<UserChildAccess>(ACCESS_COLLECTION)
      const access = await accessCollection.findOne({
        userId: new ObjectId(requestedBy),
        childId: new ObjectId(childId),
        status: "active"
      })
      
      if (!access) {
        return {
          success: false,
          error: "No tienes permisos para ver estas invitaciones"
        }
      }
    }
    
    const invitationsCollection = await getInvitationsCollection()
    const invitations = await invitationsCollection.find({
      childId: new ObjectId(childId),
      status: "pending",
      expiresAt: { $gt: new Date() }
    }).toArray()
    
    return {
      success: true,
      invitations
    }
    
  } catch (error) {
    logger.error("Error obteniendo invitaciones:", error)
    return {
      success: false,
      error: "Error interno al obtener invitaciones"
    }
  }
}

// Limpiar invitaciones expiradas (job periÃ³dico)
export async function cleanupExpiredInvitations(): Promise<number> {
  try {
    const invitationsCollection = await getInvitationsCollection()
    
    const result = await invitationsCollection.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() }
      },
      {
        $set: {
          status: "expired",
          updatedAt: new Date()
        }
      }
    )
    
    logger.info(`${result.modifiedCount} invitaciones marcadas como expiradas`)
    return result.modifiedCount
    
  } catch (error) {
    logger.error("Error limpiando invitaciones expiradas:", error)
    return 0
  }
}
