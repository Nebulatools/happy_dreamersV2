// Conexión única a MongoDB para v3. Reutiliza el cliente existente del proyecto
// para evitar múltiples pools.
import { connectToDatabase } from '@/lib/mongodb'

export async function getDb() {
  const { db } = await connectToDatabase()
  return db
}

