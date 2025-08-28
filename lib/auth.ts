// Configuración de NextAuth para la autenticación
// Incluye proveedores y callbacks para la gestión de sesiones

import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import clientPromise from "@/lib/mongodb"
import { compare, hash } from "bcryptjs"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import type { Adapter } from "next-auth/adapters"
import { tempStorage } from "./temp-storage"

// Extender el tipo User para incluir id y role
declare module "next-auth" {
  interface User {
    id: string
    role: string
  }
  
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Credenciales vacías")
          return null
        }

        const emailLower = credentials.email.toLowerCase()
        console.log("\n🔐 Intentando login para:", emailLower)

        // Primero verificar si hay una contraseña temporal para este email
        const tempPassword = tempStorage.getPassword(emailLower)
        console.log("🔑 Contraseña temporal encontrada:", tempPassword ? "Sí" : "No")
        
        if (tempPassword) {
          console.log("🔍 Comparando contraseñas:")
          console.log("   - Proporcionada:", credentials.password.substring(0, 3) + "***")
          console.log("   - Temporal:", tempPassword.substring(0, 3) + "***")
          
          // Si hay contraseña temporal, verificar contra ella
          if (credentials.password === tempPassword) {
            console.log("✅ Login exitoso con contraseña temporal para:", emailLower)
            
            try {
              // Intentar obtener datos del usuario de la BD
              const { db } = await connectToDatabase()
              const user = await db.collection("users").findOne({
                email: credentials.email,
              })
              
              if (user) {
                // Si el usuario existe, actualizar su contraseña en la BD
                const hashedPassword = await hash(credentials.password, 10)
                await db.collection("users").updateOne(
                  { _id: user._id },
                  { $set: { password: hashedPassword } }
                )
                
                return {
                  id: user._id.toString(),
                  email: user.email,
                  name: user.name,
                  role: user.role,
                }
              }
            } catch (error) {
              console.log("No se pudo conectar a la BD, usando datos temporales")
            }
            
            // Si no hay BD o usuario, crear uno temporal
            return {
              id: "temp-" + Date.now(),
              email: credentials.email,
              name: credentials.email.split("@")[0],
              role: "parent",
            }
          }
        }

        // Si no hay contraseña temporal, verificar en la base de datos normalmente
        try {
          const { db } = await connectToDatabase()
          const user = await db.collection("users").findOne({
            email: credentials.email,
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("Error al verificar credenciales:", error)
          
          // En modo desarrollo, permitir login temporal si coincide con contraseña temporal
          if (process.env.NODE_ENV === "development" && tempPassword === credentials.password) {
            return {
              id: "temp-" + Date.now(),
              email: credentials.email,
              name: credentials.email.split("@")[0],
              role: "parent",
            }
          }
          
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
