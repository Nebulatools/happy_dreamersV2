import { Db, ObjectId } from "mongodb"
import { UserChildAccess, Child } from "@/types/models"
import { checkUserAccess } from "@/lib/db/user-child-access"
import { createLogger } from "@/lib/logger"

const logger = createLogger("child-access-helper")

const OWNER_PERMISSIONS: UserChildAccess["permissions"] = {
  canViewEvents: true,
  canCreateEvents: true,
  canEditEvents: true,
  canViewReports: true,
  canEditProfile: true,
  canViewPlan: true,
}

export class ChildAccessError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = "ChildAccessError"
    this.status = status
  }
}

export interface ChildAccessContext {
  child: Child
  permissions: UserChildAccess["permissions"]
  ownerId: string
  isOwner: boolean
  isAdminOverride?: boolean
}

type SessionUser = {
  id: string
  role?: string | null
}

type PermissionKey = keyof UserChildAccess["permissions"]

export async function resolveChildAccess(
  db: Db,
  sessionUser: SessionUser,
  childId: string,
  requiredPermission?: PermissionKey
): Promise<ChildAccessContext> {
  if (!childId) {
    throw new ChildAccessError("childId requerido", 400)
  }

  const isAdmin = sessionUser.role === "admin"

  if (isAdmin) {
    const child = await db.collection<Child>("children").findOne({
      _id: new ObjectId(childId),
    })

    if (!child) {
      throw new ChildAccessError("Niño no encontrado", 404)
    }

    const ownerId = child.parentId?.toString?.() || sessionUser.id
    return {
      child,
      permissions: OWNER_PERMISSIONS,
      ownerId,
      isOwner: false,
      isAdminOverride: true,
    }
  }

  const accessResult = await checkUserAccess(sessionUser.id, childId)

  if (!accessResult.hasAccess) {
    logger.warn("Usuario sin acceso al niño", { userId: sessionUser.id, childId })
    throw new ChildAccessError("No tienes acceso a este perfil", 403)
  }

  const child = accessResult.child || await db.collection<Child>("children").findOne({
    _id: new ObjectId(childId),
  })

  if (!child) {
    throw new ChildAccessError("Niño no encontrado", 404)
  }

  const permissions = accessResult.isOwner
    ? OWNER_PERMISSIONS
    : (accessResult.access?.permissions || OWNER_PERMISSIONS)

  if (requiredPermission && !permissions[requiredPermission]) {
    throw new ChildAccessError("No tienes permisos para realizar esta acción", 403)
  }

  const ownerId = child.parentId?.toString?.() || sessionUser.id

  return {
    child,
    permissions,
    ownerId,
    isOwner: !!accessResult.isOwner,
  }
}

export const OWNER_FULL_PERMISSIONS = OWNER_PERMISSIONS
