// Configuración de NextAuth para la autenticación
// Incluye proveedores y callbacks para la gestión de sesiones

import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import clientPromise from "@/lib/mongodb"
import { compare, hash } from "bcryptjs"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import type { Adapter } from "next-auth/adapters"
// import { tempStorage } from "./temp-storage" // DESACTIVADO - Ya no usamos almacenamiento temporal local

// Extender el tipo User para incluir id y role
declare module "next-auth" {
  interface User {
    id: string
    role: string
    phone?: string
    accountType?: "father" | "mother" | "caregiver" | ""
  }
  
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      phone?: string
      accountType?: "father" | "mother" | "caregiver" | ""
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    phone?: string
    accountType?: "father" | "mother" | "caregiver" | ""
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

        // SISTEMA DE TOKENS LOCALES DESACTIVADO
        // Ahora todos los usuarios se autentican únicamente contra MongoDB
        // Esto asegura que todos los desarrolladores trabajen con los mismos usuarios
        
        // Verificar en la base de datos directamente
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
            phone: user.phone || "",
            accountType: user.accountType || "",
          }
        } catch (error) {
          console.error("Error al verificar credenciales:", error)
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
        ;(token as any).phone = user.phone || ""
        ;(token as any).accountType = user.accountType || ""
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.phone = (token as any).phone || ""
        session.user.accountType = (token as any).accountType || ""
      }
      return session
    },
  },
}
