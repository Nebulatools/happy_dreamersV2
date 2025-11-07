// Helpers de Autenticación y Autorización
// Funciones auxiliares para verificar permisos en el sistema multi-usuario

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkUserAccess, getAccessibleChildren } from "@/lib/db/user-child-access"
import { Child, UserChildAccess } from "@/types/models"
import { createLogger } from "@/lib/logger"

const logger = createLogger("AuthHelpers")

// Tipo para el resultado de verificación de permisos
export interface PermissionCheck {
  authorized: boolean
  isOwner: boolean
  permissions?: UserChildAccess["permissions"]
  child?: Child
  error?: string
}

const OWNER_PERMISSIONS: UserChildAccess["permissions"] = {
  canViewEvents: true,
  canCreateEvents: true,
  canEditEvents: true,
  canViewReports: true,
  canEditProfile: true,
  canViewPlan: true
}

// Verificar si el usuario actual tiene acceso a un niño específico
export async function verifyChildAccess(
  childId: string,
  requiredPermission?: keyof UserChildAccess["permissions"]
): Promise<PermissionCheck> {
  try {
    // Obtener sesión actual
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        authorized: false,
        isOwner: false,
        error: "No autenticado"
      }
    }

    // Verificar acceso básico
    const accessResult = await checkUserAccess(session.user.id, childId)
    
    if (!accessResult.hasAccess) {
      return {
        authorized: false,
        isOwner: false,
        error: "No tienes acceso a este perfil"
      }
    }

    // Si es el dueño, tiene todos los permisos
    if (accessResult.isOwner) {
      return {
        authorized: true,
        isOwner: true,
        permissions: OWNER_PERMISSIONS,
        child: accessResult.child || undefined
      }
    }

    // Verificar permiso específico si se requiere
    if (requiredPermission && accessResult.access) {
      const hasPermission = accessResult.access.permissions[requiredPermission]
      
      if (!hasPermission) {
        return {
          authorized: false,
          isOwner: false,
          error: `No tienes permiso para: ${requiredPermission}`
        }
      }
    }

    return {
      authorized: true,
      isOwner: false,
      permissions: accessResult.access?.permissions,
      child: accessResult.child || undefined
    }

  } catch (error) {
    logger.error("Error verificando acceso:", error)
    return {
      authorized: false,
      isOwner: false,
      error: "Error interno verificando permisos"
    }
  }
}

// Obtener todos los niños a los que el usuario actual tiene acceso
export async function getUserAccessibleChildren(): Promise<{
  success: boolean
  children?: Child[]
  error?: string
}> {
  try {
    // Obtener sesión actual
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: "No autenticado"
      }
    }

    // Obtener niños accesibles
    const children = await getAccessibleChildren(session.user.id)

    return {
      success: true,
      children
    }

  } catch (error) {
    logger.error("Error obteniendo niños accesibles:", error)
    return {
      success: false,
      error: "Error interno obteniendo perfiles"
    }
  }
}

// Verificar si el usuario puede realizar una acción específica
export async function canUserPerformAction(
  childId: string,
  action: "view" | "create_event" | "edit_event" | "edit_profile" | "manage_access"
): Promise<boolean> {
  try {
    const permissionMap: Record<typeof action, keyof UserChildAccess["permissions"] | null> = {
      view: "canViewEvents",
      create_event: "canCreateEvents",
      edit_event: "canEditEvents",
      edit_profile: "canEditProfile",
      manage_access: null // Solo el dueño puede gestionar accesos
    }

    // Si la acción es gestionar accesos, solo el dueño puede
    if (action === "manage_access") {
      const result = await verifyChildAccess(childId)
      return result.authorized && result.isOwner
    }

    // Para otras acciones, verificar el permiso específico
    const requiredPermission = permissionMap[action]
    if (!requiredPermission) {
      return false
    }

    const result = await verifyChildAccess(childId, requiredPermission)
    return result.authorized

  } catch (error) {
    logger.error("Error verificando acción:", error)
    return false
  }
}

// Middleware helper para endpoints API
export async function withChildAccess(
  childId: string,
  requiredPermission?: keyof UserChildAccess["permissions"],
  handler?: (result: PermissionCheck) => Promise<Response>
): Promise<Response> {
  const result = await verifyChildAccess(childId, requiredPermission)
  
  if (!result.authorized) {
    return new Response(
      JSON.stringify({ error: result.error || "No autorizado" }),
      { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  // Si se proporciona un handler, ejecutarlo
  if (handler) {
    return handler(result)
  }

  // Si no hay handler, devolver éxito
  return new Response(
    JSON.stringify({ authorized: true }),
    { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  )
}

// Helper para filtrar niños en componentes del cliente
export function filterChildrenByPermission(
  children: Child[],
  userAccesses: UserChildAccess[],
  requiredPermission: keyof UserChildAccess["permissions"]
): Child[] {
  return children.filter(child => {
    // Buscar el acceso correspondiente
    const access = userAccesses.find(
      a => a.childId.toString() === child._id.toString()
    )
    
    // Si no hay acceso, verificar si es el dueño
    if (!access) {
      // Este filtro se usa en el cliente, así que no podemos verificar el dueño aquí
      // El componente debe manejar esto por separado
      return true
    }
    
    // Verificar el permiso específico
    return access.permissions[requiredPermission]
  })
}

// Helper para obtener el rol del usuario para un niño específico
export async function getUserRoleForChild(
  userId: string,
  childId: string
): Promise<"owner" | "viewer" | "caregiver" | "editor" | null> {
  try {
    const { db } = await connectToDatabase()
    
    // Verificar si es el dueño
    const child = await db.collection<Child>("children").findOne({
      _id: new ObjectId(childId),
      parentId: new ObjectId(userId)
    })
    
    if (child) {
      return "owner"
    }
    
    // Buscar acceso compartido
    const access = await db.collection<UserChildAccess>("userChildAccess").findOne({
      userId: new ObjectId(userId),
      childId: new ObjectId(childId),
      invitationStatus: "accepted"
    })
    
    return access?.role || null
    
  } catch (error) {
    logger.error("Error obteniendo rol del usuario:", error)
    return null
  }
}
