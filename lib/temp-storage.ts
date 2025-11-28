// Almacenamiento temporal en archivo para desarrollo
// Esto permite que los tokens persistan entre reinicios del servidor

import fs from "fs"
import path from "path"

// Usar un directorio temporal que persista
const TEMP_DIR = path.join(process.cwd(), ".temp")
const STORAGE_FILE = path.join(TEMP_DIR, "tokens.json")

// Crear directorio temporal si no existe (solo en el servidor)
function ensureDirectory() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true })
      console.log("📁 Directorio temporal creado:", TEMP_DIR)
    }
  } catch (error) {
    console.error("Error creando directorio temporal:", error)
  }
}

interface TokenData {
  email: string
  expiry: string // ISO string para serialización
}

interface StorageData {
  tokens: Record<string, TokenData>
  passwords: Record<string, string>
}

// Leer datos del archivo
function readStorage(): StorageData {
  ensureDirectory()
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf8")
      const parsed = JSON.parse(data)
      console.log("📖 Leyendo almacenamiento temporal:", {
        tokens: Object.keys(parsed.tokens || {}).length,
        passwords: Object.keys(parsed.passwords || {}).length,
      })
      return parsed
    }
  } catch (error) {
    console.error("Error reading temp storage:", error)
  }
  return { tokens: {}, passwords: {} }
}

// Escribir datos al archivo
function writeStorage(data: StorageData): void {
  ensureDirectory()
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2))
    console.log("💾 Guardado en almacenamiento temporal:", {
      tokens: Object.keys(data.tokens || {}).length,
      passwords: Object.keys(data.passwords || {}).length,
    })
  } catch (error) {
    console.error("Error writing temp storage:", error)
  }
}

// Limpiar tokens expirados
function cleanExpiredTokens(): void {
  const storage = readStorage()
  const now = new Date().toISOString()
  let cleaned = false
  
  for (const [hash, data] of Object.entries(storage.tokens)) {
    if (data.expiry < now) {
      delete storage.tokens[hash]
      cleaned = true
    }
  }
  
  if (cleaned) {
    writeStorage(storage)
  }
}

// API pública - DESACTIVADA PARA EVITAR DISCREPANCIAS ENTRE MÁQUINAS
// Todos los desarrolladores ahora usan únicamente MongoDB
export const tempStorage = {
  // Guardar token - DESACTIVADO
  setToken(hash: string, email: string, expiry: Date): void {
    console.log("⚠️ tempStorage.setToken desactivado - usando solo MongoDB")
    // NO HACE NADA - Forzamos a usar solo MongoDB
  },
  
  // Obtener token - DESACTIVADO
  getToken(hash: string): { email: string; expiry: Date } | null {
    console.log("⚠️ tempStorage.getToken desactivado - usando solo MongoDB")
    return null // Siempre retorna null para forzar uso de MongoDB
  },
  
  // Eliminar token - DESACTIVADO
  deleteToken(hash: string): void {
    console.log("⚠️ tempStorage.deleteToken desactivado - usando solo MongoDB")
    // NO HACE NADA
  },
  
  // Guardar contraseña temporal - DESACTIVADO
  setPassword(email: string, password: string): void {
    console.log("⚠️ tempStorage.setPassword desactivado - usando solo MongoDB")
    // NO HACE NADA - Forzamos a usar solo MongoDB
  },
  
  // Obtener contraseña temporal - DESACTIVADO
  getPassword(email: string): string | null {
    console.log("⚠️ tempStorage.getPassword desactivado - usando solo MongoDB")
    return null // Siempre retorna null para forzar uso de MongoDB
  },
}