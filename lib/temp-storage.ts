// Almacenamiento temporal en archivo para desarrollo
// Esto permite que los tokens persistan entre reinicios del servidor

import fs from 'fs'
import path from 'path'

// Usar un directorio temporal que persista
const TEMP_DIR = path.join(process.cwd(), '.temp')
const STORAGE_FILE = path.join(TEMP_DIR, 'tokens.json')

// Crear directorio temporal si no existe (solo en el servidor)
function ensureDirectory() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true })
      console.log('📁 Directorio temporal creado:', TEMP_DIR)
    }
  } catch (error) {
    console.error('Error creando directorio temporal:', error)
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
      const data = fs.readFileSync(STORAGE_FILE, 'utf8')
      const parsed = JSON.parse(data)
      console.log('📖 Leyendo almacenamiento temporal:', {
        tokens: Object.keys(parsed.tokens || {}).length,
        passwords: Object.keys(parsed.passwords || {}).length
      })
      return parsed
    }
  } catch (error) {
    console.error('Error reading temp storage:', error)
  }
  return { tokens: {}, passwords: {} }
}

// Escribir datos al archivo
function writeStorage(data: StorageData): void {
  ensureDirectory()
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2))
    console.log('💾 Guardado en almacenamiento temporal:', {
      tokens: Object.keys(data.tokens || {}).length,
      passwords: Object.keys(data.passwords || {}).length
    })
  } catch (error) {
    console.error('Error writing temp storage:', error)
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

// API pública
export const tempStorage = {
  // Guardar token
  setToken(hash: string, email: string, expiry: Date): void {
    const storage = readStorage()
    storage.tokens[hash] = {
      email,
      expiry: expiry.toISOString()
    }
    writeStorage(storage)
  },
  
  // Obtener token
  getToken(hash: string): { email: string; expiry: Date } | null {
    cleanExpiredTokens()
    const storage = readStorage()
    const data = storage.tokens[hash]
    
    if (!data) return null
    
    const expiry = new Date(data.expiry)
    if (expiry < new Date()) {
      this.deleteToken(hash)
      return null
    }
    
    return {
      email: data.email,
      expiry
    }
  },
  
  // Eliminar token
  deleteToken(hash: string): void {
    const storage = readStorage()
    delete storage.tokens[hash]
    writeStorage(storage)
  },
  
  // Guardar contraseña temporal
  setPassword(email: string, password: string): void {
    const storage = readStorage()
    storage.passwords[email] = password
    writeStorage(storage)
  },
  
  // Obtener contraseña temporal
  getPassword(email: string): string | null {
    const storage = readStorage()
    return storage.passwords[email] || null
  }
}