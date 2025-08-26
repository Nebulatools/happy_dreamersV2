// Script temporal para hacer admin a un usuario
// Uso: node scripts/make-admin.js email@ejemplo.com

const mongoose = require("mongoose")
require("dotenv").config()

const userEmail = process.argv[2]
const role = process.argv[3] || "admin" // admin o professional

if (!userEmail) {
  console.error("Por favor proporciona un email")
  console.log("Uso: node scripts/make-admin.js email@ejemplo.com [role]")
  console.log("Roles disponibles: admin, professional, user")
  process.exit(1)
}

async function makeAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/happy-dreamers")
    console.log("✅ Conectado a MongoDB")

    // Buscar y actualizar usuario
    const User = mongoose.model("User", new mongoose.Schema({
      email: String,
      role: String,
      name: String
    }))

    const user = await User.findOne({ email: userEmail })
    
    if (!user) {
      console.error(`❌ Usuario no encontrado con email: ${userEmail}`)
      process.exit(1)
    }

    const oldRole = user.role || "user"
    user.role = role
    await user.save()

    console.log(`✅ Usuario actualizado:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nombre: ${user.name}`)
    console.log(`   Rol anterior: ${oldRole}`)
    console.log(`   Rol nuevo: ${role}`)
    
    if (role === "admin") {
      console.log("\n🔓 Ahora tienes acceso a:")
      console.log("   - /dashboard/consultas (Consultas y análisis)")
      console.log("   - /dashboard/reports/professional (Editor de reportes)")
      console.log("   - Todas las funciones administrativas")
    } else if (role === "professional") {
      console.log("\n🔓 Ahora tienes acceso a:")
      console.log("   - /dashboard/reports/professional (Editor de reportes)")
      console.log("   - Edición y firma de reportes")
      console.log("   - Compartir reportes con otros profesionales")
    }

    process.exit(0)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

makeAdmin()