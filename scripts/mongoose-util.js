// Utilidad Mongoose para scripts/pruebas (CommonJS)
require('dotenv').config()
const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI

async function connect() {
  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')
  if (mongoose.connection.readyState === 1) return mongoose
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    bufferCommands: false,
  })
  return mongoose
}

async function getDb() {
  if (mongoose.connection.readyState !== 1) {
    await connect()
  }
  return mongoose.connection.db
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

module.exports = { connect, getDb, disconnect }

