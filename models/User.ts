// Modelo Mongoose para Usuario
import mongoose from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends mongoose.Document {
  email: string
  name: string
  password: string
  role: "parent" | "admin" | "professional"
  phone?: string
  accountType?: "father" | "mother" | "caregiver" | ""
  image?: string
  timezone?: string
  emailVerified?: Date
  resetPasswordToken?: string
  resetPasswordExpiry?: Date
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // No devolver contraseña por defecto
  },
  role: {
    type: String,
    enum: ["parent", "admin", "professional"],
    default: "parent"
  },
  phone: {
    type: String,
    default: ""
  },
  accountType: {
    type: String,
    enum: ["father", "mother", "caregiver", ""],
    default: ""
  },
  image: {
    type: String
  },
  timezone: {
    type: String,
    default: "America/Monterrey"
  },
  emailVerified: {
    type: Date
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpiry: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
})

// Hash password antes de guardar
UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) {
    return next()
  }
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    return false
  }
}

// Verificar si el modelo ya existe antes de crearlo
export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
