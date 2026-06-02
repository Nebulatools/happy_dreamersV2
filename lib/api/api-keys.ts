// Helpers para gestionar API Keys de acceso programatico
// El secreto se genera una sola vez y se devuelve al crear; en BD solo guardamos su hash sha256.

import { Db, ObjectId } from "mongodb"
import crypto from "crypto"
import { ApiKey, ApiScope, API_SCOPES } from "@/types/models"

const KEY_PREFIX = "hd_live_"
const PREVIEW_LENGTH = 12 // caracteres visibles del secreto para mostrar en la UI

export interface PublicApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: ApiScope[]
  childIds: string[]
  status: "active" | "revoked"
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

/**
 * Genera un secreto aleatorio de API key: "hd_live_<43 chars base64url>"
 */
export function generateApiKeySecret(): string {
  const random = crypto.randomBytes(32).toString("base64url")
  return `${KEY_PREFIX}${random}`
}

/**
 * Hash sha256 del secreto (lo que se guarda y se consulta en BD).
 */
export function hashApiKeySecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex")
}

/**
 * Valida que un string sea un scope permitido.
 */
export function isValidScope(scope: string): scope is ApiScope {
  return (API_SCOPES as string[]).includes(scope)
}

/**
 * Serializa una ApiKey para respuestas (nunca expone el secreto ni el hash).
 */
export function toPublicApiKey(doc: ApiKey): PublicApiKey {
  return {
    id: doc._id.toString(),
    name: doc.name,
    keyPrefix: doc.keyPrefix,
    scopes: doc.scopes,
    childIds: (doc.childIds || []).map((c) => c.toString()),
    status: doc.status,
    lastUsedAt: doc.lastUsedAt ? new Date(doc.lastUsedAt).toISOString() : null,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
  }
}

/**
 * Crea una API key para un usuario. Devuelve el documento publico y el secreto EN CLARO
 * (solo aqui; el caller debe mostrarlo una unica vez al usuario).
 */
export async function createApiKey(
  db: Db,
  userId: string,
  params: { name: string; scopes: ApiScope[]; childIds?: string[]; expiresAt?: Date }
): Promise<{ apiKey: PublicApiKey; secret: string }> {
  const secret = generateApiKeySecret()
  const keyHash = hashApiKeySecret(secret)
  const now = new Date()

  const doc: ApiKey = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    name: params.name.trim().slice(0, 80),
    keyHash,
    keyPrefix: secret.slice(0, PREVIEW_LENGTH),
    scopes: params.scopes,
    childIds: (params.childIds || []).map((c) => new ObjectId(c)),
    status: "active",
    expiresAt: params.expiresAt,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection<ApiKey>("apiKeys").insertOne(doc)
  // Asegurar indice unico en keyHash (idempotente)
  await db.collection("apiKeys").createIndex({ keyHash: 1 }, { unique: true }).catch(() => {})

  return { apiKey: toPublicApiKey(doc), secret }
}

/**
 * Lista las API keys de un usuario (sin secreto).
 */
export async function listApiKeys(db: Db, userId: string): Promise<PublicApiKey[]> {
  const docs = await db
    .collection<ApiKey>("apiKeys")
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(toPublicApiKey)
}

/**
 * Revoca (no elimina) una API key del usuario. Devuelve true si se actualizo.
 */
export async function revokeApiKey(db: Db, userId: string, keyId: string): Promise<boolean> {
  if (!ObjectId.isValid(keyId)) return false
  const result = await db.collection<ApiKey>("apiKeys").updateOne(
    { _id: new ObjectId(keyId), userId: new ObjectId(userId) },
    { $set: { status: "revoked", updatedAt: new Date() } }
  )
  return result.modifiedCount > 0
}
